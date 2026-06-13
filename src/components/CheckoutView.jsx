import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, Percent, Trash2, Plus, Minus, FileText, CheckCircle2 } from 'lucide-react';

export default function CheckoutView({
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onBackToStore,
  onConfirmOrder,
  currencySymbol = '₹'
}) {
  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem('vatikart_customer');
    return saved ? JSON.parse(saved) : { name: '', phone: '', address: '' };
  });

  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  
  // Custom comments/notes per item
  const [itemComments, setItemComments] = useState({});
  const [formErrors, setFormErrors] = useState({});

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomer(prev => {
      const updated = { ...prev, [name]: value };
      localStorage.setItem('vatikart_customer', JSON.stringify(updated));
      return updated;
    });
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCommentChange = (idx, comment) => {
    setItemComments(prev => ({ ...prev, [idx]: comment }));
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'WELCOME10' || code === 'SAVE10') {
      setAppliedDiscount(10); // 10% discount
      setCouponSuccess('Coupon "WELCOME10" applied successfully! 10% discount added.');
      setCouponError('');
    } else if (code === 'AURA20') {
      setAppliedDiscount(20); // 20% discount
      setCouponSuccess('Coupon "AURA20" applied successfully! 20% discount added.');
      setCouponError('');
    } else {
      setCouponError('Invalid coupon code. Try WELCOME10 or AURA20');
      setCouponSuccess('');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!customer.name.trim()) errors.name = 'Full name is required';
    if (!customer.phone.trim()) errors.phone = 'Phone number is required';
    if (!customer.address.trim()) errors.address = 'Delivery address is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Calculate pricing breakdown
  // Note: in products.js, price is stored in local currency value (e.g. 157 for Rs.157).
  // Subtotal is sum of (item.originalPrice * quantity) or (item.price * quantity)?
  // In Quick Sell: Subtotal is the sum of raw original prices (MRP), then discount savings are deducted, then tax is added.
  const subtotal = cartItems.reduce((acc, item) => {
    const originalPrice = item.originalPrice || item.price;
    return acc + (originalPrice * item.quantity);
  }, 0);

  const productSavings = cartItems.reduce((acc, item) => {
    const originalPrice = item.originalPrice || item.price;
    const saving = originalPrice - item.price;
    return acc + (saving * item.quantity);
  }, 0);

  // Coupon discount is calculated on the already discounted item total
  const itemTotalAfterProductSavings = subtotal - productSavings;
  const couponSavings = Number(((itemTotalAfterProductSavings * appliedDiscount) / 100).toFixed(2));
  const totalSavings = productSavings + couponSavings;
  
  const tax = Number(((itemTotalAfterProductSavings - couponSavings) * 0.05).toFixed(2));
  const totalAmount = Number((itemTotalAfterProductSavings - couponSavings + tax).toFixed(2));
  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleConfirm = () => {
    if (!validateForm()) return;

    let orderListText = '';
    cartItems.forEach((item, index) => {
      const commentText = itemComments[index] ? ` (Note: "${itemComments[index]}")` : '';
      
      if (item.priceMode === 'perSet') {
        const packName = item.setName || `Set of ${item.setQuantity} Pieces`;
        let compositionStr = '';
        if (item.setComposition && item.setComposition.length > 0) {
          compositionStr = `\n   - Set Composition:\n` + item.setComposition.map((c) => {
            const sizeLabelStr = c.size_label || c.sizeLabel;
            const colorLabelStr = c.color_label || c.colorLabel;
            const qtyStr = c.qty_in_set || c.qtyInSet;
            const totalQty = qtyStr * item.quantity;
            return `     * ${totalQty}x ${colorLabelStr} / Size ${sizeLabelStr}`;
          }).join('\n');
        }

        orderListText += `${index + 1}. *${item.name}*\n` +
          `   - Pack Type: ${packName}\n` +
          `   - Qty: ${item.quantity} ${item.quantity === 1 ? 'Set' : 'Sets'} (Total: ${item.quantity * item.setQuantity} Pieces)\n` +
          `   - Rate: ${currencySymbol}${item.price} / Set${compositionStr}${commentText}\n` +
          `   - Subtotal: ${currencySymbol}${(item.price * item.quantity).toFixed(2)}\n`;
      } else {
        let variantDetails = '';
        if (item.selectedSize && item.selectedSize !== 'One Size') {
          variantDetails += `Size: ${item.selectedSize}`;
        }
        if (item.selectedColor) {
          variantDetails += `${variantDetails ? ', ' : ''}Color: ${item.selectedColor.name}`;
        }
        if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
          Object.entries(item.selectedOptions).forEach(([key, val]) => {
            variantDetails += `${variantDetails ? ', ' : ''}${key}: ${val}`;
          });
        }
        const detailsStr = variantDetails ? ` (${variantDetails})` : '';
        orderListText += `${index + 1}. *${item.name}* (Qty: ${item.quantity}${detailsStr})${commentText} - ${currencySymbol}${(item.price * item.quantity).toFixed(2)}\n`;
      }
    });

    const msg = `*New Order from VatiKart Storefront!* 🛍️\n\n` +
      `*Customer Details:*\n` +
      `• *Name:* ${customer.name}\n` +
      `• *Phone:* ${customer.phone}\n` +
      `• *Address:* ${customer.address}\n\n` +
      `*Order Details:*\n` +
      `${orderListText}\n` +
      `• *Subtotal:* ${currencySymbol}${subtotal.toFixed(2)}\n` +
      (totalSavings > 0 ? `• *Discount Savings:* -${currencySymbol}${totalSavings.toFixed(2)}\n` : '') +
      `• *GST Tax (5%):* ${currencySymbol}${tax.toFixed(2)}\n` +
      `• *Total Order Value:* *${currencySymbol}${totalAmount.toFixed(2)}*\n\n` +
      `Please confirm my order and share payment details. Thank you!`;

    onConfirmOrder({
      customer,
      items: cartItems.map((item, idx) => ({ ...item, comment: itemComments[idx] })),
      subtotal,
      discount: totalSavings,
      tax,
      total: totalAmount,
      whatsappMsg: msg
    });
  };

  const handleChatNow = () => {
    // Redirect directly to merchant chat
    const msg = encodeURIComponent("Hello! I have a question about the handbags collection.");
    window.open(`https://wa.me/919876543210?text=${msg}`, '_blank');
  };

  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '60vh' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)'
        }}>
          <ArrowLeft size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>Your cart is empty</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '360px' }}>
          Add some products from our handbags collection to proceed with checkout.
        </p>
        <button onClick={onBackToStore} className="btn btn-primary" style={{ marginTop: '12px' }}>
          Back to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '24px 16px', maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '120px' }}>
      
      {/* Header back navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onBackToStore}
          style={{
            padding: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Shopping Cart
          </span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>Checkout</h2>
        </div>
      </div>

      {/* 1. Top Price Badge (Mirroring Quick Sell Card) */}
      <div className="glass-card" style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        border: '1.5px solid var(--accent-light)',
        background: 'var(--accent-light)'
      }}>
        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '-0.02em' }}>
          {currencySymbol} {totalAmount.toFixed(2)}
        </span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px' }}>
          {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* 2. Have a Question? Chat Now Banner */}
      <div className="glass-card" style={{
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>Have a question?</h4>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Chat with us directly on WhatsApp</p>
        </div>
        <button
          onClick={handleChatNow}
          className="btn btn-secondary"
          style={{
            backgroundColor: '#e8f7ed',
            color: '#25D366',
            borderColor: '#ccefd8',
            fontSize: '0.85rem',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 700
          }}
        >
          <MessageCircle size={16} fill="#25D366" color="white" />
          CHAT NOW
        </button>
      </div>

      {/* 3. Your Order Items Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Your order items
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {cartItems.map((item, idx) => {
            const savings = item.originalPrice - item.price;
            const savingsPct = Math.round((savings / item.originalPrice) * 100);
            
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  borderBottom: idx < cartItems.length - 1 ? '1px solid var(--border-color)' : 'none',
                  paddingBottom: idx < cartItems.length - 1 ? '20px' : '0'
                }}
              >
                {/* Product core row */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  {/* Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80'; }}
                  />

                  {/* Info details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {item.name}
                    </h4>
                    
                    {/* Variants */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.priceMode === 'perSet' ? (
                        <>
                          <span>Pack : <strong style={{ color: 'var(--text-primary)' }}>{item.setName || `Set of ${item.setQuantity} pcs`}</strong></span>
                          <span>Total Units : <strong style={{ color: 'var(--text-primary)' }}>{item.quantity * item.setQuantity} pieces</strong></span>
                          {item.setComposition && item.setComposition.length > 0 && (
                            <div style={{ paddingLeft: '8px', borderLeft: '2px solid var(--border-color)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {item.setComposition.map((c, idx) => (
                                <span key={idx} style={{ fontSize: '0.75rem' }}>
                                  • {(c.qty_in_set || c.qtyInSet) * item.quantity}x {c.color_label || c.colorLabel} / Size {c.size_label || c.sizeLabel}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {item.selectedSize && item.selectedSize !== 'One Size' && (
                            <span>Sizes : <strong style={{ color: 'var(--text-primary)' }}>{item.selectedSize}</strong></span>
                          )}
                          {item.selectedColor && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              Colors : 
                              <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: item.selectedColor.hex,
                                display: 'inline-block',
                                border: item.selectedColor.name.toLowerCase() === 'white' ? '1px solid var(--border-color)' : 'none'
                              }} />
                              <strong style={{ color: 'var(--text-primary)' }}>{item.selectedColor.name}</strong>
                            </span>
                          )}
                          {item.selectedOptions && Object.entries(item.selectedOptions).map(([key, val]) => (
                            <span key={key}>{key} : <strong style={{ color: 'var(--text-primary)' }}>{val}</strong></span>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Quantity selectors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                        <button
                          onClick={() => onUpdateQty(idx, item.quantity - 1)}
                          style={{ padding: '4px 10px', color: 'var(--text-secondary)' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, width: '45px', textAlign: 'center', color: 'var(--text-primary)' }}>
                          {item.quantity} {item.priceMode === 'perSet' ? 'Sets' : ''}
                        </span>
                        <button
                          onClick={() => onUpdateQty(idx, item.quantity + 1)}
                          style={{ padding: '4px 10px', color: 'var(--text-secondary)' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(idx)}
                        style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Price info right aligned */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                      {currencySymbol}{(item.originalPrice * item.quantity).toFixed(2)}
                    </span>
                    {savings > 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>
                        ({savingsPct}% off)
                      </span>
                    )}
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                      {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>+ 5% tax</span>
                  </div>
                </div>

                {/* Comment message input (Quick Sell feature) */}
                <div style={{ position: 'relative', marginTop: '4px' }}>
                  <input
                    type="text"
                    placeholder="Type a message or instruction for this item..."
                    value={itemComments[idx] || ''}
                    onChange={(e) => handleCommentChange(idx, e.target.value)}
                    className="form-input"
                    style={{
                      height: '36px',
                      fontSize: '0.8rem',
                      paddingLeft: '36px',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderStyle: 'dashed'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.85rem'
                  }}>
                    ✎
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Apply Coupon Card */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Percent size={15} style={{ color: 'var(--accent-primary)' }} />
          Apply Coupon
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="e.g. WELCOME10 or AURA20"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            className="form-input"
            style={{ flex: 1, textTransform: 'uppercase', height: '40px', fontSize: '0.85rem' }}
          />
          <button
            onClick={handleApplyCoupon}
            className="btn btn-outline"
            style={{ padding: '0 16px', height: '40px', fontSize: '0.85rem' }}
          >
            Apply
          </button>
        </div>
        {couponError && <span style={{ color: 'var(--danger)', fontSize: '0.78rem', fontWeight: 600 }}>{couponError}</span>}
        {couponSuccess && <span style={{ color: 'var(--success)', fontSize: '0.78rem', fontWeight: 600 }}>{couponSuccess}</span>}
      </div>

      {/* 5. Delivery Details Card */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Delivery details
        </h3>
        
        <div className="form-group" style={{ marginBottom: '8px' }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Full Name *</label>
          <input
            type="text"
            name="name"
            value={customer.name}
            onChange={handleCustomerChange}
            placeholder="Enter your name"
            className="form-input"
            style={{ padding: '10px 14px', fontSize: '0.85rem' }}
          />
          {formErrors.name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.name}</span>}
        </div>

        <div className="form-group" style={{ marginBottom: '8px' }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Phone Number *</label>
          <input
            type="text"
            name="phone"
            value={customer.phone}
            onChange={handleCustomerChange}
            placeholder="e.g. +91 98765 43210"
            className="form-input"
            style={{ padding: '10px 14px', fontSize: '0.85rem' }}
          />
          {formErrors.phone && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.phone}</span>}
        </div>

        <div className="form-group" style={{ marginBottom: '0' }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Delivery Address *</label>
          <textarea
            name="address"
            value={customer.address}
            onChange={handleCustomerChange}
            placeholder="Street, City, Zip Code"
            className="form-input"
            rows="2"
            style={{ padding: '10px 14px', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
          />
          {formErrors.address && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.address}</span>}
        </div>
      </div>

      {/* 6. Pricing Breakdown Card */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
          <span>Sub total</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currencySymbol}{subtotal.toFixed(2)}</span>
        </div>

        {totalSavings > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.925rem', color: 'var(--danger)' }}>
            <span>
              Discount
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {((totalSavings / subtotal) * 100).toFixed(0)}% savings
              </span>
            </span>
            <span style={{ fontWeight: 700 }}>- {currencySymbol}{totalSavings.toFixed(2)}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
          <span>
            Tax
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>5% gst</span>
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currencySymbol}{tax.toFixed(2)}</span>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          <span>Total</span>
          <span style={{ color: 'var(--accent-primary)', fontSize: '1.25rem' }}>{currencySymbol}{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Sticky Bottom Confirm Button (Quick Sell Style) */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 150
      }}>
        <button
          onClick={handleConfirm}
          className="btn btn-primary"
          style={{
            width: '100%',
            maxWidth: '700px',
            height: '50px',
            fontSize: '1rem',
            fontWeight: 800,
            borderRadius: '12px',
            backgroundColor: '#000000',
            backgroundImage: 'none',
            color: '#ffffff',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px',
            transition: 'var(--transition-smooth)'
          }}
          className="checkout-confirm-btn"
        >
          <span style={{ letterSpacing: '0.03em' }}>CONFIRM ORDER</span>
          <span>→</span>
        </button>
      </div>

      <style>{`
        .checkout-confirm-btn:hover {
          background-color: var(--accent-primary) !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4) !important;
        }
      `}</style>
    </div>
  );
}
