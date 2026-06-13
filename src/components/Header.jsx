import React from 'react';
import { Search, ShoppingCart, Moon, Sun } from 'lucide-react';
import { languageOptions } from '../utils/i18n';

export default function Header({
  cartCount,
  onCartClick,
  searchTerm,
  onSearchChange,
  theme,
  storeName = 'VatiKart Store',
  toggleTheme,
  hideSearch = false,
  onBackClick = null,
  lang = 'en',
  onLanguageChange,
  t = (key) => key,
}) {
  return (
    <header className="glass-nav" style={{ position: 'sticky', top: 0, width: '100%', transition: 'var(--transition-smooth)' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', padding: '16px 24px', gap: '16px' }}>
        
        {/* Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Logo & Description */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {onBackClick && (
                <button
                  onClick={onBackClick}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    marginRight: '8px'
                  }}
                >
                  ← Back
                </button>
              )}
              <div style={{
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '1.2rem',
                letterSpacing: '0.05em',
                boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)'
              }}>
                VatiKart
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{storeName}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
              Explore our curated collection. No login needed.
            </p>
          </div>

          {/* Actions: Theme, Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    localStorage.setItem('vatikart_lang', option.code);
                    window.dispatchEvent(new CustomEvent('vatikart_language_change', { detail: option.code }));
                    if (onLanguageChange) {
                      onLanguageChange(option.code);
                    }
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '999px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                    color: lang === option.code ? '#ffffff' : 'var(--text-secondary)',
                    backgroundColor: lang === option.code ? 'var(--accent-primary)' : 'var(--bg-tertiary)'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{ padding: '8px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} style={{ color: 'var(--warning)' }} /> : <Moon size={18} />}
            </button>

            {/* Cart Trigger */}
            <button
              onClick={onCartClick}
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--button-radius)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative'
              }}
            >
              <ShoppingCart size={18} />
              <span style={{ fontWeight: 600 }}>{t('shopping_cart')}</span>
              {cartCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  borderRadius: '50%',
                  minWidth: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  border: '2px solid var(--bg-secondary)',
                  padding: '2px'
                }}>
                  {cartCount}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Live Search Input */}
        {!hideSearch && (
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search items by name, category, or brand..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: '48px',
                fontSize: '1rem',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1.5px solid var(--border-color)',
                height: '48px'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
