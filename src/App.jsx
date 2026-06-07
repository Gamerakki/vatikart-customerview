import React, { useState, useEffect, useMemo } from 'react';
import { loadStoreProducts, getStoreConfig, bookPublicOrder } from './services/storeApi';
import Header from './components/Header';
import FilterSidebar from './components/FilterSidebar';
import ProductCard from './components/ProductCard';
import ProductDrawer from './components/ProductDrawer';
import CartDrawer from './components/CartDrawer';
import MockInvoiceModal from './components/MockInvoiceModal';
import CheckoutView from './components/CheckoutView';
import { ShoppingBag } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState(null);
  const [storeTitle, setStoreTitle] = useState(() => getStoreConfig().storeName);

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vatikart_theme') || 'dark';
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      const result = await loadStoreProducts();
      if (cancelled) return;
      setProducts(result.products);
      setCatalogNotice(result.message);
      if (result.title) {
        setStoreTitle(result.title);
      } else {
        const cfg = getStoreConfig();
        if (cfg.storeName) setStoreTitle(cfg.storeName);
      }
      setCatalogLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cart state
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('vatikart_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [maxPrice, setMaxPrice] = useState(350);
  const [sortOption, setSortOption] = useState('popularity');

  // UI state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [currentView, setCurrentView] = useState('catalog'); // 'catalog' or 'checkout'

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vatikart_theme', theme);
  }, [theme]);

  // Sync cart to local storage
  useEffect(() => {
    localStorage.setItem('vatikart_cart', JSON.stringify(cart));
  }, [cart]);

  // Sync URL search parameters on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('category')) {
      setSelectedCategory(params.get('category'));
    }
    if (params.has('search')) {
      setSearchTerm(params.get('search'));
    }
    if (params.has('sizes')) {
      setSelectedSizes(params.get('sizes').split(','));
    }
    if (params.has('colors')) {
      setSelectedColors(params.get('colors').split(','));
    }
    if (params.has('price')) {
      setMaxPrice(Number(params.get('price')));
    }
    if (params.has('sort')) {
      setSortOption(params.get('sort'));
    }
  }, []);

  // Sync state to URL search parameters
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (searchTerm) params.set('search', searchTerm);
    if (selectedSizes.length > 0) params.set('sizes', selectedSizes.join(','));
    if (selectedColors.length > 0) params.set('colors', selectedColors.join(','));
    if (maxPrice !== 350) params.set('price', maxPrice.toString());
    if (sortOption !== 'popularity') params.set('sort', sortOption);

    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [selectedCategory, searchTerm, selectedSizes, selectedColors, maxPrice, sortOption]);

  const priceCeiling = useMemo(() => {
    if (products.length === 0) return 350;
    return Math.ceil(Math.max(...products.map((p) => p.price), 350) / 50) * 50;
  }, [products]);

  useEffect(() => {
    if (maxPrice < priceCeiling) {
      setMaxPrice(priceCeiling);
    }
  }, [priceCeiling]);

  // Unique categories, sizes and colors gathered from products database
  const categories = useMemo(() => {
    return [...new Set(products.map(p => p.category))];
  }, [products]);

  const allSizes = useMemo(() => {
    const sizes = new Set();
    products.forEach(p => (p.sizes || []).forEach(s => sizes.add(s)));
    return [...sizes].sort((a, b) => {
      const order = { 'S': 1, 'M': 2, 'L': 3, 'XL': 4, 'XXL': 5, 'One Size': 6 };
      return (order[a] || 99) - (order[b] || 99);
    });
  }, [products]);

  const allColors = useMemo(() => {
    const colorsMap = new Map();
    products.forEach(p => {
      (p.colors || []).forEach(c => colorsMap.set(c.name, c.hex));
    });
    return [...colorsMap.entries()].map(([name, hex]) => ({ name, hex }));
  }, [products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Size filter
    if (selectedSizes.length > 0) {
      result = result.filter(p =>
        p.sizes.some(size => selectedSizes.includes(size))
      );
    }

    // Color filter
    if (selectedColors.length > 0) {
      result = result.filter(p =>
        p.colors.some(color => selectedColors.includes(color.name))
      );
    }

    // Price filter
    result = result.filter(p => p.price <= maxPrice);

    // Sorting
    if (sortOption === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } // 'popularity' is default and retains original dataset index ordering

    return result;
  }, [products, searchTerm, selectedCategory, selectedSizes, selectedColors, maxPrice, sortOption]);

  // Size toggle helper
  const handleSizeToggle = (size) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  // Color toggle helper
  const handleColorToggle = (colorName) => {
    setSelectedColors(prev =>
      prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]
    );
  };

  // Clear filters helper
  const handleClearAll = () => {
    setSelectedCategory('All');
    setSearchTerm('');
    setSelectedSizes([]);
    setSelectedColors([]);
    setMaxPrice(350);
    setSortOption('popularity');
  };

  // Cart actions
  const handleAddToCart = (productWithVariant) => {
    setCart(prev => {
      // Check if item with same ID, size, color and custom options already in cart
      const existingIdx = prev.findIndex(item => {
        const idMatch = item.id === productWithVariant.id;
        const sizeMatch = item.selectedSize === productWithVariant.selectedSize;
        const colorMatch = item.selectedColor?.name === productWithVariant.selectedColor?.name;
        
        // Match selectedOptions dictionaries
        const optKeys1 = Object.keys(item.selectedOptions || {});
        const optKeys2 = Object.keys(productWithVariant.selectedOptions || {});
        let optionsMatch = optKeys1.length === optKeys2.length;
        if (optionsMatch) {
          for (const key of optKeys1) {
            if (item.selectedOptions[key] !== productWithVariant.selectedOptions[key]) {
              optionsMatch = false;
              break;
            }
          }
        }
        return idMatch && sizeMatch && colorMatch && optionsMatch;
      });

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += productWithVariant.quantity;
        return updated;
      }
      return [...prev, productWithVariant];
    });
    // Open cart drawer so user sees item was added
    setIsCartOpen(true);
  };

  // Quick Add handler (adds default first size/color variant and option defaults)
  const handleQuickAdd = (product) => {
    const defaultOptions = {};
    if (product.options) {
      Object.entries(product.options).forEach(([key, values]) => {
        if (values && values.length > 0) {
          defaultOptions[key] = values[0];
        }
      });
    }
    handleAddToCart({
      ...product,
      selectedSize: product.sizes && product.sizes.length > 0 ? product.sizes[0] : null,
      selectedColor: product.colors && product.colors.length > 0 ? product.colors[0] : null,
      selectedOptions: defaultOptions,
      quantity: 1
    });
  };

  const handleUpdateQty = (index, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCart(prev => {
      const updated = [...prev];
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setCart(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCheckoutInvoice = (invoiceObj) => {
    setInvoiceData(invoiceObj);
    setIsCartOpen(false);
    setCurrentView('catalog'); // Return to catalog view
  };

  const handleCloseInvoice = () => {
    setInvoiceData(null);
    setCart([]); // Clear cart upon successful invoice booking
  };

  const handleConfirmCheckout = async (checkoutDetails) => {
    try {
      // 1. Save order to database and get generated order_id
      const result = await bookPublicOrder(checkoutDetails);
      const orderId = result.order_id || ('VK-' + Math.floor(100000 + Math.random() * 900000));
      
      // Update whatsapp message with the real Order ID
      const updatedWhatsappMsg = checkoutDetails.whatsappMsg
        ? checkoutDetails.whatsappMsg.replace('*New Order from VatiKart Storefront!*', `*New Order #${orderId} from VatiKart Storefront!*`)
        : '';

      // 2. Open WhatsApp message redirect
      window.open(updatedWhatsappMsg ? `https://wa.me/919876543210?text=${encodeURIComponent(updatedWhatsappMsg)}` : `https://wa.me/919876543210`, '_blank');
      
      // 3. Open printable invoice modal receipt
      setInvoiceData({
        customer: checkoutDetails.customer,
        items: checkoutDetails.items,
        subtotal: checkoutDetails.subtotal,
        tax: checkoutDetails.tax,
        total: checkoutDetails.total,
        orderId: orderId,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
      
      // 4. Reset view to catalog
      setCurrentView('catalog');
    } catch (error) {
      alert(error.message || 'Failed to place order. Please try again.');
    }
  };

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  if (catalogLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        fontWeight: 700,
      }}>
        Loading storefront…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header component */}
      <Header
        cartCount={totalCartCount}
        onCartClick={() => setIsCartOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        theme={theme}
        storeName={storeTitle}
        toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      />

      {catalogNotice && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '10px 24px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}>
          {catalogNotice}
        </div>
      )}

      {currentView === 'catalog' ? (
        <main className="container main-layout" style={{ flex: 1, padding: '32px 24px', width: '100%' }}>
          
          {/* Sidebar Filters */}
          <aside className="sidebar-container">
            <FilterSidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedSizes={selectedSizes}
              onSizeToggle={handleSizeToggle}
              selectedColors={selectedColors}
              onColorToggle={handleColorToggle}
              maxPrice={maxPrice}
              onPriceChange={setMaxPrice}
              sortOption={sortOption}
              onSortChange={setSortOption}
              onClearAll={handleClearAll}
              allSizes={allSizes}
              allColors={allColors}
            />
          </aside>
          {/* Product Catalog Grid Section */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedCategory === 'All' ? 'All Products' : selectedCategory}
                <span style={{ fontSize: '0.95rem', color: 'var(--text-tertiary)', fontWeight: 500, marginLeft: '10px' }}>
                  ({filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} found)
                </span>
              </h2>
              
              {/* Active filters pill display */}
              {(selectedSizes.length > 0 || selectedColors.length > 0 || selectedCategory !== 'All' || searchTerm) && (
                <button
                  onClick={handleClearAll}
                  style={{ fontSize: '0.825rem', color: 'var(--accent-primary)', fontWeight: 600 }}
                >
                  Clear all active filters
                </button>
              )}
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid-auto">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onViewDetails={(prod) => {
                      setSelectedProduct(prod);
                      setIsProductOpen(true);
                    }}
                    onQuickAdd={handleQuickAdd}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 0',
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--card-radius)',
                border: '1px solid var(--border-color)',
                gap: '16px'
              }}>
                <div style={{ color: 'var(--text-tertiary)' }}>
                  <ShoppingBag size={48} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>No products found</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                  We couldn't find any products matching your active filter criteria. Try relaxing your filters or resetting the search.
                </p>
                <button onClick={handleClearAll} className="btn btn-primary" style={{ marginTop: '8px' }}>
                  Reset Filters
                </button>
              </div>
            )}
          </section>

        </main>
      ) : (
        <CheckoutView
          cartItems={cart}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onBackToStore={() => setCurrentView('catalog')}
          onConfirmOrder={handleConfirmCheckout}
          currencySymbol="₹"
        />
      )}

      {/* Footer copyright */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '24px 0', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span>© {new Date().getFullYear()} VatiKart Store. All rights reserved. Powered by QuickSell.</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#privacy" style={{ hover: { color: 'var(--accent-primary)' } }}>Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#contact">Contact Merchant</a>
          </div>
        </div>
      </footer>

      {/* Product Detail Drawer */}
      <ProductDrawer
        isOpen={isProductOpen}
        onClose={() => setIsProductOpen(false)}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onCheckoutInvoice={() => {
          setIsCartOpen(false);
          setCurrentView('checkout');
        }}
      />

      {/* Local Invoice booking modal */}
      <MockInvoiceModal
        isOpen={!!invoiceData}
        onClose={handleCloseInvoice}
        invoiceData={invoiceData}
      />

      {/* Responsive layout styles injection */}
      <style>{`
        .main-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 32px;
        }
        @media (max-width: 992px) {
          .main-layout {
            display: flex !important;
            flex-direction: column !important;
            gap: 24px !important;
          }
          .sidebar-container {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
