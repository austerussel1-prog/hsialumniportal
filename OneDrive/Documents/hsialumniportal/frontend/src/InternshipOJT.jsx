import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';

const OJT_POSTS_KEY = 'hsi_internship_ojt_posts';

function getStoredInternships() {
  try {
    const raw = localStorage.getItem(OJT_POSTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

export default function InternshipOJT() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [internships, setInternships] = useState(getStoredInternships);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [ojtForm, setOjtForm] = useState({ company: '', position: '', location: '' });

  const handlePostOJT = (event) => {
    event.preventDefault();
    if (!ojtForm.company || !ojtForm.position || !ojtForm.location) {
      return;
    }
    const newPost = { id: Date.now(), ...ojtForm };
    setInternships((prev) => {
      const updated = [...prev, newPost];
      localStorage.setItem(OJT_POSTS_KEY, JSON.stringify(updated));
      return updated;
    });
    setOjtForm({ company: '', position: '', location: '' });
    setShowSuccessModal(true);
  };

  const cardStyle = {
    flex: 1,
    minWidth: '320px',
    background: '#fff',
    border: '1px solid #efe4d3',
    borderRadius: '12px',
    padding: '20px',
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
          <h1 style={{ fontSize: '30px', marginTop: '10px', fontWeight: '800', color: '#111827' }}>Internship & OJT Opportunities</h1>
          <p style={{ color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
            Students can browse internships while companies can post OJT openings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#b07a15' }}>Post OJT Opening</h2>
            <form onSubmit={handlePostOJT}>
              <input
                value={ojtForm.company}
                onChange={(e) => setOjtForm((prev) => ({ ...prev, company: e.target.value }))}
                placeholder="Company Name"
                style={inputStyle}
              />
              <input
                value={ojtForm.position}
                onChange={(e) => setOjtForm((prev) => ({ ...prev, position: e.target.value }))}
                placeholder="Position"
                style={inputStyle}
              />
              <input
                value={ojtForm.location}
                onChange={(e) => setOjtForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Location"
                style={inputStyle}
              />
              <button type="submit" style={{ marginTop: '10px', background: '#e1aa18', color: '#111827', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: '700' }}>
                Post OJT
              </button>
            </form>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '18px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>Internship & OJT Listings</h2>
          {internships.length === 0 ? (
            <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '13px' }}>
              No internships yet. Posted OJT opportunities will appear here.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))' }}>
              {internships.map((internship) => (
                <div
                  key={internship.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #efe4d3',
                    borderRadius: '14px',
                    padding: '16px 18px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 6px 14px rgba(17, 24, 39, 0.05)',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <img src="/Lion.png" alt="HSI logo" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', lineHeight: 1.15 }}>
                        {internship.position}
                      </h3>
                      <p style={{ marginTop: '3px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                        Gain real-world experience with guided internship and OJT work.
                      </p>
                      <div style={{ display: 'flex', gap: '7px', marginTop: '6px' }}>
                        <span
                          style={{
                            border: '1px solid #86efac',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 10px',
                            borderRadius: '999px',
                            fontSize: '10px',
                            fontWeight: '700',
                          }}
                        >
                          Open
                        </span>
                        <span
                          style={{
                            border: '1px solid #d1d5db',
                            background: '#f3f4f6',
                            color: '#374151',
                            padding: '2px 10px',
                            borderRadius: '999px',
                            fontSize: '10px',
                            fontWeight: '700',
                          }}
                        >
                          Internship/OJT
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: '#111827', fontSize: '13px' }}>{internship.company}</div>
                      <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '11px' }}>{internship.location}</div>
                    </div>
                    <img src="/Lion.png" alt="HSI logo small" style={{ width: '34px', height: '34px', opacity: 0.9 }} />
                  </div>

                  <a
                    href={`mailto:hr@hsi.com?subject=Application%20-%20${encodeURIComponent(internship.position)}`}
                    style={{
                      marginTop: '2px',
                      width: '100%',
                      background: '#e1aa18',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '10px',
                      fontWeight: '700',
                      fontSize: '10px',
                      textAlign: 'center',
                      padding: '8px 12px',
                    }}
                  >
                    View OJT Details
                  </a>
                </div>
              ))}
            </div>
          )}
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
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#4b5563' }}>Internship/OJT post published successfully.</p>
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
