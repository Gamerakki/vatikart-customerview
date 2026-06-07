import React from 'react';
import { X, CheckCircle2, Printer, Download } from 'lucide-react';

export default function MockInvoiceModal({ isOpen, onClose, invoiceData }) {
  if (!isOpen || !invoiceData) return null;

  const { customer, items, subtotal, tax, total, orderId, date } = invoiceData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: '20px'
    }}>
      {/* Modal Card */}
      <div
        className="glass-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)'
        }}
      >
        
        {/* Header (Non-printable section option) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-tertiary)'
        }} className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Order Invoice Generated</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={14} />
              Print
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Invoice Contents (Print Area) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }} id="invoice-print-area">
          
          {/* Logo & ID */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '1.2rem',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                VatiKart
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Premium storefront solution</p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>INVOICE</h2>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '4px' }}>Invoice: {orderId}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>Date: {date}</p>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', marginBottom: '20px' }} />

          {/* Customer & Billing Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                Customer Details
              </h4>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{customer.name}</p>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{customer.phone}</p>
            </div>

            <div style={{ maxWidth: '240px', textAlign: 'right' }} className="invoice-align-left-mobile">
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                Delivery Address
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4', whiteSpace: 'pre-line' }}>{customer.address}</p>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '8px 0', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Item</th>
                <th style={{ padding: '8px 0', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', textAlign: 'center' }}>Variant</th>
                <th style={{ padding: '8px 0', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '8px 0', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', textAlign: 'right' }}>Price</th>
                <th style={{ padding: '8px 0', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '12px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      {item.selectedSize && item.selectedSize !== 'One Size' && <span>{item.selectedSize}</span>}
                      {item.selectedColor && <span>{item.selectedColor.name}</span>}
                      {item.selectedOptions && Object.entries(item.selectedOptions).map(([key, val]) => (
                        <span key={key} style={{ fontSize: '0.75rem' }}>{key}: {val}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 0', fontSize: '0.9rem', color: 'var(--text-primary)', textAlign: 'center' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '220px', marginLeft: 'auto', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Tax (5%)::</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{tax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              <span>Grand Total:</span>
              <span style={{ color: 'var(--accent-primary)' }}>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Instructions footer */}
          <div style={{
            marginTop: '32px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Thank you for shopping with VatiKart!</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              This is a digital copy of your order invoice receipt. Since this storefront does not require login, please save this receipt or print it for your records.
            </p>
          </div>

        </div>

      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-area, #invoice-print-area * {
            visibility: visible;
          }
          #invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .invoice-align-left-mobile {
            text-align: left !important;
          }
        }
      `}</style>
    </div>
  );
}
