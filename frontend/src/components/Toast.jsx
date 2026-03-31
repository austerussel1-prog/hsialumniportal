import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const toastTheme = (type) => {
  if (type === 'error') return { bg: '#fee2e2', border: '#fecaca', iconBg: '#ef4444', text: '#7f1d1d' };
  if (type === 'warning') return { bg: '#fef3c7', border: '#fde68a', iconBg: '#f59e0b', text: '#7c2d12' };
  if (type === 'info') return { bg: '#cffafe', border: '#a5f3fc', iconBg: '#06b6d4', text: '#0e7490' };
  return { bg: '#dcfce7', border: '#bbf7d0', iconBg: '#22c55e', text: '#065f46' };
};

const ToastIcon = ({ type }) => {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#fff',
    strokeWidth: 2.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  if (type === 'success') {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (type === 'info') {
    return (
      <svg {...common}>
        <path d="M12 16v-6" />
        <path d="M12 8h.01" />
        <circle cx="12" cy="12" r="10" stroke="none" fill="rgba(255,255,255,0.22)" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </svg>
  );
};

export default function Toast({ toast, centerOffsetPx = 0 }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <AnimatePresence initial={false}>
      {toast && (() => {
        const t = toastTheme(toast.type);
        const text = toast.text || toast.message || '';
        return (
          <div
            style={{
              position: 'fixed',
              top: isMobile ? 12 : 16,
              left: `calc(50% + ${centerOffsetPx}px)`,
              transform: 'translateX(-50%)',
              zIndex: 9999,
              pointerEvents: 'none',
              width: 'auto',
              maxWidth: isMobile ? 'calc(100vw - 40px)' : 'none',
            }}
          >
          <motion.div
            key={toast.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`}
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              width: 'fit-content',
              maxWidth: isMobile ? 'calc(100vw - 40px)' : 'min(680px, calc(100vw - 24px))',
              padding: isMobile ? '7px 10px' : '8px 10px',
              borderRadius: isMobile ? 12 : 10,
              background: t.bg,
              border: `1.5px solid ${t.border}`,
              boxShadow: isMobile ? '0 8px 24px rgba(17,24,39,0.12)' : '0 10px 30px rgba(17,24,39,0.12)',
            }}
            role="status"
            aria-live="polite"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>
              <div style={{ width: isMobile ? 18 : 20, height: isMobile ? 18 : 20, borderRadius: 999, background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ToastIcon type={toast.type} />
              </div>
              <div style={{ color: t.text, fontWeight: 400, fontSize: isMobile ? 12 : 14, lineHeight: isMobile ? 1.3 : 1.35, whiteSpace: isMobile ? 'nowrap' : 'normal' }}>
                {text}
              </div>
            </div>
          </motion.div>
          </div>
        );
      })()}
    </AnimatePresence>
  );
}
