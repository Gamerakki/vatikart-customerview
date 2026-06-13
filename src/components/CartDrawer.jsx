import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onCheckoutInvoice
}) {
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = Number((subtotal * 0.05).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
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
              {/* Product list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cartItems.map((item, idx) => (
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
                            onClick={() => onUpdateQty(idx, item.quantity - 1)}
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
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
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
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span>GST (5%)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{tax.toFixed(2)}</span>
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
