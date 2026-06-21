import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Minus, Info } from 'lucide-react';
import { getEffectivePrice } from '../services/pricing';

export default function ProductDrawer({ isOpen, onClose, product, onAddToCart, whatsappTargetPhone = '' }) {
  if (!product) return null;

  const sizeOptions = product.sizeOptions && product.sizeOptions.length > 0
    ? product.sizeOptions
    : (product.sizes && product.sizes.length > 0
      ? product.sizes.map((size) => ({ label: size, isSet: false, setQuantity: 1 }))
      : []);

  const [selectedColor, setSelectedColor] = useState(product.colors && product.colors.length > 0 ? product.colors[0] : null);
  const [selectedSize, setSelectedSize] = useState(sizeOptions.length > 0 ? sizeOptions[0] : null);
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
  const minimumOrderQty = Math.max(1, Number(product.minimumOrderQty) || 1);
  const [quantity, setQuantity] = useState(minimumOrderQty);
  const [matrixQuantities, setMatrixQuantities] = useState({});

  // Sync quantity if product changes
  useEffect(() => {
    setQuantity(minimumOrderQty);
  }, [product]);
  const [activeImage, setActiveImage] = useState(product.image);

  // Sync state when product changes
  useEffect(() => {
    setSelectedColor(product.colors && product.colors.length > 0 ? product.colors[0] : null);
    setSelectedSize(sizeOptions.length > 0 ? sizeOptions[0] : null);
    
    const initialOptions = {};
    if (product.options) {
      Object.entries(product.options).forEach(([key, values]) => {
        if (values && values.length > 0) {
          initialOptions[key] = values[0];
        }
      });
    }
    setSelectedOptions(initialOptions);
    
    setQuantity(minimumOrderQty);
    setMatrixQuantities({});
    setActiveImage(product.image);
  }, [product]);

  const selectedSetQuantity = product.priceMode !== 'perSet' && selectedSize?.isSet
    ? Math.max(1, Number(selectedSize.setQuantity || 1))
    : 1;
  const displayPrice = Number((Number(product.price || 0) * selectedSetQuantity).toFixed(2));
  const displayOriginalPrice = Number((Number(product.originalPrice || product.price || 0) * selectedSetQuantity).toFixed(2));
  const selectedPriceProduct = selectedSetQuantity > 1
    ? {
        ...product,
        price: displayPrice,
        originalPrice: displayOriginalPrice,
      }
    : product;

  const isB2BMatrix = product.priceMode !== 'perSet' && product.colors && product.colors.length > 0 && product.sizes && product.sizes.length > 0;
  const volumeDiscountRows = (Array.isArray(product.bulkDiscounts) ? product.bulkDiscounts : [])
    .map((row) => ({
      minQty: Number(row.min_qty ?? row.minQty ?? 0),
      maxQty: row.max_qty ?? row.maxQty ?? null,
      discountedPrice: row.discounted_price ?? row.discountedPrice ?? null,
      discountPercent: row.discount_percent ?? row.discountPercent ?? null,
    }))
    .filter((row) => {
      const minQtyValid = Number.isFinite(row.minQty) && row.minQty > 0;
      if (!minQtyValid) return false;
      const basePrice = Number(product.price || 0);
      if (row.discountedPrice != null) {
        return Number(row.discountedPrice) < basePrice;
      }
      if (row.discountPercent != null) {
        return Number(row.discountPercent) > 0;
      }
      return false;
    })
    .sort((a, b) => a.minQty - b.minQty);

  const getAvailableInventoryForCombo = (sizeOptionId, colorOptionId) => {
    const rows = Array.isArray(product.inventoryItems) ? product.inventoryItems : [];
    if (rows.length === 0) {
      return Number.POSITIVE_INFINITY;
    }
    const match = rows.find((row) => {
      const sizeMatch = (row.sizeOptionId ?? null) === (sizeOptionId ?? null);
      const colorMatch = (row.colorOptionId ?? null) === (colorOptionId ?? null);
      return sizeMatch && colorMatch;
    });
    return Number(match?.quantity || 0);
  };

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
    const effectivePiecePrice = getEffectivePrice(product, totalQuantity);

    for (const color of product.colors) {
      for (const size of sizeOptions) {
        const qty = matrixQuantities[`${color.name}_${size.label}`] || 0;
        if (qty <= 0) continue;

        const available = getAvailableInventoryForCombo(size.optionId ?? null, color.optionId ?? null);
        if (available >= 0 && qty > available) {
          alert(`Only ${available} available for ${color.name} / ${size.label}. Please reduce quantity.`);
          return;
        }
      }
    }

    product.colors.forEach(color => {
      sizeOptions.forEach(size => {
        const qty = matrixQuantities[`${color.name}_${size.label}`] || 0;
        if (qty > 0) {
          const setQty = size.isSet ? Math.max(1, Number(size.setQuantity || 1)) : 1;
          const rowPrice = Number((effectivePiecePrice * setQty).toFixed(2));
          const rowOriginalPrice = Number((Number(product.price || 0) * setQty).toFixed(2));

          onAddToCart({
            ...product,
            selectedColor: color,
            selectedSize: size.label,
            selectedSizeOption: size,
            selectedSetQuantity: setQty,
            selectedOptions: {},
            price: rowPrice,
            originalPrice: rowOriginalPrice,
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
      sizeOptions.forEach(size => {
        const qty = matrixQuantities[`${color.name}_${size.label}`] || 0;
        if (qty > 0) {
          sizeList.push(`${qty} ${size.label}`);
        }
      });
      if (sizeList.length > 0) {
        breakdown += `• *${color.name}*: ${sizeList.join(', ')}\n`;
      }
    });

    const quoteMsg = `Hi! I would like to request a quote for the following bulk order of *${product.name}*:\n\n${breakdown}\n*Total Quantity*: ${totalQuantity} ${totalQuantity === 1 ? unitName : unitName + 's'}\n*Estimated Total*: ₹${totalAfterDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${discountAmount > 0 ? ` (with ${appliedDiscountPercent}% bulk discount applied)` : ''}\n\nPlease let me know the best pricing and delivery timeframe.`;
    
    const quotePhone = (whatsappTargetPhone || '919876543210').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${quotePhone}?text=${encodeURIComponent(quoteMsg)}`, '_blank');
  };

  const renderB2BMatrix = () => {
    return (
      <div className="b2b-matrix-card">
        <h4 className="b2b-matrix-title">B2B Bulk Order Matrix</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginTop: '-12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Unit: <strong>{product.unitType || 'piece'}</strong>
          </span>
          <span className="b2b-matrix-scroll-hint">
            ← Scroll horizontally for sizes →
          </span>
        </div>
        <div className="b2b-matrix-table-wrap">
          <table className="b2b-matrix-table">
            <thead>
              <tr>
                <th>Colors</th>
                {sizeOptions.map(size => (
                  <th key={size.label} style={{ textAlign: 'center' }}>{size.label}</th>
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
                  {sizeOptions.map(size => {
                    const cellKey = `${color.name}_${size.label}`;
                    const qty = matrixQuantities[cellKey] || 0;
                    return (
                      <td key={size.label} style={{ textAlign: 'center' }}>
                        <div className="b2b-matrix-stepper" style={{ margin: '0 auto' }}>
                          <button
                            type="button"
                            className="b2b-matrix-stepper-btn"
                            onClick={() => handleDecrement(color.name, size.label)}
                          >
                            <Minus size={10} />
                          </button>
                          <input
                            type="text"
                            className="b2b-matrix-stepper-input"
                            value={qty || 0}
                            onChange={(e) => handleCellChange(color.name, size.label, e.target.value)}
                          />
                          <button
                            type="button"
                            className="b2b-matrix-stepper-btn"
                            onClick={() => handleIncrement(color.name, size.label)}
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

        {/* Mobile View Stacked List/Grid */}
        <div className="b2b-matrix-list-wrap">
          {product.colors.map(color => (
            <div key={color.name} className="b2b-matrix-color-section">
              <div className="b2b-matrix-color-header">
                <span className="b2b-matrix-color-dot" style={{ backgroundColor: color.hex }} />
                <span>{color.name}</span>
              </div>
              <div className="b2b-matrix-sizes-grid">
                {sizeOptions.map(size => {
                  const cellKey = `${color.name}_${size.label}`;
                  const qty = matrixQuantities[cellKey] || 0;
                  return (
                    <div key={size.label} className="b2b-matrix-size-row">
                      <span className="b2b-matrix-size-label">{size.label}</span>
                      <div className="b2b-matrix-stepper">
                        <button
                          type="button"
                          className="b2b-matrix-stepper-btn"
                          onClick={() => handleDecrement(color.name, size.label)}
                        >
                          <Minus size={10} />
                        </button>
                        <input
                          type="text"
                          className="b2b-matrix-stepper-input"
                          value={qty || 0}
                          onChange={(e) => handleCellChange(color.name, size.label, e.target.value)}
                        />
                        <button
                          type="button"
                          className="b2b-matrix-stepper-btn"
                          onClick={() => handleIncrement(color.name, size.label)}
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
    const selectedSizeOptionId = selectedSize?.optionId ?? null;
    const selectedColorOptionId = selectedColor?.optionId ?? null;
    const available = getAvailableInventoryForCombo(selectedSizeOptionId, selectedColorOptionId);
    if (available >= 0 && quantity > available) {
      const sizeLabel = selectedSize?.label || 'Default';
      const colorLabel = selectedColor?.name || 'Default';
      alert(`Only ${available} available for ${colorLabel} / ${sizeLabel}. Please reduce quantity.`);
      return;
    }

    onAddToCart({
      ...selectedPriceProduct,
      selectedColor: product.priceMode === 'perSet' ? null : selectedColor,
      selectedSize: product.priceMode === 'perSet' ? null : selectedSize?.label,
      selectedSizeOption: product.priceMode === 'perSet' ? null : selectedSize,
      selectedSetQuantity: product.priceMode === 'perSet' ? (product.setQuantity || 1) : selectedSetQuantity,
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
                ₹{displayPrice} / {product.priceMode === 'perSet' ? 'Set' : (selectedSize?.isSet ? 'Pack' : (product.unitType || 'piece'))}
              </span>
              {displayOriginalPrice > displayPrice && (
                <>
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                    ₹{displayOriginalPrice} / {product.priceMode === 'perSet' ? 'Set' : (selectedSize?.isSet ? 'Pack' : (product.unitType || 'piece'))}
                  </span>
                  <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                    Save ₹{(displayOriginalPrice - displayPrice).toFixed(2)}
                  </span>
                </>
              )}
            </div>
            {product.priceMode === 'perSet' && product.setQuantity && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                ₹{(product.price / product.setQuantity).toFixed(2)} / piece · Pack: {product.setName || `${product.setQuantity} Pieces`}
              </span>
            )}
            {product.priceMode !== 'perSet' && selectedSize?.isSet && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Pack of {selectedSetQuantity} · ₹{Number(product.price || 0).toFixed(2)} / piece
              </span>
            )}
          </div>

          {volumeDiscountRows.length > 0 && (
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                Volume Discount Tiers
              </span>
              {volumeDiscountRows.map((tier, index) => {
                const maxQty = tier.maxQty == null || String(tier.maxQty).trim() === '' ? null : Number(tier.maxQty);
                const rawDiscountPrice = Number(tier.discountedPrice);
                const discountPrice = (product.priceMode === 'perSet' && product.setQuantity)
                  ? (rawDiscountPrice / product.setQuantity)
                  : rawDiscountPrice;
                const rangeLabel = Number.isFinite(maxQty)
                  ? `${tier.minQty} - ${maxQty}`
                  : `${tier.minQty}+`;

                return (
                  <div key={`${tier.minQty}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Buy {rangeLabel}</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>₹{discountPrice.toFixed(2)} each</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Variant: Colors */}
          {!isB2BMatrix && product.priceMode !== 'perSet' && product.colors && product.colors.length > 0 && (
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
          {!isB2BMatrix && product.priceMode !== 'perSet' && sizeOptions.length > 0 && (
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Select Size: {selectedSize ? <strong style={{ color: 'var(--text-primary)' }}>{selectedSize.isSet ? `${selectedSize.label} · Pack of ${selectedSetQuantity}` : selectedSize.label}</strong> : null}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {sizeOptions.map((size) => {
                  const isSelected = selectedSize?.label === size.label;
                  return (
                    <button
                      key={size.label}
                      onClick={() => setSelectedSize(size)}
                      className={`size-pill ${isSelected ? 'selected' : ''}`}
                      style={{ minWidth: '48px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {size.isSet ? `${size.label} · ${size.setQuantity}` : size.label}
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
                    onClick={() => setQuantity(Math.max(minimumOrderQty, quantity - 1))}
                    style={{ padding: '10px 14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ width: '80px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {quantity} {product.priceMode === 'perSet' ? (quantity === 1 ? 'Set' : 'Sets') : (quantity === 1 ? 'pc' : 'pcs')}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.max(minimumOrderQty, quantity + 1))}
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
                : `Add to Cart — ₹${(getEffectivePrice(selectedPriceProduct, quantity) * quantity).toFixed(2)}`}
            </button>
          </div>
        )}

      </div>
    </>
  );
}
