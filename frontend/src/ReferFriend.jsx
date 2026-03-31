import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';

export default function ReferFriend() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({ email: '', jobLink: '', message: '' });
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.jobLink) {
      return;
    }

    try {
      setIsSending(true);
      setFeedback({ type: '', text: '' });

      const response = await fetch(apiEndpoints.sendReferralInvitation, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          jobLink: form.jobLink,
          message: form.message,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await response.json() : { message: await response.text() };

      if (!response.ok) {
        throw new Error(
          data?.message || 'Referral service is unavailable. Please make sure the backend is running.'
        );
      }

      setFeedback({ type: '', text: '' });
      setShowSuccessModal(true);
      setForm({ email: '', jobLink: '', message: '' });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Failed to send referral invitation.' });
    } finally {
      setIsSending(false);
    }
  };

  const inputStyle = {
    width: '100%',
    margin: '8px 0',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
  };

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f6f2ea' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <Link to="/training" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
            {'< Back to Career Hub'}
          </Link>
          <h1 style={{ fontSize: '30px', marginTop: '10px', fontWeight: '800', color: '#111827' }}>Refer a Friend</h1>
          <p style={{ color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
            Share job links and send referral invitations directly from this page.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#fff', border: '1px solid #efe4d3', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '620px' }}>
            <form onSubmit={handleSubmit}>
              {feedback.text ? (
                <p
                  style={{
                    marginBottom: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#b91c1c',
                  }}
                >
                  {feedback.text}
                </p>
              ) : null}
              <input
                type="email"
                placeholder="Friend's Email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                style={inputStyle}
              />
              <input
                placeholder="Job Link"
                value={form.jobLink}
                onChange={(e) => setForm((prev) => ({ ...prev, jobLink: e.target.value }))}
                style={inputStyle}
              />
              <textarea
                placeholder="Message (optional)"
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
              />
              <button
                type="submit"
                disabled={isSending}
                style={{
                  marginTop: '10px',
                  background: '#e1aa18',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontWeight: '700',
                  opacity: isSending ? 0.7 : 1,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                }}
              >
                {isSending ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccessModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 40,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '100%',
                maxWidth: '360px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #efe4d3',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>Success</h3>
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#4b5563' }}>
                Referral invitation has been sent successfully.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  marginTop: '14px',
                  background: '#e1aa18',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
