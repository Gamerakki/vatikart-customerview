import React, { useEffect, useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight, AlarmClock } from 'lucide-react';
import { getEffectivePrice, getProductGstAmount } from '../services/pricing';

const CART_HOLD_KEY = 'vatikart_cart_hold_expires';
const CART_HOLD_MINUTES = 15;

function initCartHold() {
  const existing = sessionStorage.getItem(CART_HOLD_KEY);
  if (existing && Number(existing) > Date.now()) return;
  sessionStorage.setItem(CART_HOLD_KEY, String(Date.now() + CART_HOLD_MINUTES * 60 * 1000));
}

function getSecondsLeft() {
  const expires = Number(sessionStorage.getItem(CART_HOLD_KEY) || '0');
  return Math.max(0, Math.floor((expires - Date.now()) / 1000));
}

function formatCountdown(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getNextBulkDiscount(item) {
  if (!item.bulkDiscounts || item.bulkDiscounts.length === 0) {
    return null;
  }

  const quantity = Number(item.quantity) || 0;
  const slabs = [...item.bulkDiscounts]
    .map((slab) => ({
      ...slab,
      minQty: Number(slab.min_qty) || 0,
      maxQty: slab.max_qty != null ? Number(slab.max_qty) : null,
    }))
    .filter((slab) => {
      const minQtyValid = slab.minQty > 0;
      if (!minQtyValid) return false;
      const basePrice = Number(item.price || 0);
      if (slab.discounted_price != null) {
        return Number(slab.discounted_price) < basePrice;
      }
      if (slab.discount_percent != null) {
        return Number(slab.discount_percent) > 0;
      }
      return false;
    })
    .sort((a, b) => a.minQty - b.minQty);

  return slabs.find((slab) => quantity < slab.minQty) || null;
}

function getSlabTargetPrice(item, slab) {
  if (!slab) {
    return 0;
  }

  if (slab.discounted_price != null) {
    return Number(slab.discounted_price) || 0;
  }

  if (slab.discount_percent != null) {
    return (Number(item.price) || 0) * (1 - Number(slab.discount_percent) / 100);
  }

  return Number(item.price) || 0;
}

function getSlabUnitLabel(item) {
  if (item.priceMode === 'perSet') {
    return '/set';
  }
  if (item.selectedSizeOption?.isSet) {
    return '/pack';
  }
  return item.unitType ? `/${item.unitType}` : '/pc';
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onCheckoutInvoice,
  onClearCart,
}) {
  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft);
  const [holdExpired, setHoldExpired] = useState(false);

  // Start/refresh the hold timer whenever items enter the cart
  useEffect(() => {
    if (cartItems.length > 0) {
      initCartHold();
      setSecondsLeft(getSecondsLeft());
      setHoldExpired(false);
    }
  }, [cartItems.length]);

  // Tick the countdown every second while the cart has items
  useEffect(() => {
    if (cartItems.length === 0) return;
    const id = setInterval(() => {
      const secs = getSecondsLeft();
      setSecondsLeft(secs);
      if (secs === 0) {
        clearInterval(id);
        setHoldExpired(true);
        sessionStorage.removeItem(CART_HOLD_KEY);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [cartItems.length]);

  // Show expiry modal and clear cart when timer hits zero
  useEffect(() => {
    if (holdExpired && cartItems.length > 0) {
      if (onClearCart) onClearCart();
    }
  }, [holdExpired]);

  const subtotal = cartItems.reduce((acc, item) => {
    const effectivePrice = getEffectivePrice(item, item.quantity, cartItems);
    return acc + (effectivePrice * item.quantity);
  }, 0);
  const tax = cartItems.reduce((acc, item) => {
    const effectivePrice = getEffectivePrice(item, item.quantity, cartItems);
    return acc + getProductGstAmount(item, effectivePrice, item.quantity);
  }, 0);
  const roundedSubtotal = Number(subtotal.toFixed(2));
  const roundedTax = Number(tax.toFixed(2));
  const total = Number((roundedSubtotal + roundedTax).toFixed(2));
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`drawer-content ${isOpen ? 'active' : ''}`} style={{ maxWidth: '440px' }}>

        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Your Cart
            </h3>
            <span style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '999px',
              padding: '2px 8px',
              minWidth: '22px',
              textAlign: 'center'
            }}>
              {totalCount}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>

          {cartItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '60px 0', flex: 1 }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-tertiary)'
              }}>
                <ShoppingCart size={32} />
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Your cart is empty</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '260px' }}>
                Add some items from the catalog to get started!
              </p>
              <button onClick={onClose} className="btn btn-primary" style={{ marginTop: '8px' }}>
                Start Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Cart Hold countdown banner */}
              {secondsLeft > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <AlarmClock size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>
                    Stock reserved for {formatCountdown(secondsLeft)}. Complete checkout to secure your items.
                  </span>
                </div>
              )}

              {holdExpired && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <AlarmClock size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b' }}>
                    Your cart hold has expired. Inventory released.
                  </span>
                </div>
              )}

              {/* Product list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cartItems.map((item, idx) => (
                  (() => {
                    const nextSlab = getNextBulkDiscount(item);
                    const slabTarget = nextSlab?.minQty || 0;
                    const progressValue = slabTarget > 0 ? Math.min((item.quantity / slabTarget) * 100, 100) : 0;
                    const itemsLeft = slabTarget > 0 ? Math.max(slabTarget - item.quantity, 0) : 0;
                    const targetPrice = nextSlab ? getSlabTargetPrice(item, nextSlab) : 0;

                    return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      position: 'relative'
                    }}
                  >
                    {/* Product Image */}
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: '68px', height: '68px', objectFit: 'cover', borderRadius: '8px', background: 'var(--bg-tertiary)', flexShrink: 0 }}
                      onError={(e) => {
                        e.target.src = `https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80`;
                      }}
                    />

                    {/* Info */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', paddingRight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </h4>

                      {/* Variant tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {item.priceMode === 'perSet' ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', padding: '1px 6px', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                            {item.setName || `Set of ${item.setQuantity} pcs`} (Total: {item.quantity * item.setQuantity} pcs)
                          </span>
                        ) : (
                          <>
                            {item.selectedSize && item.selectedSize !== 'One Size' && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', padding: '1px 6px', border: '1px solid var(--border-color)' }}>
                                {item.selectedSize}
                              </span>
                            )}
                            {item.selectedColor && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', padding: '1px 6px', border: '1px solid var(--border-color)' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: item.selectedColor.hex, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
                                {item.selectedColor.name}
                              </span>
                            )}
                            {item.selectedOptions && Object.entries(item.selectedOptions).map(([key, val]) => (
                              <span key={key} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', padding: '1px 6px', border: '1px solid var(--border-color)' }}>
                                {val}
                              </span>
                            ))}
                          </>
                        )}
                      </div>

                      {/* Qty controls + price */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                          <button
                            onClick={() => {
                              const moq = Math.max(1, Number(item.minimumOrderQty) || 1);
                              if (item.quantity <= moq) {
                                // Already at minimum — do nothing, the remove button exists separately
                                return;
                              }
                              onUpdateQty(idx, Math.max(moq, item.quantity - 1));
                            }}
                            style={{ padding: '4px 9px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, width: '26px', textAlign: 'center', color: 'var(--text-primary)' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQty(idx, item.quantity + 1)}
                            style={{ padding: '4px 9px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                          ₹{(getEffectivePrice(item, item.quantity, cartItems) * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      {Number(item.minimumOrderQty) > 1 && (
                        <div style={{
                          marginTop: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.69rem',
                          fontWeight: 700,
                          color: '#f59e0b',
                        }}>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            backgroundColor: '#f59e0b', flexShrink: 0
                          }} />
                          Min order: {item.minimumOrderQty} {item.priceMode === 'perSet' ? 'sets' : 'pcs'}
                        </div>
                      )}

                      {nextSlab && (
                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                            <span>{item.quantity} / {slabTarget} items</span>
                            <span>Next slab</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', borderRadius: '999px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${progressValue}%`,
                                height: '100%',
                                borderRadius: '999px',
                                background: 'linear-gradient(90deg, var(--accent-primary), #34d399)'
                              }}
                            />
                          </div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', padding: '6px 10px', borderRadius: '999px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#047857', fontSize: '0.72rem', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            Add {itemsLeft} more to get wholesale price of ₹{targetPrice.toFixed(2)}{getSlabUnitLabel(item)}!
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => onRemoveItem(idx)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        color: 'var(--text-tertiary)',
                        transition: 'var(--transition-fast)'
                      }}
                      className="cart-trash-btn"
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                    );
                  })()
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="drawer-footer" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Price summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span>Subtotal ({totalCount} items)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{roundedSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span>GST Tax</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{roundedTax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', paddingTop: '4px' }}>
                <span>Total</span>
                <span style={{ color: 'var(--accent-primary)', fontSize: '1.15rem' }}>₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Single CTA - Proceed to Checkout */}
            <button
              onClick={() => {
                onClose();
                onCheckoutInvoice();
              }}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '50px',
                fontSize: '1rem',
                fontWeight: 800,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px'
              }}
            >
              <span>Proceed to Checkout</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.9rem', opacity: 0.85 }}>₹{total.toFixed(2)}</span>
                <ArrowRight size={18} />
              </div>
            </button>
          </div>
        )}

      </div>

      <style>{`
        .cart-trash-btn:hover {
          color: var(--danger) !important;
        }
      `}</style>
    </>
  );
}
