import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { apiEndpoints } from './config/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLogin2FAModal, setShowLogin2FAModal] = useState(false);
  const [showLockoutModal, setShowLockoutModal] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [policyModalType, setPolicyModalType] = useState('terms');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [login2FAError, setLogin2FAError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotShake, setForgotShake] = useState(false);
  const [resetShake, setResetShake] = useState(false);
  const [loginOtp, setLoginOtp] = useState(['', '', '', '', '', '']);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  
  const navigate = useNavigate();

  const setSuccessLoginToast = () => {
    sessionStorage.setItem('hsi_toast', JSON.stringify({
      type: 'success',
      text: 'Successfully logged in.',
    }));
  };

  const showToast = (type, text) => {
    window.dispatchEvent(new CustomEvent('hsi-toast', {
      detail: { type, text },
    }));
  };

  const setLoginError = (text) => {
    const message = String(text || 'Login failed.');
    setError(message);

    const lowerMessage = message.toLowerCase();
    const isLockoutMessage =
      lowerMessage.includes('temporarily locked') ||
      lowerMessage.includes('multiple failed login attempts');

    if (isLockoutMessage) {
      setLockoutMessage(message);
      setShowLockoutModal(true);
      return;
    }

    showToast('error', message);
  };

  const setForgotFlowError = (text) => {
    const message = String(text || 'Something went wrong.');
    setForgotError(message);
    showToast('error', message);
  };

  const openPolicyModal = (type) => {
    setPolicyModalType(type === 'retention' ? 'retention' : 'terms');
    setShowTermsModal(true);
  };

  const mergeUserWithProfile = (user) => {
    const profileKey = user?.email ? `profileData_${user.email}` : null;
    if (!profileKey) {
      return user;
    }

    const savedProfile = localStorage.getItem(profileKey);
    return savedProfile ? { ...user, ...JSON.parse(savedProfile) } : user;
  };

  const completeLoginSession = (data) => {
    localStorage.setItem('token', data.token);
    const mergedUser = mergeUserWithProfile(data.user);
    localStorage.setItem('user', JSON.stringify(mergedUser));

    if (data.role === 'super_admin' || data.role === 'admin' || data.role === 'hr' || data.role === 'alumni_officer') {
      setSuccessLoginToast();
      navigate('/admin-dashboard');
    } else if (data.role === 'user' && data.user.status === 'approved') {
      setSuccessLoginToast();
      navigate('/alumni-management');
    } else {
      setError('Your account is not approved yet');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setLoginError('Google sign-in failed. Please try again.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(apiEndpoints.googleAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credentialResponse.credential, source: 'login' }),
      });

      const data = await response.json();

      if (response.ok) {
    
        if (data.requiresOTP) {
          setError('New user detected. Please complete registration on the Create Account page.');
          setTimeout(() => navigate('/register'), 2000);
        } else {
          completeLoginSession(data);
        }
      } else {
        setLoginError(data.message || 'Google sign-in failed. Please try again.');
      }
    } catch (err) {
      setLoginError('Google sign-in failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setShake(false);

   
    if (!email || !password) {
      setLoginError('Please fill out all fields');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (!termsAccepted) {
      setError('');
      showToast('warning', 'Please agree to the Terms of Service and Data Retention Policy');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiEndpoints.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresTwoFactor) {
          setTwoFactorToken(data.twoFactorToken || '');
          setLoginOtp(['', '', '', '', '', '']);
          setLogin2FAError('');
          setShowLogin2FAModal(true);
          showToast('info', data.message || 'Verification code sent to your email.');
          return;
        }

        completeLoginSession(data);
      } else {
        setLoginError(data.message || 'Invalid credentials or insufficient permissions');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (err) {
      setLoginError('Error connecting to server. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotShake(false);
    
    if (!forgotEmail) {
      setForgotFlowError('Email is required');
      setForgotShake(true);
      setTimeout(() => setForgotShake(false), 500);
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch(apiEndpoints.forgotPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotMessage(data.message);
        setShowForgotModal(false);
        setShowOTPModal(true);
      } else {
        setForgotFlowError(data.message);
        setForgotShake(true);
        setTimeout(() => setForgotShake(false), 500);
      }
    } catch (err) {
      setForgotFlowError('Error sending OTP. Please try again.');
      setForgotShake(true);
      setTimeout(() => setForgotShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOTP = async (e) => {
    e.preventDefault();
    setForgotError('');
    setLoading(true);

    const otpString = resetOtp.join('');
    if (otpString.length !== 6) {
      setForgotFlowError('Please enter all 6 digits');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiEndpoints.verifyResetOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: otpString }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowOTPModal(false);
        setShowResetModal(true);
      } else {
        setForgotFlowError(data.message);
      }
    } catch (err) {
      setForgotFlowError('Error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setResetShake(false);

    if (!newPassword || !confirmPassword) {
      setForgotFlowError('Please fill in all fields');
      setResetShake(true);
      setTimeout(() => setResetShake(false), 500);
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotFlowError('Passwords do not match');
      setResetShake(true);
      setTimeout(() => setResetShake(false), 500);
      return;
    }

    if (newPassword.length < 6) {
      setForgotFlowError('Password must be at least 6 characters');
      setResetShake(true);
      setTimeout(() => setResetShake(false), 500);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(apiEndpoints.resetPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: forgotEmail, 
          otp: resetOtp.join(''), 
          newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowResetModal(false);
        setError('');
        setForgotEmail('');
        setResetOtp(['', '', '', '', '', '']);
        setNewPassword('');
        setConfirmPassword('');
        alert('Password reset successfully! Please login with your new password.');
      } else {
        setForgotFlowError(data.message);
      }
    } catch (err) {
      setForgotFlowError('Error resetting password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...resetOtp];
    newOtp[index] = value.slice(-1);
    setResetOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`reset-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !resetOtp[index] && index > 0) {
      document.getElementById(`reset-otp-${index - 1}`)?.focus();
    }
  };

  const handleLoginOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const next = [...loginOtp];
    next[index] = value.slice(-1);
    setLoginOtp(next);

    if (value && index < 5) {
      document.getElementById(`login-otp-${index + 1}`)?.focus();
    }
  };

  const handleLoginOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !loginOtp[index] && index > 0) {
      document.getElementById(`login-otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyLogin2FA = async (e) => {
    e.preventDefault();
    setLogin2FAError('');

    const otp = loginOtp.join('');
    if (otp.length !== 6) {
      setLogin2FAError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiEndpoints.loginVerify2fa, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twoFactorToken, otp }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLogin2FAError(data?.message || 'Invalid verification code.');
        return;
      }

      setShowLogin2FAModal(false);
      setTwoFactorToken('');
      setLoginOtp(['', '', '', '', '', '']);
      completeLoginSession(data);
    } catch (err) {
      setLogin2FAError('Error verifying login code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="min-h-screen min-h-[100dvh] flex flex-col md:flex-row relative overflow-x-hidden bg-white"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="hidden md:block absolute inset-0 w-full h-full">
        <svg className="absolute w-full h-full" preserveAspectRatio="none">
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#d7dde4" strokeWidth="2" vectorEffect="non-scaling-stroke" transform="skewX(-25)" />
        </svg>
      </div>
      <div className="w-full min-h-[100dvh] md:min-h-0 md:w-1/2 flex flex-col justify-center items-center bg-white px-8 pb-8 pt-16 sm:px-6 sm:pb-8 sm:pt-28 md:p-8 relative z-10">
        <div className="w-full max-w-[22rem] md:max-w-lg">
     
          <div className="absolute left-1/2 top-12 flex -translate-x-1/2 items-center md:fixed md:left-0 md:top-0 md:m-4 md:translate-x-0">
            <img src="/Logo.jpg" alt="HSI Logo" className="h-16 sm:h-16 md:h-24 md:mr-3" />
          </div>
          <h2 className="mt-20 mb-2 text-[1.7rem] font-bold tracking-[-0.02em] text-gray-900 md:mt-0 md:text-4xl">Sign In</h2>
          <form onSubmit={handleLogin} className={shake ? 'animate-shake' : ''} noValidate>
            <div className="relative mb-3 mt-6 md:mt-6">
              <input
                type="email"
                className={`w-full px-3 md:px-4 pt-5 pb-2 rounded-md border focus:outline-none focus:ring-2 bg-white peer transition-colors cursor-text text-[13px] md:text-base ${
                  error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                }`}
                value={email}
                onChange={e => {
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
            <div className="relative mb-3">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full px-3 md:px-4 pt-5 pb-2 rounded-md border focus:outline-none focus:ring-2 bg-white peer transition-colors cursor-text text-[13px] md:text-base ${
                  error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                }`}
                value={password}
                onChange={e => {
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
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm7.5 0c-1.74-4.14-5.36-7-9.5-7S4.24 7.86 2.5 12c1.74 4.14 5.36 7 9.5 7 4.14 0 7.76-2.86 9.5-7z" />
                  </svg>
                )}
              </button>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className={`hsi-hover-fill w-full text-white font-semibold py-2.5 md:py-3 rounded-md transition mb-2 text-[13px] md:text-base mt-6 md:mt-0 ${
                error
                  ? 'bg-red-500 hover:bg-red-600 animate-shake'
                  : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400'
              }`}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3 mt-3">
              <label htmlFor="login-terms" className="flex items-center gap-2 text-[13px] md:text-sm text-gray-700 min-w-0">
                <input
                  id="login-terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="leading-snug">
                  I've read and agree with your{' '}
                  <button
                    type="button"
                    onClick={() => openPolicyModal('terms')}
                    className="text-yellow-600 hsi-no-clip"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={() => openPolicyModal('retention')}
                    className="text-yellow-600 hsi-no-clip"
                  >
                    Data Retention Policy
                  </button>
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="inline-flex items-center text-[13px] md:text-sm leading-6 text-yellow-600 whitespace-nowrap self-start md:self-auto pr-1 hsi-no-clip"
              >
                Forgot Password?
              </button>
            </div>
          </form>
          <div className="flex items-center my-2 sm:my-5">
            <div className="flex-grow h-px bg-[#d7dde4]" />
            <span className="mx-2 md:mx-3 text-gray-400 bg-white px-2 text-[13px] md:text-sm">or</span>
            <div className="flex-grow h-px bg-[#d7dde4]" />
          </div>
          <div className="w-full flex items-center justify-center mb-3">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed. Please try again.')}
              shape="rectangular"
              theme="filled_black"
              size="large"
              width="100%"
            />
          </div>
          <div className="flex flex-col md:flex-row justify-center md:justify-between text-[11px] md:text-sm mt-1 gap-1 md:gap-0">
            <span className="text-gray-500">No account yet?</span>
            <Link to="/register" className="text-yellow-600 font-medium cursor-pointer">Create account</Link>
          </div>
        </div>
      </div>

      <div className="relative h-44 w-full overflow-hidden md:hidden">
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
        className="hidden lg:flex w-1/2 bg-gray-100 items-center justify-center relative z-0"
        style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)' }}
      >
        <img
          src="/hero.jpg"
          alt="Professional workspace"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-700/55 via-yellow-500/25 to-transparent z-0" />
        <div className="relative z-10 p-6 sm:p-8 md:p-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">A platform built to support your professional journey.</h2>
        </div>
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
                    We may suspend or terminate your access to the Service at our sole discretion if you violate these Terms or engage in behavior that may harm the Platform, other users, or our operations. Upon termination, your right to access and use the Service will immediately cease.
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
                Back to Login
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showLogin2FAModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-xl w-[min(18.5rem,calc(100vw-40px))] md:w-full md:max-w-2xl p-3 md:p-8 relative text-center"
          >
            <h2 className="text-[1.55rem] md:text-2xl font-bold text-gray-800 mb-3">Two-Factor Verification</h2>
            <p className="text-gray-600 mb-5 text-[13px] md:text-sm">
              Enter the 6-digit code sent to <span className="font-semibold">{email}</span>
            </p>

            {login2FAError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {login2FAError}
              </div>
            )}

            <form onSubmit={handleVerifyLogin2FA}>
              <div className="flex justify-center gap-1.5 md:gap-2 mb-5">
                {loginOtp.map((digit, index) => (
                  <input
                    key={index}
                    id={`login-otp-${index}`}
                    type="text"
                    maxLength="1"
                    className="w-9 h-9 md:w-12 md:h-12 text-center text-base md:text-xl font-semibold border-2 border-gray-300 rounded-md focus:border-yellow-500 focus:outline-none"
                    value={digit}
                    onChange={(e) => handleLoginOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleLoginOtpKeyDown(index, e)}
                  />
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLogin2FAModal(false);
                    setLoginOtp(['', '', '', '', '', '']);
                    setTwoFactorToken('');
                    setLogin2FAError('');
                  }}
                  className="hsi-hover-fill flex-1 px-4 py-2.5 md:py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="hsi-hover-fill flex-1 px-4 py-2.5 md:py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white rounded-xl text-sm md:text-base"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showLockoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl shadow-xl w-[min(18.5rem,calc(100vw-40px))] md:w-full md:max-w-sm p-4 md:p-6 text-center"
          >
            <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5zm0 5.25a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75zm0 10.5a1.125 1.125 0 110-2.25 1.125 1.125 0 010 2.25z" />
              </svg>
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Account Temporarily Locked</h3>
            <p className="text-sm text-gray-600 mb-5">{lockoutMessage}</p>
            <button
              type="button"
              onClick={() => setShowLockoutModal(false)}
              className="hsi-hover-fill w-full rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yellow-600"
            >
              Okay
            </button>
          </motion.div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`bg-white rounded-2xl shadow-xl w-[min(16.75rem,calc(100vw-56px))] md:w-full md:max-w-2xl p-3 md:p-8 relative ${forgotShake ? 'animate-shake' : ''}`}
          >
            <h2 className="text-[1.2rem] md:text-2xl font-bold text-gray-800 mb-2.5">Forgot Password</h2>
            <p className="text-gray-600 mb-3 text-[11px] leading-snug md:text-sm">Enter your registered email address to receive an OTP</p>
            
            <form onSubmit={handleForgotPassword}>
              <div className="relative mb-3">
                <input
                  type="email"
                  className={`w-full px-3 pt-5 pb-2 rounded-xl border focus:outline-none focus:ring-2 bg-blue-50 peer text-[12px] md:px-4 md:pt-6 md:pb-2 md:text-sm ${
                    forgotError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                  }`}
                  value={forgotEmail}
                  onChange={e => {
                    setForgotEmail(e.target.value);
                    if (forgotError) setForgotError('');
                  }}
                  placeholder=" "
                  required
                />
                <label className={`absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[12px] peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] md:left-4 md:top-4 md:translate-y-0 md:peer-placeholder-shown:top-4 md:peer-placeholder-shown:translate-y-0 md:peer-placeholder-shown:text-base md:peer-focus:top-1.5 md:peer-focus:text-xs md:peer-[:not(:placeholder-shown)]:top-1.5 md:peer-[:not(:placeholder-shown)]:text-xs pointer-events-none ${
                  forgotError ? 'text-red-500 peer-focus:text-red-600' : 'text-gray-500 peer-focus:text-yellow-600'
                }`}>
                  Email Address
                </label>
              </div>

              <div className="flex flex-row flex-wrap justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotEmail('');
                    setForgotError('');
                  }}
                  className="hsi-hover-fill min-w-[88px] md:min-w-[140px] px-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-[12px] md:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="hsi-hover-fill min-w-[104px] md:min-w-[170px] px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white rounded-xl text-[12px] md:text-sm"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-xl w-[min(18.5rem,calc(100vw-40px))] md:w-full md:max-w-2xl p-3 md:p-8 relative text-center"
          >
            <h2 className="text-[1.55rem] md:text-2xl font-bold text-gray-800 mb-3">Enter OTP</h2>
            <p className="text-gray-600 mb-5 text-[13px] md:text-sm">
              We sent a verification code to <span className="font-semibold">{forgotEmail}</span>
            </p>

            <form onSubmit={handleVerifyResetOTP}>
              <div className="flex justify-center gap-1.5 md:gap-2 mb-5">
                {resetOtp.map((digit, index) => (
                  <input
                    key={index}
                    id={`reset-otp-${index}`}
                    type="text"
                    maxLength="1"
                    className="w-9 h-9 md:w-12 md:h-12 text-center text-base md:text-xl font-semibold border-2 border-gray-300 rounded-md focus:border-yellow-500 focus:outline-none"
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                  />
                ))}
              </div>

              <div className="flex flex-row flex-wrap justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowOTPModal(false);
                    setResetOtp(['', '', '', '', '', '']);
                    setForgotError('');
                  }}
                  className="hsi-hover-fill min-w-[110px] md:min-w-[140px] px-4 py-2.5 md:py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-[13px] md:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="hsi-hover-fill min-w-[125px] md:min-w-[170px] px-4 py-2.5 md:py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white rounded-xl text-[13px] md:text-sm"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`bg-white rounded-2xl shadow-xl w-[min(18.5rem,calc(100vw-40px))] md:w-full md:max-w-2xl p-3 md:p-8 relative ${resetShake ? 'animate-shake' : ''}`}
          >
            <h2 className="text-[1.55rem] md:text-2xl font-bold text-gray-800 mb-4">Reset Password</h2>
            <p className="text-gray-600 mb-5 text-[13px] md:text-sm">Enter your new password</p>

            <form onSubmit={handleResetPassword}>
              <div className="relative mb-3">
                <input
                  type="password"
                  className={`w-full px-4 pt-4 pb-2 rounded-xl border focus:outline-none focus:ring-2 bg-blue-50 peer text-sm ${
                    forgotError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                  }`}
                  value={newPassword}
                  onChange={e => {
                    setNewPassword(e.target.value);
                    if (forgotError) setForgotError('');
                  }}
                  placeholder=" "
                  required
                />
                <label className={`absolute left-4 top-4 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs pointer-events-none ${
                  forgotError ? 'text-red-500 peer-focus:text-red-600' : 'text-gray-500 peer-focus:text-yellow-600'
                }`}>
                  New Password
                </label>
              </div>

              <div className="relative mb-5">
                <input
                  type="password"
                  className={`w-full px-4 pt-4 pb-2 rounded-xl border focus:outline-none focus:ring-2 bg-blue-50 peer text-sm ${
                    forgotError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'
                  }`}
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    if (forgotError) setForgotError('');
                  }}
                  placeholder=" "
                  required
                />
                <label className={`absolute left-4 top-4 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs pointer-events-none ${
                  forgotError ? 'text-red-500 peer-focus:text-red-600' : 'text-gray-500 peer-focus:text-yellow-600'
                }`}>
                  Confirm Password
                </label>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setForgotError('');
                  }}
                  className="hsi-hover-fill flex-1 px-4 py-2.5 md:py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="hsi-hover-fill flex-1 px-4 py-2.5 md:py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white rounded-xl text-sm md:text-base"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}



