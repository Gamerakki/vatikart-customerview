import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageCircle, Percent, Plus, Minus } from 'lucide-react';
import { getEffectivePrice } from '../services/pricing';
import { compileTemplate, getStoreConfig } from '../services/storeApi';
import { translations } from '../utils/i18n';

export default function CheckoutView({
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onBackToStore,
  onConfirmOrder,
  whatsappTargetPhone = '',
  resellerPhone = '',
  currencySymbol = '₹',
  lang = 'en',
  storePolicies = '',
}) {
  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;
  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem('vatikart_customer');
    return saved ? JSON.parse(saved) : { name: '', phone: '', address: '' };
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [itemComments, setItemComments] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [orderConfirmText, setOrderConfirmText] = useState('Your order {order_id} of total {total} is confirmed. Track it here: {link}');
  const [showPolicies, setShowPolicies] = useState(false);

  const moqViolations = useMemo(
    () => cartItems.filter((item) => Number(item.quantity) < Math.max(1, Number(item.minimumOrderQty) || 1)),
    [cartItems]
  );
  const hasMoqViolation = moqViolations.length > 0;

  const inventoryViolations = useMemo(() => {
    const demandByCombo = new Map();

    cartItems.forEach((item) => {
      const inventoryRows = Array.isArray(item.inventoryItems) ? item.inventoryItems : [];
      if (inventoryRows.length === 0) return;

      const selectedSizeOptionId = item.selectedSizeOption?.optionId
        ?? item.sizeOptions?.find((size) => size.label === item.selectedSize)?.optionId
        ?? null;
      const selectedColorOptionId = item.selectedColor?.optionId
        ?? item.colors?.find((color) => color.name === item.selectedColor?.name)?.optionId
        ?? null;

      const comboKey = `${item.id}:${selectedSizeOptionId ?? 'null'}:${selectedColorOptionId ?? 'null'}`;
      const required = (demandByCombo.get(comboKey)?.required || 0) + Number(item.quantity || 0);
      const label = `${item.name}${item.selectedColor?.name || item.selectedSize ? ` (${[item.selectedColor?.name, item.selectedSize].filter(Boolean).join(' / ')})` : ''}`;

      const matchingRow = inventoryRows.find((row) => {
        const sizeMatch = (row.sizeOptionId ?? null) === (selectedSizeOptionId ?? null);
        const colorMatch = (row.colorOptionId ?? null) === (selectedColorOptionId ?? null);
        return sizeMatch && colorMatch;
      });

      demandByCombo.set(comboKey, {
        label,
        required,
        available: Number(matchingRow?.quantity || 0),
      });
    });

    return Array.from(demandByCombo.values()).filter((row) => row.required > row.available);
  }, [cartItems]);
  const hasInventoryViolation = inventoryViolations.length > 0;

  useEffect(() => {
    if (hasMoqViolation) {
      setCouponSuccess('');
    }
  }, [hasMoqViolation]);

  useEffect(() => {
    let cancelled = false;

    const loadTemplateSettings = async () => {
      const { apiBase, token } = getStoreConfig();
      if (!token) return;

      try {
        const response = await fetch(`${apiBase}/whatsapp-template/settings`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;
        const body = await response.json();
        const template = body?.data?.order_confirm_text || body?.data?.orderConfirmText;

        if (!cancelled && typeof template === 'string' && template.trim()) {
          setOrderConfirmText(template.trim());
        }
      } catch {
        // Keep default template when settings fetch fails.
      }
    };

    void loadTemplateSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomer((prev) => {
      const updated = { ...prev, [name]: value };
      localStorage.setItem('vatikart_customer', JSON.stringify(updated));
      return updated;
    });
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCommentChange = (idx, comment) => {
    setItemComments((prev) => ({ ...prev, [idx]: comment }));
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'WELCOME10' || code === 'SAVE10') {
      setAppliedDiscount(10);
      setCouponSuccess('Coupon "WELCOME10" applied successfully! 10% discount added.');
      setCouponError('');
      return;
    }
    if (code === 'AURA20') {
      setAppliedDiscount(20);
      setCouponSuccess('Coupon "AURA20" applied successfully! 20% discount added.');
      setCouponError('');
      return;
    }
    setCouponError('Invalid coupon code. Try WELCOME10 or AURA20');
    setCouponSuccess('');
  };

  const validateForm = () => {
    const errors = {};
    if (!customer.name.trim()) errors.name = 'Full name is required';
    if (!customer.phone.trim()) errors.phone = 'Phone number is required';
    if (!customer.address.trim()) errors.address = 'Delivery address is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const subtotal = cartItems.reduce((acc, item) => {
    const originalPrice = Number(item.originalPrice || item.price || 0);
    return acc + originalPrice * Number(item.quantity || 0);
  }, 0);

  const productSavings = cartItems.reduce((acc, item) => {
    const originalPrice = Number(item.originalPrice || item.price || 0);
    const effectivePrice = getEffectivePrice(item, item.quantity, cartItems);
    return acc + (originalPrice - effectivePrice) * Number(item.quantity || 0);
  }, 0);

  const itemTotalAfterProductSavings = subtotal - productSavings;
  const couponSavings = Number(((itemTotalAfterProductSavings * appliedDiscount) / 100).toFixed(2));
  const totalSavings = productSavings + couponSavings;

  const tax = cartItems.reduce((acc, item) => {
    const effectivePrice = getEffectivePrice(item, item.quantity, cartItems);
    const itemSubtotal = effectivePrice * Number(item.quantity || 0);
    const gstRate = Number(item.gstRate ?? item.gst_rate ?? 0) || 0;
    return acc + itemSubtotal * (gstRate / 100) * (1 - appliedDiscount / 100);
  }, 0);

  const roundedTax = Number(tax.toFixed(2));
  const totalAmount = Number((itemTotalAfterProductSavings - couponSavings + roundedTax).toFixed(2));
  const totalCartCount = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const handleConfirm = () => {
    if (!validateForm()) return;
    if (hasMoqViolation) return;
    if (hasInventoryViolation) return;

    let orderListText = '';
    cartItems.forEach((item, index) => {
      const commentText = itemComments[index] ? ` (Note: "${itemComments[index]}")` : '';
      const effectivePrice = getEffectivePrice(item, item.quantity, cartItems);

      if (item.priceMode === 'perSet') {
        const packName = item.setName || `Set of ${item.setQuantity} Pieces`;
        orderListText += `${index + 1}. *${item.name}*\n` +
          `   - Pack Type: ${packName}\n` +
          `   - Qty: ${item.quantity} ${item.quantity === 1 ? 'Set' : 'Sets'} (Total: ${Number(item.quantity || 0) * Number(item.setQuantity || 0)} Pieces)\n` +
          `   - Rate: ${currencySymbol}${effectivePrice} / Set${commentText}\n` +
          `   - Subtotal: ${currencySymbol}${(effectivePrice * item.quantity).toFixed(2)}\n`;
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
        orderListText += `${index + 1}. *${item.name}* (Qty: ${item.quantity}${detailsStr})${commentText} - ${currencySymbol}${(effectivePrice * item.quantity).toFixed(2)}\n`;
      }
    });

    const orderLink = `${window.location.origin}${window.location.pathname}`;
    const parsedTemplateMessage = compileTemplate(orderConfirmText, {
      order_id: '{order_id}',
      total: `${currencySymbol}${totalAmount.toFixed(2)}`,
      link: '{link}',
    });

    onConfirmOrder({
      customer,
      items: cartItems.map((item, idx) => ({
        ...item,
        price: getEffectivePrice(item, item.quantity, cartItems),
        comment: itemComments[idx],
      })),
      subtotal,
      discount: totalSavings,
      tax,
      total: totalAmount,
      whatsappTemplate: orderConfirmText,
      whatsappMsg: parsedTemplateMessage,
      whatsappVars: {
        total: `${currencySymbol}${totalAmount.toFixed(2)}`,
        link: orderLink,
        order_id: '{order_id}',
      },
      orderSummaryText: orderListText,
    });
  };

  const handleChatNow = () => {
    const rawPhone = whatsappTargetPhone || resellerPhone || '919876543210';
    const sanitizedPhone = rawPhone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent('Hello! I have a question about the products.');
    window.open(`https://wa.me/${sanitizedPhone}?text=${msg}`, '_blank');
  };

  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '60vh' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
          <ArrowLeft size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t('cart_empty')}</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '360px' }}>
          Add some products from the catalog to proceed with checkout.
        </p>
        <button onClick={onBackToStore} className="btn btn-primary" style={{ marginTop: '12px' }}>
          Back to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '24px 16px', maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBackToStore} style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('shopping_cart')}</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t('checkout')}</h2>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: '1.5px solid var(--accent-light)', background: 'var(--accent-light)' }}>
        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '-0.02em' }}>{currencySymbol} {totalAmount.toFixed(2)}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px' }}>{totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t('have_question')}</h4>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{t('chat_whatsapp')}</p>
        </div>
        <button onClick={handleChatNow} className="btn btn-secondary" style={{ backgroundColor: '#e8f7ed', color: '#25D366', borderColor: '#ccefd8', fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
          <MessageCircle size={16} fill="#25D366" color="white" />
          {t('chat_now').toUpperCase()}
        </button>
      </div>

      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>Your order items</h3>
        {hasInventoryViolation && (
          <div style={{ marginBottom: '14px', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(220, 38, 38, 0.35)', backgroundColor: 'rgba(220, 38, 38, 0.10)', color: '#dc2626', fontSize: '0.8rem', fontWeight: 700 }}>
            {inventoryViolations.map((violation, idx) => (
              <div key={`${violation.label}-${idx}`}>{violation.label}: requested {violation.required}, available {violation.available}</div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {cartItems.map((item, idx) => {
            const effectivePrice = getEffectivePrice(item, item.quantity, cartItems);
            const originalPrice = Number(item.originalPrice || item.price || 0);
            const savings = originalPrice - effectivePrice;
            const savingsPct = originalPrice ? Math.round((savings / originalPrice) * 100) : 0;
            const minimumOrderQty = Math.max(1, Number(item.minimumOrderQty) || 1);
            const belowMoq = Number(item.quantity) < minimumOrderQty;

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: idx < cartItems.length - 1 ? '1px solid var(--border-color)' : 'none', paddingBottom: idx < cartItems.length - 1 ? '20px' : '0' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80'; }}
                  />

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.name}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.priceMode === 'perSet' ? (
                        <>
                          <span>Pack : <strong style={{ color: 'var(--text-primary)' }}>{item.setName || `Set of ${item.setQuantity} pcs`}</strong></span>
                          <span>Total Units : <strong style={{ color: 'var(--text-primary)' }}>{Number(item.quantity || 0) * Number(item.setQuantity || 0)} pieces</strong></span>
                        </>
                      ) : (
                        <>
                          {item.selectedSize && item.selectedSize !== 'One Size' && <span>Sizes : <strong style={{ color: 'var(--text-primary)' }}>{item.selectedSize}</strong></span>}
                          {item.selectedColor && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              Colors :
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.selectedColor.hex, display: 'inline-block', border: item.selectedColor.name.toLowerCase() === 'white' ? '1px solid var(--border-color)' : 'none' }} />
                              <strong style={{ color: 'var(--text-primary)' }}>{item.selectedColor.name}</strong>
                            </span>
                          )}
                          {item.selectedOptions && Object.entries(item.selectedOptions).map(([key, val]) => (
                            <span key={key}>{key} : <strong style={{ color: 'var(--text-primary)' }}>{val}</strong></span>
                          ))}
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                        <button onClick={() => onUpdateQty(idx, Math.max(1, item.quantity - 1))} style={{ padding: '4px 10px', color: 'var(--text-secondary)' }}>
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, width: '45px', textAlign: 'center', color: 'var(--text-primary)' }}>
                          {item.quantity} {item.priceMode === 'perSet' ? 'Sets' : ''}
                        </span>
                        <button onClick={() => onUpdateQty(idx, item.quantity + 1)} style={{ padding: '4px 10px', color: 'var(--text-secondary)' }}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <button onClick={() => onRemoveItem(idx)} style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>{currencySymbol}{(originalPrice * item.quantity).toFixed(2)}</span>
                    {savings > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>({savingsPct}% off)</span>}
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{currencySymbol}{(effectivePrice * item.quantity).toFixed(2)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>+ {item.gstRate || item.gst_rate || 0}% tax</span>
                  </div>
                </div>

                {belowMoq && (
                  <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700 }}>
                    {t('min_order_warning').replace('{qty}', String(minimumOrderQty))}
                  </div>
                )}

                <div style={{ position: 'relative', marginTop: '4px' }}>
                  <input
                    type="text"
                    placeholder="Type a message or instruction for this item..."
                    value={itemComments[idx] || ''}
                    onChange={(e) => handleCommentChange(idx, e.target.value)}
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.8rem', paddingLeft: '36px', backgroundColor: 'var(--bg-tertiary)', borderStyle: 'dashed' }}
                  />
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>✎</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
          <button onClick={handleApplyCoupon} className="btn btn-outline" style={{ padding: '0 16px', height: '40px', fontSize: '0.85rem' }}>
            Apply
          </button>
        </div>
        {couponError && <span style={{ color: 'var(--danger)', fontSize: '0.78rem', fontWeight: 600 }}>{couponError}</span>}
        {couponSuccess && <span style={{ color: 'var(--success)', fontSize: '0.78rem', fontWeight: 600 }}>{couponSuccess}</span>}
      </div>

      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t('delivery_details')}</h3>
        <div className="form-group" style={{ marginBottom: '8px' }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>{t('full_name')} *</label>
          <input type="text" name="name" value={customer.name} onChange={handleCustomerChange} placeholder="Enter your name" className="form-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} />
          {formErrors.name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.name}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: '8px' }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>{t('phone_number')} *</label>
          <input type="text" name="phone" value={customer.phone} onChange={handleCustomerChange} placeholder="e.g. +91 98765 43210" className="form-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} />
          {formErrors.phone && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.phone}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: '0' }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>{t('delivery_address')} *</label>
          <textarea name="address" value={customer.address} onChange={handleCustomerChange} placeholder="Street, City, Zip Code" className="form-input" rows="2" style={{ padding: '10px 14px', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }} />
          {formErrors.address && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.address}</span>}
        </div>

        {storePolicies?.trim() ? (
          <div style={{ marginTop: '4px', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowPolicies((prev) => !prev)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Store Terms & Policies</span>
              <span>{showPolicies ? 'Hide' : 'View'}</span>
            </button>
            {showPolicies ? (
              <div style={{ padding: '10px 12px', background: 'var(--card-bg)', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {storePolicies}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
          <span>{t('subtotal')}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currencySymbol}{subtotal.toFixed(2)}</span>
        </div>
        {totalSavings > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.925rem', color: 'var(--danger)' }}>
            <span>
              Discount
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{subtotal > 0 ? ((totalSavings / subtotal) * 100).toFixed(0) : 0}% savings</span>
            </span>
            <span style={{ fontWeight: 700 }}>- {currencySymbol}{totalSavings.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
          <span>
            Tax
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>GST</span>
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currencySymbol}{roundedTax.toFixed(2)}</span>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          <span>{t('total')}</span>
          <span style={{ color: 'var(--accent-primary)', fontSize: '1.25rem' }}>{currencySymbol}{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '16px 24px', display: 'flex', justifyContent: 'center', zIndex: 150 }}>
        <button
          onClick={handleConfirm}
          className="btn btn-primary checkout-confirm-btn"
          disabled={hasMoqViolation || hasInventoryViolation}
          style={{ width: '100%', maxWidth: '700px', height: '50px', fontSize: '1rem', fontWeight: 800, borderRadius: '12px', backgroundColor: '#000000', backgroundImage: 'none', color: '#ffffff', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', transition: 'var(--transition-smooth)', opacity: hasMoqViolation || hasInventoryViolation ? 0.55 : 1, cursor: hasMoqViolation || hasInventoryViolation ? 'not-allowed' : 'pointer' }}
        >
          <span style={{ letterSpacing: '0.03em' }}>{t('confirm_order').toUpperCase()}</span>
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