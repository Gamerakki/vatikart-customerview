import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Minus, Info } from 'lucide-react';

export default function ProductDrawer({ isOpen, onClose, product, onAddToCart }) {
  if (!product) return null;

  const [selectedColor, setSelectedColor] = useState(product.colors && product.colors.length > 0 ? product.colors[0] : null);
  const [selectedSize, setSelectedSize] = useState(product.sizes && product.sizes.length > 0 ? product.sizes[0] : null);
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const initial = {};
    if (product.options) {
      Object.entries(product.options).forEach(([key, values]) => {
        if (values && values.length > 0) {
          initial[key] = values[0];
        }
      });
    }
    return initial;
  });
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product.image);

  // Sync state when product changes
  useEffect(() => {
    setSelectedColor(product.colors && product.colors.length > 0 ? product.colors[0] : null);
    setSelectedSize(product.sizes && product.sizes.length > 0 ? product.sizes[0] : null);
    
    const initialOptions = {};
    if (product.options) {
      Object.entries(product.options).forEach(([key, values]) => {
        if (values && values.length > 0) {
          initialOptions[key] = values[0];
        }
      });
    }
    setSelectedOptions(initialOptions);
    
    setQuantity(1);
    setActiveImage(product.image);
  }, [product]);

  const handleAdd = () => {
    onAddToCart({
      ...product,
      selectedColor,
      selectedSize,
      selectedOptions,
      quantity
    });
    onClose();
  };

  const images = product.gallery || [product.image];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`drawer-content ${isOpen ? 'active' : ''}`}>
        
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Product Details
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {product.name}
            </h3>
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
        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main Showcase Image */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              width: '100%',
              height: '280px',
              borderRadius: 'var(--card-radius)',
              overflow: 'hidden',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <img
                src={activeImage}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.src = `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80`;
                }}
              />
            </div>

            {/* Gallery Thumbnails */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: activeImage === img ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      flexShrink: 0,
                      padding: 0
                    }}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - ${idx}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80`;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price Box */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              ₹{product.price}
            </span>
            {product.originalPrice > product.price && (
              <>
                <span style={{ fontSize: '1.1rem', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                  ₹{product.originalPrice}
                </span>
                <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                  Save ₹{product.originalPrice - product.price}
                </span>
              </>
            )}
          </div>

          {/* Variant: Colors */}
          {product.colors && product.colors.length > 0 && (
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Select Color: <strong style={{ color: 'var(--text-primary)' }}>{selectedColor?.name}</strong>
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                {product.colors.map((color) => {
                  const isSelected = selectedColor?.name === color.name;
                  const isWhite = color.name.toLowerCase() === 'white';
                  return (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={`color-dot ${isSelected ? 'selected' : ''} ${isWhite ? 'color-dot-white' : ''}`}
                      style={{
                        backgroundColor: color.hex,
                        width: '32px',
                        height: '32px',
                        border: isWhite ? '1.5px solid var(--border-color)' : '1px solid rgba(0,0,0,0.1)'
                      }}
                      title={color.name}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant: Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Select Size:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {product.sizes.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`size-pill ${isSelected ? 'selected' : ''}`}
                      style={{ minWidth: '48px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant: Dynamic Options */}
          {product.options && Object.entries(product.options).map(([optionName, values]) => {
            if (!values || values.length === 0) return null;
            return (
              <div key={optionName}>
                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Select {optionName}:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {values.map((val) => {
                    const isSelected = selectedOptions[optionName] === val;
                    return (
                      <button
                        key={val}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [optionName]: val }))}
                        className={`size-pill ${isSelected ? 'selected' : ''}`}
                        style={{ minWidth: '48px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Description */}
          <div>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Description
            </span>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {product.description}
            </p>
          </div>

          {/* Technical Specifications */}
          {product.specs && (
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Info size={14} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)' }}>Specifications</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{key}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Quantity
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1.5px solid var(--border-color)', borderRadius: 'var(--button-radius)', overflow: 'hidden' }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ padding: '10px 14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ width: '40px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                style={{ padding: '10px 14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="drawer-footer">
          <button
            onClick={handleAdd}
            className="btn btn-primary"
            style={{ width: '100%', height: '48px', display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '1rem' }}
          >
            <ShoppingCart size={18} />
            Add to Cart — ₹{(product.price * quantity).toFixed(2)}
          </button>
        </div>

      </div>
    </>
  );
}
