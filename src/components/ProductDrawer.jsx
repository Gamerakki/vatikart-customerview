import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Minus, Info } from 'lucide-react';
import { getEffectivePrice } from '../services/pricing';

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
  const [quantity, setQuantity] = useState(product.minimumOrderQty || 1);
  const [matrixQuantities, setMatrixQuantities] = useState({});

  // Sync quantity if product changes
  useEffect(() => {
    setQuantity(product.minimumOrderQty || 1);
  }, [product]);
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
    setMatrixQuantities({});
    setActiveImage(product.image);
  }, [product]);

  const isB2BMatrix = product.priceMode !== 'perSet' && product.colors && product.colors.length > 0 && product.sizes && product.sizes.length > 0;

  const handleCellChange = (colorName, sizeName, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setMatrixQuantities(prev => ({
      ...prev,
      [`${colorName}_${sizeName}`]: num
    }));
  };

  const handleDecrement = (colorName, sizeName) => {
    const current = matrixQuantities[`${colorName}_${sizeName}`] || 0;
    if (current > 0) {
      handleCellChange(colorName, sizeName, current - 1);
    }
  };

  const handleIncrement = (colorName, sizeName) => {
    const current = matrixQuantities[`${colorName}_${sizeName}`] || 0;
    handleCellChange(colorName, sizeName, current + 1);
  };

  const totalQuantity = Object.values(matrixQuantities).reduce((sum, qty) => sum + qty, 0);
  const effectiveUnitPrice = getEffectivePrice(product, totalQuantity);
  const totalBeforeDiscount = product.price * totalQuantity;
  const totalAfterDiscount = effectiveUnitPrice * totalQuantity;
  const discountAmount = totalBeforeDiscount - totalAfterDiscount;
  const appliedDiscountPercent = product.price > 0 ? Math.round(((product.price - effectiveUnitPrice) / product.price) * 100) : 0;

  const handleAddBulk = () => {
    product.colors.forEach(color => {
      product.sizes.forEach(size => {
        const qty = matrixQuantities[`${color.name}_${size}`] || 0;
        if (qty > 0) {
          onAddToCart({
            ...product,
            selectedColor: color,
            selectedSize: size,
            selectedOptions: {},
            quantity: qty
          });
        }
      });
    });
    onClose();
  };

  const handleRequestQuote = () => {
    let breakdown = '';
    const unitName = product.unitType || 'piece';
    product.colors.forEach(color => {
      const sizeList = [];
      product.sizes.forEach(size => {
        const qty = matrixQuantities[`${color.name}_${size}`] || 0;
        if (qty > 0) {
          sizeList.push(`${qty} ${size}`);
        }
      });
      if (sizeList.length > 0) {
        breakdown += `• *${color.name}*: ${sizeList.join(', ')}\n`;
      }
    });

    const quoteMsg = `Hi! I would like to request a quote for the following bulk order of *${product.name}*:\n\n${breakdown}\n*Total Quantity*: ${totalQuantity} ${totalQuantity === 1 ? unitName : unitName + 's'}\n*Estimated Total*: ₹${totalAfterDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${discountAmount > 0 ? ` (with ${appliedDiscountPercent}% bulk discount applied)` : ''}\n\nPlease let me know the best pricing and delivery timeframe.`;
    
    window.open(`https://wa.me/919876543210?text=${encodeURIComponent(quoteMsg)}`, '_blank');
  };

  const renderB2BMatrix = () => {
    return (
      <div className="b2b-matrix-card">
        <h4 className="b2b-matrix-title">B2B Bulk Order Matrix</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginTop: '-12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Unit: <strong>{product.unitType || 'piece'}</strong>
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Scroll horizontally for sizes →
          </span>
        </div>
        <div className="b2b-matrix-table-wrap">
          <table className="b2b-matrix-table">
            <thead>
              <tr>
                <th>Colors</th>
                {product.sizes.map(size => (
                  <th key={size} style={{ textAlign: 'center' }}>{size}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {product.colors.map(color => (
                <tr key={color.name}>
                  <td>
                    <div className="b2b-matrix-color-cell">
                      <span className="b2b-matrix-color-dot" style={{ backgroundColor: color.hex }} />
                      <span>{color.name}</span>
                    </div>
                  </td>
                  {product.sizes.map(size => {
                    const cellKey = `${color.name}_${size}`;
                    const qty = matrixQuantities[cellKey] || 0;
                    return (
                      <td key={size} style={{ textAlign: 'center' }}>
                        <div className="b2b-matrix-stepper" style={{ margin: '0 auto' }}>
                          <button
                            type="button"
                            className="b2b-matrix-stepper-btn"
                            onClick={() => handleDecrement(color.name, size)}
                          >
                            <Minus size={10} />
                          </button>
                          <input
                            type="text"
                            className="b2b-matrix-stepper-input"
                            value={qty || 0}
                            onChange={(e) => handleCellChange(color.name, size, e.target.value)}
                          />
                          <button
                            type="button"
                            className="b2b-matrix-stepper-btn"
                            onClick={() => handleIncrement(color.name, size)}
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Details */}
        <div className="b2b-matrix-summary">
          <div className="b2b-matrix-summary-item">
            <span className="b2b-matrix-summary-label">Total Quantity</span>
            <span className="b2b-matrix-summary-val">
              {totalQuantity} {totalQuantity === 1 ? (product.unitType || 'piece') : ((product.unitType || 'piece') + 's')}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="b2b-matrix-summary-item">
              <span className="b2b-matrix-summary-label">Bulk Discount</span>
              <span className="b2b-matrix-summary-val b2b-matrix-summary-discount">
                {appliedDiscountPercent}% Applied (-₹{discountAmount.toFixed(2)})
              </span>
            </div>
          )}
          <div className="b2b-matrix-summary-item" style={{ textAlign: 'right' }}>
            <span className="b2b-matrix-summary-label">Total</span>
            <span className="b2b-matrix-summary-total">₹{totalAfterDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="b2b-matrix-btn-group">
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleRequestQuote}
            disabled={totalQuantity === 0}
            style={{ opacity: totalQuantity === 0 ? 0.5 : 1, cursor: totalQuantity === 0 ? 'not-allowed' : 'pointer' }}
          >
            Request Quote
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddBulk}
            disabled={totalQuantity === 0}
            style={{ opacity: totalQuantity === 0 ? 0.5 : 1, cursor: totalQuantity === 0 ? 'not-allowed' : 'pointer' }}
          >
            <ShoppingCart size={16} />
            Add Bulk to Cart
          </button>
        </div>
      </div>
    );
  };

  const handleAdd = () => {
    onAddToCart({
      ...product,
      selectedColor: product.priceMode === 'perSet' ? null : selectedColor,
      selectedSize: product.priceMode === 'perSet' ? null : selectedSize,
      selectedOptions: product.priceMode === 'perSet' ? {} : selectedOptions,
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                ₹{product.price} / {product.priceMode === 'perSet' ? 'Set' : (product.unitType || 'piece')}
              </span>
              {product.originalPrice > product.price && (
                <>
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                    ₹{product.originalPrice} / {product.priceMode === 'perSet' ? 'Set' : (product.unitType || 'piece')}
                  </span>
                  <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                    Save ₹{product.originalPrice - product.price}
                  </span>
                </>
              )}
            </div>
            {product.priceMode === 'perSet' && product.setQuantity && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                ₹{(product.price / product.setQuantity).toFixed(2)} / piece · Pack: {product.setName || `${product.setQuantity} Pieces`}
              </span>
            )}
          </div>

          {/* Variant: Colors */}
          {!isB2BMatrix && product.colors && product.colors.length > 0 && (
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
          {!isB2BMatrix && product.sizes && product.sizes.length > 0 && (
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
          {product.priceMode !== 'perSet' && product.options && Object.entries(product.options).map(([optionName, values]) => {
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

          {/* Set Composition Breakdown */}
          {product.priceMode === 'perSet' && product.setComposition && product.setComposition.length > 0 && (
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
              <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '10px' }}>
                Set Composition Breakdown
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {product.setComposition.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.color_hex && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color_hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }} />
                      )}
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {item.color_label} / Size {item.size_label}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                      {item.qty_in_set} {item.qty_in_set === 1 ? 'pc' : 'pcs'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* B2B Bulk Order Matrix */}
          {isB2BMatrix && renderB2BMatrix()}

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
          {!isB2BMatrix && (
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Quantity
              </span>
              {product.minimumOrderQty > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
                  <Info size={14} />
                  <span>Minimum order quantity: {product.minimumOrderQty} {product.priceMode === 'perSet' ? 'sets' : 'pcs'}</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', border: '1.5px solid var(--border-color)', borderRadius: 'var(--button-radius)', overflow: 'hidden', alignSelf: 'flex-start' }}>
                  <button
                    onClick={() => setQuantity(Math.max(product.minimumOrderQty || 1, quantity - 1))}
                    style={{ padding: '10px 14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ width: '80px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {quantity} {product.priceMode === 'perSet' ? (quantity === 1 ? 'Set' : 'Sets') : (quantity === 1 ? 'pc' : 'pcs')}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    style={{ padding: '10px 14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {product.priceMode === 'perSet' && product.setQuantity && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    (Total: {quantity * product.setQuantity} pieces)
                  </span>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {!isB2BMatrix && (
          <div className="drawer-footer">
            <button
              onClick={() => {
                if (product.tag?.toLowerCase() !== 'out of stock') {
                  handleAdd();
                }
              }}
              disabled={product.tag?.toLowerCase() === 'out of stock'}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                height: '48px', 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '10px', 
                fontSize: '1rem',
                opacity: product.tag?.toLowerCase() === 'out of stock' ? 0.5 : 1,
                cursor: product.tag?.toLowerCase() === 'out of stock' ? 'not-allowed' : 'pointer'
              }}
            >
              <ShoppingCart size={18} />
              {product.tag?.toLowerCase() === 'out of stock' 
                ? 'Out of Stock' 
                : `Add to Cart — ₹${(getEffectivePrice(product, quantity) * quantity).toFixed(2)}`}
            </button>
          </div>
        )}

      </div>
    </>
  );
}
