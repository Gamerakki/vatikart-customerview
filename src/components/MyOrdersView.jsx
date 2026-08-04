import React, { useEffect, useState } from 'react';
import { fetchMyOrders, sendStorefrontOtp, verifyStorefrontOtp } from '../services/storeApi';

const ORDER_STEPS = ['UNCONFIRMED', 'CONFIRMED', 'ACCEPTED', 'COMPLETED'];
const SESSION_KEY = 'vatikart_otp_session';

export default function MyOrdersView({
  onBackToStore,
  t = (k) => k,
  initialPhone = '',
}) {
  const [phone, setPhone] = useState(() => {
    return (initialPhone || localStorage.getItem('vatikart_customer_phone') || '').replace(/\D/g, '');
  });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [verifiedPhone, setVerifiedPhone] = useState(() => sessionStorage.getItem('vatikart_verified_phone') || '');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (!sessionToken || !verifiedPhone) return;
    void loadOrders(verifiedPhone, sessionToken);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrders = async (phoneToUse, token) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyOrders(phoneToUse, token);
      setOrders(data);
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : 'Unable to load orders right now.');
      setSessionToken('');
      setVerifiedPhone('');
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem('vatikart_verified_phone');
    } finally {
      setLoading(false);
    }
  };

  const handleGetOtp = async () => {
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendStorefrontOtp(normalized);
      setPhone(normalized);
      setOtpSent(true);
      setResendIn(30);
      setOtp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    const normalized = phone.replace(/\D/g, '');
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const result = await verifyStorefrontOtp(normalized, otp.trim());
      const token = result.session_token;
      const vPhone = result.verified_phone || normalized;
      setSessionToken(token);
      setVerifiedPhone(vPhone);
      sessionStorage.setItem(SESSION_KEY, token);
      sessionStorage.setItem('vatikart_verified_phone', vPhone);
      localStorage.setItem('vatikart_customer_phone', vPhone);
      await loadOrders(vPhone, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP');
    } finally {
      setVerifying(false);
    }
  };

  const isVerified = Boolean(sessionToken && verifiedPhone);

  return (
    <main className="container" style={{ flex: 1, padding: '32px 24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{t('my_orders_title')}</h2>
        <button className="btn btn-outline" onClick={onBackToStore}>{t('back_to_store')}</button>
      </div>

      {!isVerified ? (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: 520,
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Verify your phone to view orders</div>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Phone Number
          </label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="e.g. 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="form-input"
            style={{ height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />

          <button
            className="btn btn-primary"
            disabled={sending || resendIn > 0}
            onClick={() => { void handleGetOtp(); }}
            style={{ height: 44, borderRadius: 10, opacity: sending || resendIn > 0 ? 0.6 : 1 }}
          >
            {sending ? 'Sending…' : resendIn > 0 ? `Resend OTP in ${resendIn}s` : otpSent ? 'Resend OTP' : 'Get OTP'}
          </button>

          {otpSent ? (
            <>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                A 6-digit verification code has been sent to your WhatsApp number.
              </div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="form-input"
                style={{ height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', letterSpacing: '0.3em', fontWeight: 800 }}
              />
              <button
                className="btn btn-primary"
                disabled={verifying}
                onClick={() => { void handleVerify(); }}
                style={{ height: 46, borderRadius: 10 }}
              >
                {verifying ? 'Verifying…' : 'Verify & View Orders'}
              </button>
              <a
                className="btn btn-secondary"
                href={`https://wa.me/918898109059?text=${encodeURIComponent(
                  `Hi VatiKart, please resend my OTP for phone ${phone.slice(-10)}.`,
                )}`}
                target="_blank"
                rel="noreferrer"
                style={{ height: 44, borderRadius: 10, displayDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                💬 Resend via WhatsApp Web
              </a>
            </>
          ) : null}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Verified: <strong style={{ color: 'var(--text-primary)' }}>{verifiedPhone}</strong>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => { void loadOrders(verifiedPhone, sessionToken); }}
          >
            {t('refresh')}
          </button>
        </div>
      )}

      {error ? <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{error}</div> : null}

      {isVerified && loading ? (
        <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t('loading_orders')}</div>
      ) : null}

      {isVerified && !loading && !error && orders.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t('no_orders_found')}</div>
      ) : null}

      {isVerified && !loading && orders.length > 0 ? (
        <div style={{ display: 'grid', gap: '14px' }}>
          {orders.map((order) => {
            const currentStepIndex = ORDER_STEPS.indexOf(order.status);
            return (
              <div key={order.orderId} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Order #{order.orderId}</div>
                  <div style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{order.status}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ORDER_STEPS.map((step, idx) => (
                    <div
                      key={step}
                      style={{
                        fontSize: '0.72rem',
                        padding: '4px 8px',
                        borderRadius: '999px',
                        border: '1px solid var(--border-color)',
                        color: idx <= currentStepIndex ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                        background: idx <= currentStepIndex ? 'var(--accent-light)' : 'transparent',
                        fontWeight: 700,
                      }}
                    >
                      {step}
                    </div>
                  ))}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {t('order_date')}: {new Date(order.addedDate).toLocaleString()}
                </div>
                <div style={{ display: 'grid', gap: '6px', fontSize: '0.86rem' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Subtotal: <strong style={{ color: 'var(--text-primary)' }}>₹{Number(order.subtotal || 0).toFixed(2)}</strong></div>
                  <div style={{ color: 'var(--text-secondary)' }}>Tax: <strong style={{ color: 'var(--text-primary)' }}>₹{Number(order.tax || 0).toFixed(2)}</strong></div>
                  <div style={{ color: 'var(--text-secondary)' }}>Total: <strong style={{ color: 'var(--text-primary)' }}>₹{Number(order.total || 0).toFixed(2)}</strong></div>
                </div>
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '8px', display: 'grid', gap: '5px' }}>
                  {(order.items || []).map((item) => (
                    <div key={item.id} style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>{item.title} x {item.qty}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>₹{Number(item.price || 0).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
