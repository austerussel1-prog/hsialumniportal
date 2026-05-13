import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { apiEndpoints } from './config/api';
import { isGoogleAuthConfigured } from './config/auth';

const CONSENT_VERSION = 'v1.0';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  

  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [invalidOtp, setInvalidOtp] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [policyModalType, setPolicyModalType] = useState('terms');
  
  const navigate = useNavigate();

  const openPolicyModal = (type) => {
    setPolicyModalType(type === 'retention' ? 'retention' : 'terms');
    setShowTermsModal(true);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!agree) {
      setError('You must agree to the Terms of Service and Data Retention Policy');
      return;
    }

    if (!credentialResponse?.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(apiEndpoints.googleAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: credentialResponse.credential,
          source: 'register',
          consent: {
            termsAccepted: true,
            privacyAccepted: true,
            termsVersion: CONSENT_VERSION,
            privacyVersion: CONSENT_VERSION,
          },
        }),
      });

      const responseText = await response.text();
      let data = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {
          message: responseText || `Google sign-in failed with status ${response.status}`,
        };
      }

      if (response.ok) {

        if (data.requiresOTP) {
          setEmail(data.email);
          setMessage(data.message);
          setShowOTPModal(true);
        } else {

          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          if (data.role === 'super_admin') {
            navigate('/admin-dashboard');
          } else if (data.role === 'user' && data.user.status === 'approved') {
            navigate('/alumni-dashboard');
          } else {
            setError('Your account is not approved yet');
          }
        }
      } else {
        setError(data.message || 'Google sign-in failed. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e?.preventDefault?.();
    await requestRegistrationOtp();
  };

  const requestRegistrationOtp = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setShake(false);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const normalizedUsername = username.trim();

    if (!normalizedName || !normalizedUsername || !normalizedEmail || !password || !confirmPassword) {
      setError('All fields are required');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      return;
    }

    if (!agree) {
      setError('You must agree to the Terms of Service and Data Retention Policy');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      return;
    }

    try {
      console.log('Sending OTP request...');
      const response = await fetch(apiEndpoints.sendOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: normalizedEmail,
          name: normalizedName,
          username: normalizedUsername,
          password,
          consent: {
            termsAccepted: true,
            privacyAccepted: true,
            termsVersion: CONSENT_VERSION,
            privacyVersion: CONSENT_VERSION,
          },
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setEmail(normalizedEmail);
        setFullName(normalizedName);
        setUsername(normalizedUsername);
        setOtp(['', '', '', '', '', '']);
        setMessage(data.message || 'OTP sent to your email.');
        setShowOTPModal(true);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Error connecting to server: ' + err.message);
      console.error('Full error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiEndpoints.verifyOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowOTPModal(false);
        setShowPendingModal(true);
      } else {
        setError(data.message || 'Invalid OTP');
        setInvalidOtp(true);
        setTimeout(() => setInvalidOtp(false), 500);
      }
    } catch (err) {
      setError('Error verifying OTP');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
   
    if (value && !/^\d$/.test(value)) return;
    
  
    if (invalidOtp) setInvalidOtp(false);
    if (error) setError('');
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

   
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
   
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    
    const newOtp = pastedData.split('');
    while (newOtp.length < 6) newOtp.push('');
    setOtp(newOtp);
    
  
    const focusIndex = Math.min(pastedData.length, 5);
    document.getElementById(`otp-${focusIndex}`)?.focus();
  };

  return (
    <motion.div 
      className="min-h-screen min-h-[100dvh] flex flex-col md:flex-row overflow-x-hidden bg-white"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="order-1 w-full min-h-[100dvh] md:min-h-0 md:w-1/2 flex flex-col justify-center items-center bg-white px-8 pb-8 pt-16 sm:px-6 sm:pb-8 sm:pt-28 md:order-1 md:p-8 lg:p-10">
        <div className="w-full max-w-[22rem] md:max-w-lg">
          <div className="mb-6 flex justify-center md:mb-8 md:justify-start">
            <img src="/Logo.jpg" alt="HSI Logo" className="h-16 sm:h-16 md:h-20" />
          </div>

          <h2 className="text-[1.7rem] font-bold tracking-[-0.02em] text-gray-900 mb-2 md:text-3xl">Create account.</h2>
          <p className="text-gray-600 mb-4 text-[13px] md:text-sm">
            Already have account? <Link to="/login" className="text-yellow-600 font-medium cursor-pointer">Log In</Link>
          </p>

          {error && !showOTPModal && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {message && !showOTPModal && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {message}
            </div>
          )}

          <form onSubmit={handleCreateAccount} className={shake ? 'animate-shake' : ''} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
              <div className="relative">
                <input 
                  type="text" 
                  className={`w-full px-3 md:px-4 pt-5 pb-2 rounded-md border focus:outline-none focus:ring-2 bg-white peer transition-colors cursor-text text-[13px] md:text-base ${
                    error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                  }`}
                  value={fullName} 
                  onChange={e=>{
                    setFullName(e.target.value);
                    if (error) setError('');
                  }} 
                  placeholder=" "
                />
                <label className={`absolute left-4 top-4 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[13px] md:peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] md:peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] md:peer-[:not(:placeholder-shown)]:text-xs cursor-text pointer-events-none ${
                  error ? 'text-red-500 peer-focus:text-red-600' : 'text-gray-500 peer-focus:text-yellow-600'
                }`}>
                  Full Name
                </label>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  className={`w-full px-3 md:px-4 pt-5 pb-2 rounded-md border focus:outline-none focus:ring-2 bg-white peer transition-colors cursor-text text-[13px] md:text-base ${
                    error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                  }`}
                  value={username} 
                  onChange={e=>{
                    setUsername(e.target.value);
                    if (error) setError('');
                  }} 
                  placeholder=" "
                />
                <label className={`absolute left-4 top-4 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[13px] md:peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] md:peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] md:peer-[:not(:placeholder-shown)]:text-xs cursor-text pointer-events-none ${
                  error ? 'text-red-500 peer-focus:text-red-600' : 'text-gray-500 peer-focus:text-yellow-600'
                }`}>
                  Username
                </label>
              </div>
            </div>

            <div className="relative mb-2.5">
              <input 
                type="email" 
                className={`w-full px-3 md:px-4 pt-5 pb-2 rounded-md border focus:outline-none focus:ring-2 bg-white peer transition-colors cursor-text text-[13px] md:text-base ${
                  error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                }`}
                value={email} 
                onChange={e=>{
                  setEmail(e.target.value);
                  if (error) setError('');
                }} 
                placeholder=" "
              />
              <label className={`absolute left-4 top-4 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[13px] md:peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] md:peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] md:peer-[:not(:placeholder-shown)]:text-xs cursor-text pointer-events-none ${
                error ? 'text-red-500 peer-focus:text-red-600' : 'text-gray-500 peer-focus:text-yellow-600'
              }`}>
                Email address
              </label>
            </div>

            <div className="relative mb-2.5">
              <input 
                type={showPassword ? 'text' : 'password'} 
                className={`w-full px-3 md:px-4 pt-5 pb-2 rounded-md border focus:outline-none focus:ring-2 bg-white peer transition-colors cursor-text text-[13px] md:text-base ${
                  error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                }`}
                value={password} 
                onChange={e=>{
                  setPassword(e.target.value);
                  if (error) setError('');
                }} 
                placeholder=" "
              />
              <label className={`absolute left-4 top-4 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[13px] md:peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] md:peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] md:peer-[:not(:placeholder-shown)]:text-xs cursor-text pointer-events-none ${
                error ? 'text-red-500 peer-focus:text-red-600' : 'text-gray-500 peer-focus:text-yellow-600'
              }`}>
                Password
              </label>
              <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={()=>setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm7.5 0c-1.74-4.14-5.36-7-9.5-7S4.24 7.86 2.5 12c1.74 4.14 5.36 7 9.5 7 4.14 0 7.76-2.86 9.5-7z" /></svg>
                )}
              </button>
            </div>

            <div className="relative mb-2.5">
              <input 
                type={showConfirm ? 'text' : 'password'} 
                className={`w-full px-3 md:px-4 pt-5 pb-2 rounded-md border focus:outline-none focus:ring-2 bg-white peer transition-colors cursor-text text-[13px] md:text-base ${
                  error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                }`}
                value={confirmPassword} 
                onChange={e=>{
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }} 
                placeholder=" "
              />
              <label className={`absolute left-4 top-4 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[13px] md:peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] md:peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] md:peer-[:not(:placeholder-shown)]:text-xs cursor-text pointer-events-none ${
                error ? 'text-red-500 peer-focus:text-red-600' : 'text-gray-500 peer-focus:text-yellow-600'
              }`}>
                Confirm Password
              </label>
              <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={()=>setShowConfirm(!showConfirm)} aria-label="Toggle password visibility">
                {showConfirm ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm7.5 0c-1.74-4.14-5.36-7-9.5-7S4.24 7.86 2.5 12c1.74 4.14 5.36 7 9.5 7 4.14 0 7.76-2.86 9.5-7z" /></svg>
                )}
              </button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={`hsi-hover-fill w-full text-white font-semibold py-2.5 md:py-3 rounded-md transition mb-3 md:mb-5 text-[13px] md:text-base mt-3 ${
                error
                  ? 'bg-red-500 hover:bg-red-600 animate-shake'
                  : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400'
              }`}
            >
              {loading ? 'Sending OTP...' : 'Create Account'}
            </button>
            <label className="flex items-start gap-2 text-gray-700 mb-3 text-[13px] md:text-sm">
              <input type="checkbox" className="mt-0.5 w-4 h-4 border-gray-300" checked={agree} onChange={e=>setAgree(e.target.checked)} />
              <span>
                I've read and agree with your{' '}
                <button
                  type="button"
                  onClick={() => openPolicyModal('terms')}
                  className="text-yellow-600 font-medium cursor-pointer"
                >
                  Terms of Service
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => openPolicyModal('retention')}
                  className="text-yellow-600 font-medium cursor-pointer"
                >
                  Data Retention Policy
                </button>
              </span>
            </label>
          </form>
          <div className="flex items-center my-2 sm:my-4">
            <div className="flex-grow h-px bg-[#d7dde4]" />
            <span className="mx-2 md:mx-3 text-gray-400 bg-white px-2 text-[11px] md:text-sm">or</span>
            <div className="flex-grow h-px bg-[#d7dde4]" />
          </div>

          <div className="w-full flex items-center justify-center mb-2 sm:mb-4">
            {isGoogleAuthConfigured ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                shape="rectangular"
                theme="filled_black"
                size="large"
                width="100%"
              />
            ) : (
              <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                Google sign-in is temporarily unavailable because OAuth is not configured for this deployment.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="order-2 relative h-44 w-full overflow-hidden md:hidden">
        <img
          src="/hero.jpg"
          alt="Professional workspace"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-yellow-700/55" />
        <div className="relative z-10 flex h-full items-center justify-center px-6 text-center">
          <h2 className="max-w-[11rem] text-[1.05rem] font-medium leading-[1.15] text-white">
            A platform built to support your journey.
          </h2>
        </div>
      </div>

      <div
        className="hidden lg:flex w-1/2 bg-gray-100 items-center justify-center relative order-2"
        style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)' }}
      >
        <img
          src="/hero.jpg"
          alt="Professional workspace"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="relative z-10 p-6 sm:p-8 md:p-10 lg:p-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">A platform built to support your professional journey.</h2>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-700/55 via-yellow-500/25 to-transparent z-0" />
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-xl w-[min(18.5rem,calc(100vw-40px))] md:w-full md:max-w-2xl p-3 md:p-8 relative max-h-[calc(100dvh-24px)] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              aria-label="Close terms"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M6.225 4.811a.75.75 0 011.06 0L12 9.525l4.715-4.714a.75.75 0 111.06 1.06L13.06 10.586l4.715 4.714a.75.75 0 11-1.06 1.06L12 11.646l-4.714 4.714a.75.75 0 11-1.06-1.06l4.714-4.714-4.714-4.714a.75.75 0 010-1.06z" />
              </svg>
            </button>
            <div className="max-h-[calc(100dvh-170px)] md:max-h-[75vh] overflow-y-auto pr-2 text-[13px] md:text-sm text-gray-700 leading-relaxed mb-5 md:mb-6">
              {policyModalType === 'retention' ? (
                <>
                  <p className="font-semibold text-sm md:text-base mb-3">Data Retention Policy</p>
                  <p className="mb-3">
                    This system retains alumni data only as necessary to support engagement and communication. User accounts remain active as long as they are in use. Accounts that remain inactive for more than one (1) year may be deleted or archived.
                  </p>
                  <p className="mb-3">
                    User-generated content such as posts and messages is retained while the account is active and is permanently removed upon account deletion. System logs, including login activity, are stored for a maximum of ninety (90) days for security and monitoring purposes.
                  </p>
                  <p className="mb-3">
                    Backup data is retained for a limited period of three (3) to six (6) months and is automatically overwritten thereafter. All personal data is handled and disposed of in accordance with the Data Privacy Act of 2012.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-sm md:text-base mb-3">
                    Welcome to Highly Succeed Alumni-Portal ("we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of the website located at https://alumni-portal-xi-amber.vercel.app/ and all related services, features, and content provided by the Platform (collectively, the "Service"). By accessing or using the Service, you acknowledge that you have read, understood, and agree to be legally bound by these Terms. If you do not agree to any part of these Terms, you must discontinue use of the Service immediately.
                  </p>
                  <p className="mb-3">
                    By visiting, accessing, browsing, registering, or using the Platform, you confirm that you agree to comply with these Terms, our Privacy Policy, and all applicable laws and regulations. You represent that you are at least eighteen (18) years of age and capable of forming a binding agreement. If you create an account, you agree to provide accurate, current, and complete information and to keep your account information updated. You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account, whether authorized or unauthorized.
                  </p>
                  <p className="mb-3">
                    You agree to use the Service only for lawful purposes and in a manner consistent with these Terms. You must not upload, post, transmit, or distribute any content that is unlawful, harmful, offensive, defamatory, obscene, misleading, or otherwise inappropriate. You must not attempt to interfere with the proper operation, security, or integrity of the Platform, including attempting to gain unauthorized access to systems or data. Any misuse of the Service may result in suspension or termination of your access.
                  </p>
                  <p className="mb-3">
                    You retain ownership of any content that you submit, post, or upload to the Platform. However, by submitting content, you grant Highly Succeed Alumni-Portal a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, display, distribute, and store such content solely for the purpose of operating, improving, and promoting the Service. We reserve the right to remove or modify any content that violates these Terms or that we consider inappropriate, without prior notice.
                  </p>
                  <p className="mb-3">
                    The Service may contain links to third-party websites or services that are not owned or controlled by us. We do not assume responsibility for the content, policies, or practices of any third-party websites or services. Your interactions with third parties are solely between you and the third party, and you agree that we shall not be liable for any damages or losses arising from such interactions.
                  </p>
                  <p className="mb-3">
                    We reserve the right to modify, suspend, or discontinue any part of the Service at any time without prior notice. We are not liable for any interruption, delay, or unavailability of the Service. We may also update or revise these Terms from time to time, and continued use of the Service after such changes constitutes your acceptance of the revised Terms.
                  </p>
                  <p className="mb-3">
                    We may suspend or terminate your access to the Service at our sole discretion if you violate these Terms or engage in behavior that may harm the Platform, other users, or our operations. Upon termination, your right to access and use of the Service will immediately cease.
                  </p>
                  <p className="mb-3">
                    The Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. We do not guarantee that the Service will be uninterrupted, error-free, secure, or free from harmful components. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from or related to your use of the Service.
                  </p>
                  <p className="mb-3">
                    These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any legal disputes arising from these Terms or the use of the Service shall be subject to the exclusive jurisdiction of the courts of the Philippines.
                  </p>
                  <p>
                    If you have any questions, concerns, or requests regarding these Terms, you may contact us at highlysucceedincportal@gmail.com.
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="hsi-hover-fill w-full md:w-auto px-4 py-2.5 md:py-3 rounded-xl bg-yellow-500 text-white text-sm md:text-base font-semibold hover:bg-yellow-600"
              >
                Continue Creating Account
              </button>
            </div>
          </motion.div>
        </div>
      )}

     
      {showOTPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-xl w-[min(18.5rem,calc(100vw-40px))] md:w-full md:max-w-2xl p-3 md:p-8 relative text-center"
          >
        
            <div className="flex justify-center mb-5 md:mb-8">
              <img src="/Logo.jpg" alt="HSI Logo" className="h-12 sm:h-16" />
            </div>

            <h2 className="text-[1.55rem] md:text-3xl font-bold text-gray-800 mb-3 md:mb-4">Email Verification</h2>
            
            <p className="text-gray-600 mb-2 text-[13px] md:text-base">
              We sent a verification code to <span className="font-semibold text-gray-800">{email}</span> to verify your email address
            </p>
            <p className="text-gray-600 mb-4 md:mb-6 text-[13px] md:text-base">
              and activate your account. Not your email?{' '}
              <button 
                onClick={() => {
                  setShowOTPModal(false);
                  setOtp(['', '', '', '', '', '']);
                  setError('');
                }}
                className="text-yellow-600 font-medium cursor-pointer hsi-hover-fill hsi-hover-fill-text"
              >
                Change it
              </button>
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOTP}>
        
              <div className={`flex justify-center gap-1.5 md:gap-3 mb-5 ${invalidOtp ? 'animate-shake' : ''}`}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`w-9 h-9 md:w-14 md:h-14 text-center text-base md:text-2xl font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 bg-white transition-colors ${
                      invalidOtp 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'
                    }`}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length !== 6}
                className="hsi-hover-fill w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white text-sm md:text-base font-semibold py-2.5 md:py-3 rounded-xl transition mb-4"
              >
                {loading ? 'Verifying...' : 'Verify My Account'}
              </button>
            </form>

            <Link 
              to="/login"
              className="text-yellow-600 font-medium cursor-pointer mb-4 hsi-hover-fill hsi-hover-fill-text"
            >
              Back to Log In
            </Link>

            <p className="text-sm text-gray-600">
              Didn't receive any code?{' '}
              <button 
                type="button"
                onClick={requestRegistrationOtp}
                disabled={loading}
                className="text-yellow-600 font-medium cursor-pointer hsi-hover-fill hsi-hover-fill-text"
              >
                Resend
              </button>
            </p>
          </motion.div>
        </div>
      )}

 
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-xl w-[min(18.5rem,calc(100vw-40px))] md:w-full md:max-w-2xl p-3 md:p-8 relative text-center"
          >
            {/* HSI Logo */}
            <div className="flex justify-center mb-6">
              <img src="/Logo.jpg" alt="HSI Logo" className="h-16" />
            </div>

      
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-12 h-12 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h2 className="text-[1.55rem] md:text-3xl font-bold text-gray-800 mb-4">Account Created Successfully!</h2>
            
            <p className="text-gray-600 mb-6 text-[13px] md:text-base">
              Your account has been created and is currently <span className="font-semibold text-yellow-600">pending approval</span> from our admin team. 
              You will receive an email notification once your account has been reviewed and approved.
            </p>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 text-left">
              <p className="text-[13px] md:text-sm text-gray-700">
                <strong className="text-yellow-700">What's next?</strong><br />
                - Our admin will review your registration<br />
                - You'll receive an email once approved<br />
                - After approval, you can log in and access the portal
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="hsi-hover-fill w-full bg-yellow-500 hover:bg-yellow-600 text-white text-sm md:text-base font-semibold py-2.5 md:py-3 rounded-xl transition mb-4"
            >
              Go to Login
            </button>

            <p className="text-[13px] md:text-sm text-gray-500">
              Questions? Contact our support team for assistance.
            </p>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}



