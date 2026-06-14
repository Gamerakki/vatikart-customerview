import React, { useState } from 'react';
import { Filter, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedSizes,
  onSizeToggle,
  selectedColors,
  onColorToggle,
  allTags,
  selectedTags,
  onTagToggle,
  maxPrice,
  onPriceChange,
  sortOption,
  onSortChange,
  onClearAll,
  allSizes,
  allColors
}) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  return (
    <div className="glass-card" style={{ padding: '24px', height: 'fit-content', position: 'sticky', top: '120px', transition: 'var(--transition-smooth)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Filters</h3>
        </div>
        <button
          onClick={onClearAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8rem',
            color: 'var(--accent-primary)',
            fontWeight: 600
          }}
          title="Reset all filters"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpenMobile(!isOpenMobile)}
        className="btn btn-secondary"
        style={{
          display: 'none',
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '10px 16px'
        }}
        id="mobile-filter-toggle"
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} />
          {isOpenMobile ? 'Hide Filters' : 'Show Filters'}
        </span>
        {isOpenMobile ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Filters Container (Collapsible on mobile) */}
      <div className={`filter-content ${isOpenMobile ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Sort Section */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Sort By
          </h4>
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <option value="popularity">Popularity (Best Sellers)</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>

        {/* Categories Section */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Category
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => onCategoryChange('All')}
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: selectedCategory === 'All' ? 600 : 400,
                backgroundColor: selectedCategory === 'All' ? 'var(--accent-light)' : 'transparent',
                color: selectedCategory === 'All' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'var(--transition-fast)'
              }}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: selectedCategory === cat ? 600 : 400,
                  backgroundColor: selectedCategory === cat ? 'var(--accent-light)' : 'transparent',
                  color: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  transition: 'var(--transition-fast)'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Sizes Section */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Sizes
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allSizes.map((size) => {
              const isSelected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  onClick={() => onSizeToggle(size)}
                  className={`size-pill ${isSelected ? 'selected' : ''}`}
                  style={{ minWidth: '42px', height: '42px', padding: 0 }}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Colors Section */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Colors
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {allColors.map((color) => {
              const isSelected = selectedColors.includes(color.name);
              const isWhite = color.name.toLowerCase() === 'white';
              return (
                <button
                  key={color.name}
                  onClick={() => onColorToggle(color.name)}
                  className={`color-dot ${isSelected ? 'selected' : ''} ${isWhite ? 'color-dot-white' : ''}`}
                  style={{
                    backgroundColor: color.hex,
                    border: isWhite ? '1.5px solid var(--border-color)' : '1px solid rgba(0,0,0,0.1)'
                  }}
                  title={color.name}
                />
              );
            })}
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Tags
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(allTags || []).map((tag) => {
              const isSelected = (selectedTags || []).includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onTagToggle(tag)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Max Price
            </h4>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              ₹{maxPrice}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="350"
            step="5"
            value={maxPrice}
            onChange={(e) => onPriceChange(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--accent-primary)',
              cursor: 'pointer',
              height: '6px',
              borderRadius: '3px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            <span>₹0</span>
            <span>₹350</span>
          </div>
        </div>

      </div>

      {/* Injecting responsive CSS styling dynamically inside sidebar component */}
      <style>{`
        @media (max-width: 992px) {
          #mobile-filter-toggle {
            display: inline-flex !important;
          }
          .filter-content {
            display: none !important;
          }
          .filter-content.open {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
