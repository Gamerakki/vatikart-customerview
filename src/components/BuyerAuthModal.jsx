import React, { useState } from 'react';

export default function BuyerAuthModal({ isOpen, onSubmit }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setError('');
    onSubmit({ name: name.trim(), phone });
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome to our store! 👋</h2>
        <p style={styles.subtitle}>Please enter your details to start browsing and view custom pricing.</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Your Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              maxLength={10}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              style={styles.input}
            />
          </div>

          {error ? <p style={styles.error}>{error}</p> : null}

          <button type="submit" style={styles.button}>Enter Store</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  title: { margin: '0 0 8px 0', fontSize: '20px', color: '#1E293B', fontWeight: 'bold' },
  subtitle: { margin: '0 0 20px 0', fontSize: '14px', color: '#64748B', lineHeight: '1.4' },
  inputGroup: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#475569' },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    boxSizing: 'border-box',
    color: '#1E293B',
    outline: 'none',
  },
  error: { color: '#EF4444', fontSize: '12px', margin: '0 0 16px 0' },
  button: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: '#0D9488',
    color: '#FFFFFF',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '15px',
    cursor: 'pointer',
  },
};
