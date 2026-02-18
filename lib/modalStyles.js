// lib/modalStyles.js
// Shared modal styles for EditModal, ShareModal, and other overlays

export const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(4, 6, 14, 0.82)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20,
  animation: 'fadeIn 0.18s ease both',
};

export const modalCardStyle = {
  background: 'rgba(12, 16, 32, 0.95)',
  border: '1px solid rgba(99, 120, 200, 0.22)',
  borderRadius: 20,
  padding: 24,
  width: 'min(520px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  animation: 'fadeUp 0.25s cubic-bezier(0.34, 1.2, 0.64, 1) both',
};
