import React from 'react';
import { Star, Eye, Plus } from 'lucide-react';

export default function ProductCard({ product, onViewDetails, onQuickAdd }) {
  // Calculate discount percentage safely
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const isOutOfStock = product.tag?.toLowerCase() === 'out of stock';

  // Helper for tag style
  const getTagStyle = (tag) => {
    switch (tag.toLowerCase()) {
      case 'best seller':
        return { background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' };
      case 'new arrival':
        return { background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' };
      case 'sale':
      case 'out of stock':
        return { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' };
      default:
        return { background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' };
    }
  };

  return (
    <div className="glass-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Product Image Container */}
      <div style={{ position: 'relative', overflow: 'hidden', paddingBottom: '100%', background: 'var(--bg-tertiary)' }}>
        {product.tag && (
          <span
            className="badge"
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 10,
              fontWeight: 700,
              fontSize: '0.65rem',
              ...getTagStyle(product.tag)
            }}
          >
            {product.tag}
          </span>
        )}

        {discount > 0 && (
          <span
            className="badge badge-danger"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 10,
              fontWeight: 700,
              fontSize: '0.65rem'
            }}
          >
            -{discount}% OFF
          </span>
        )}

        {/* Product Image */}
        <img
          src={product.image}
          alt={product.name}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="product-card-img"
          onError={(e) => {
            // Fallback for missing local images
            e.target.src = `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80`;
          }}
        />

        {/* Hover Action Overlay */}
        <div
          className="product-card-overlay"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)',
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            opacity: 0,
            transform: 'translateY(10px)',
            transition: 'var(--transition-smooth)',
            zIndex: 15
          }}
        >
          <button
            onClick={() => onViewDetails(product)}
            className="btn btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255,255,255,0.95)',
              color: '#0f172a',
              fontWeight: 600
            }}
          >
            <Eye size={14} />
            Quick View
          </button>
          
          <button
            onClick={() => !isOutOfStock && onQuickAdd(product)}
            disabled={isOutOfStock}
            className="btn btn-primary"
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              opacity: isOutOfStock ? 0.5 : 1,
              cursor: isOutOfStock ? 'not-allowed' : 'pointer'
            }}
          >
            <Plus size={14} />
            {isOutOfStock ? 'Sold Out' : 'Add'}
          </button>
        </div>
      </div>

      {/* Info Container */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* Category & Rating */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {product.category}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Star size={12} fill="var(--warning)" color="var(--warning)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{product.rating}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({product.reviewsCount})</span>
          </div>
        </div>

        {/* Product Title */}
        <h4
          onClick={() => onViewDetails(product)}
          style={{
            fontSize: '0.98rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            transition: 'var(--transition-fast)'
          }}
          className="product-title"
        >
          {product.name}
        </h4>

        {/* Color and Size Previews */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0', gap: '8px' }}>
          {/* Colors */}
          <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
            {product.colors.map((c) => (
              <span
                key={c.name}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: c.hex,
                  border: c.name.toLowerCase() === 'white' ? '1px solid var(--border-color)' : 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
                title={c.name}
              />
            ))}
          </div>
          {/* Sizes */}
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)', 
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'right',
            flex: 1
          }}>
            {product.priceMode === 'perSet'
              ? (product.setName || `Set of ${product.setQuantity || 0} pcs`)
              : (product.sizes && product.sizes.length > 0
                ? (product.sizes.length === 1 && product.sizes[0] === 'One Size' ? 'OS' : product.sizes.join(', '))
                : '')
            }
          </div>
        </div>

        {/* Price Tag */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: 'auto', paddingTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              ₹{product.price}{product.priceMode === 'perSet' ? ' / Set' : ''}
            </span>
            {product.originalPrice > product.price && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                ₹{product.originalPrice}{product.priceMode === 'perSet' ? ' / Set' : ''}
              </span>
            )}
          </div>
          {product.priceMode === 'perSet' && product.setQuantity && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              (₹{(product.price / product.setQuantity).toFixed(0)} / piece)
            </span>
          )}
        </div>

      </div>

      {/* Global hover scripts style overrides */}
      <style>{`
        .glass-card:hover .product-card-img {
          transform: scale(1.08) !important;
        }
        .glass-card:hover .product-card-overlay {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .product-title:hover {
          color: var(--accent-primary) !important;
        }
      `}</style>
    </div>
  );
}
