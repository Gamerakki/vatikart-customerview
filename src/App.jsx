import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadStoreProducts, getStoreConfig, bookPublicOrder, requestAccessToCatalogue, compileTemplate } from './services/storeApi';
import Header from './components/Header';
import FilterSidebar from './components/FilterSidebar';
import ProductCard from './components/ProductCard';
import ProductDrawer from './components/ProductDrawer';
import CartDrawer from './components/CartDrawer';
import MockInvoiceModal from './components/MockInvoiceModal';
import CheckoutView from './components/CheckoutView';
import { ShoppingBag, Lock } from 'lucide-react';
import { io } from 'socket.io-client';
import { translations } from './utils/i18n';

export default function App() {
  const [selectedCatalogueId, setSelectedCatalogueId] = useState(() => {
    return getStoreConfig().catalogueId;
  });
  const [isDirectLink] = useState(() => {
    return !!getStoreConfig().catalogueId;
  });
  const [catalogues, setCatalogues] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);


  const [products, setProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState(null);
  const [storeTitle, setStoreTitle] = useState(() => getStoreConfig().storeName);
  const { resellerName, resellerPhone } = getStoreConfig();
  const [bannerText, setBannerText] = useState(null);
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerImgPath, setBannerImgPath] = useState(null);
  const [wholesalePricingApplied, setWholesalePricingApplied] = useState(false);
  const [wholesaleGroupName, setWholesaleGroupName] = useState(null);
  const [catalogShareTemplate, setCatalogShareTemplate] = useState('Check out our catalog: {link}');
  const [accessError, setAccessError] = useState(null);
  const [accessRequestStatus, setAccessRequestStatus] = useState('idle'); // 'idle', 'submitting', 'submitted', 'approved'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState(localStorage.getItem('vatikart_customer_phone') || '');
  const [pendingPrivateCatalogue, setPendingPrivateCatalogue] = useState(null); // for private catalogue click-to-request flow
  const socketRef = useRef(null);
  const [lang, setLang] = useState(() => localStorage.getItem('vatikart_lang') || 'en');

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vatikart_theme') || 'dark';
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const result = await loadStoreProducts(selectedCatalogueId);
        if (cancelled) return;
        setProducts(result.products);
        setCatalogNotice(result.message);
        setCatalogues(result.catalogues || []);
        setCompanyInfo(result.companyInfo);
        setBannerText(result.bannerText ?? null);
        setBannerActive(result.bannerActive ?? false);
        setBannerImgPath(result.bannerImgPath ?? null);
        setWholesalePricingApplied(Boolean(result.wholesalePricingApplied));
        setWholesaleGroupName(result.wholesaleGroupName || null);
        setCatalogShareTemplate(result.catalogShareTemplate || 'Check out our catalog: {link}');

        if (result.catalogueId && !selectedCatalogueId) {
          setSelectedCatalogueId(result.catalogueId);
        }

        if (result.title) {
          setStoreTitle(result.title);
        } else {
          const cfg = getStoreConfig();
          if (cfg.storeName) setStoreTitle(cfg.storeName);
        }
        emitStorefrontActivity('view_catalog', result.title || getStoreConfig().storeName || 'catalog', result.companyInfo?.companyId);
        setAccessError(null);
      } catch (err) {
        if (cancelled) return;
        if (err.type === 'REQUIRES_ACCESS') {
          setAccessError(err);
          setCatalogues(err.catalogues || []);
          setCompanyInfo(err.companyInfo);
        } else {
          setCatalogNotice('An error occurred while loading the storefront.');
        }
      } finally {
        setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessRequestStatus, selectedCatalogueId]);


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
  const [selectedTags, setSelectedTags] = useState([]);
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

  useEffect(() => {
    const onLanguageEvent = (event) => {
      const nextLang = event?.detail || localStorage.getItem('vatikart_lang') || 'en';
      setLang(nextLang);
    };

    const onStorage = (event) => {
      if (event.key === 'vatikart_lang' && event.newValue) {
        setLang(event.newValue);
      }
    };

    window.addEventListener('vatikart_language_change', onLanguageEvent);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('vatikart_language_change', onLanguageEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;

  useEffect(() => {
    const socketBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.vatikart.in';
    const socket = io(socketBaseUrl, { transports: ['websocket'] });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

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
    if (params.has('tags')) {
      setSelectedTags(params.get('tags').split(','));
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
    const params = new URLSearchParams(window.location.search);
    
    if (selectedCategory !== 'All') {
      params.set('category', selectedCategory);
    } else {
      params.delete('category');
    }
    
    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }
    
    if (selectedSizes.length > 0) {
      params.set('sizes', selectedSizes.join(','));
    } else {
      params.delete('sizes');
    }
    
    if (selectedColors.length > 0) {
      params.set('colors', selectedColors.join(','));
    } else {
      params.delete('colors');
    }

    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    } else {
      params.delete('tags');
    }
    
    if (maxPrice !== 350) {
      params.set('price', maxPrice.toString());
    } else {
      params.delete('price');
    }
    
    if (sortOption !== 'popularity') {
      params.set('sort', sortOption);
    } else {
      params.delete('sort');
    }
    
    if (selectedCatalogueId) {
      params.set('catalogue', selectedCatalogueId.toString());
    } else {
      params.delete('catalogue');
    }

    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [selectedCategory, searchTerm, selectedSizes, selectedColors, selectedTags, maxPrice, sortOption, selectedCatalogueId]);


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

  const allTags = useMemo(() => {
    const tags = new Set();
    products.forEach((product) => {
      if (Array.isArray(product.tags)) {
        product.tags.forEach((tag) => {
          if (typeof tag === 'string' && tag.trim()) {
            tags.add(tag.trim());
          }
        });
      }
      if (typeof product.tag === 'string' && product.tag.trim()) {
        tags.add(product.tag.trim());
      }
    });
    return [...tags].sort((a, b) => a.localeCompare(b));
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

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter((p) => {
        const productTags = [
          ...(Array.isArray(p.tags) ? p.tags : []),
          ...(p.tag ? [p.tag] : []),
        ];
        return productTags.some((tag) => selectedTags.includes(tag));
      });
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
  }, [products, searchTerm, selectedCategory, selectedSizes, selectedColors, selectedTags, maxPrice, sortOption]);

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

  const handleTagToggle = (tagName) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((tag) => tag !== tagName) : [...prev, tagName]
    );
  };

  // Clear filters helper
  const handleClearAll = () => {
    setSelectedCategory('All');
    setSearchTerm('');
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedTags([]);
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
    // Analytics
    postAnalytics('CART_ADD', productWithVariant.id ?? null);
  };

  const postAnalytics = (eventType, productId = null) => {
    if (!companyInfo?.companyId) return;
    const { apiBase } = getStoreConfig();
    fetch(`${apiBase}/analytics/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: companyInfo.companyId,
        productId: productId ?? null,
        eventType,
      }),
    }).catch(() => {});
  };

  const emitStorefrontActivity = (activityType, label, overrideCompanyId = null) => {
    const companyId = overrideCompanyId || companyInfo?.companyId;
    if (!socketRef.current || !companyId) return;

    let guestId = localStorage.getItem('vatikart_guest_id');
    if (!guestId) {
      guestId = 'Guest #' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('vatikart_guest_id', guestId);
    }

    let customerName = '';
    let customerPhone = localStorage.getItem('vatikart_customer_phone') || '';

    try {
      const savedCustomer = localStorage.getItem('vatikart_customer');
      if (savedCustomer) {
        const parsed = JSON.parse(savedCustomer);
        if (parsed.name) customerName = parsed.name;
        if (parsed.phone) customerPhone = parsed.phone;
      }
    } catch (err) {
      console.warn('Failed to parse customer info', err);
    }

    socketRef.current.emit('storefront_activity', {
      companyId: String(companyId),
      activityType,
      label,
      timestamp: new Date().toISOString(),
      customerName,
      customerPhone,
      guestId,
    });
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
      selectedSize: product.priceMode === 'perSet' ? null : (product.sizes && product.sizes.length > 0 ? product.sizes[0] : null),
      selectedColor: product.priceMode === 'perSet' ? null : (product.colors && product.colors.length > 0 ? product.colors[0] : null),
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
      
      const orderLink = `${window.location.origin}${window.location.pathname}?order_id=${encodeURIComponent(orderId)}`;
      const formattedTotal = `₹${Number(checkoutDetails.total || 0).toFixed(2)}`;
      const template = checkoutDetails.whatsappTemplate || 'Your order {order_id} of total {total} is confirmed. {link}';
      const updatedWhatsappMsg = compileTemplate(template, {
        ...(checkoutDetails.whatsappVars || {}),
        order_id: orderId,
        total: formattedTotal,
        link: orderLink,
      });

      // 2. Open WhatsApp message redirect
      window.open(updatedWhatsappMsg ? `https://wa.me/${resellerPhone || '919876543210'}?text=${encodeURIComponent(updatedWhatsappMsg)}` : `https://wa.me/${resellerPhone || '919876543210'}`, '_blank');
      
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

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;

    // catalogueId can come from a REQUIRES_ACCESS API error OR a proactive private-click
    const targetCatalogueId = accessError?.catalogueId || pendingPrivateCatalogue?.catalogue_id;
    if (!targetCatalogueId) return;
    
    setAccessRequestStatus('submitting');
    try {
      await requestAccessToCatalogue(targetCatalogueId, customerName, customerPhone);
      localStorage.setItem('vatikart_customer_phone', customerPhone);
      setAccessRequestStatus('submitted');
      
      // Start polling for access approval (check every 5 sec)
      const interval = setInterval(async () => {
        try {
          const result = await loadStoreProducts(targetCatalogueId);
          if (result && result.products) {
            clearInterval(interval);
            // Access was granted — navigate into the catalogue
            setPendingPrivateCatalogue(null);
            setAccessError(null);
            setSelectedCatalogueId(targetCatalogueId);
            setAccessRequestStatus('idle');
          }
        } catch (err) {
          // Still waiting or rejected, keep polling
        }
      }, 5000);
      
    } catch (err) {
      alert(err.message || 'Failed to request access.');
      setAccessRequestStatus('idle');
    }
  };

  // Handle clicking a catalogue card — private ones show request form immediately if access not granted
  const handleCatalogueClick = async (cat) => {
    if (cat.privacy_level === 'PRIVATE') {
      const savedPhone = localStorage.getItem('vatikart_customer_phone');
      if (savedPhone) {
        setCatalogLoading(true);
        try {
          const result = await loadStoreProducts(cat.catalogue_id);
          if (result && result.products) {
            setProducts(result.products);
            setCatalogNotice(result.message);
            setSelectedCatalogueId(cat.catalogue_id);
            setCatalogLoading(false);
            return;
          }
        } catch (err) {
          // Access not yet granted or expired, fall through to show request form
        }
        setCatalogLoading(false);
      }

      setPendingPrivateCatalogue(cat);
      setAccessError(null); // clear any prior API-thrown access error
      setAccessRequestStatus('idle');
    } else {
      setSelectedCatalogueId(cat.catalogue_id);
    }
  };

  // Back from access request form to catalogue grid
  const handleBackFromAccessRequest = () => {
    setPendingPrivateCatalogue(null);
    setAccessError(null);
    setAccessRequestStatus('idle');
    setSelectedCatalogueId(null);
    setProducts([]);
  };

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

      {/* ── Text Announcement Banner ── */}
      {bannerActive && bannerText && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          backgroundColor: 'var(--accent-primary)',
          color: '#fff',
          textAlign: 'center',
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
          lineHeight: 1.4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}>
          {bannerText}
        </div>
      )}

      {/* Header component */}
      <Header
        cartCount={totalCartCount}
        onCartClick={() => setIsCartOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        theme={theme}
        storeName={storeTitle}
        resellerName={resellerName}
        resellerPhone={resellerPhone}
        toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        hideSearch={false}
        lang={lang}
        onLanguageChange={setLang}
        t={t}
        wholesalePricingApplied={wholesalePricingApplied}
        wholesaleGroupName={wholesaleGroupName}
        onBackClick={!isDirectLink && selectedCatalogueId && catalogues.length > 1 ? () => {
          setSelectedCatalogueId(null);
          setProducts([]);
        } : null}

      />

      {/* ── Cover Banner Image ── */}
      {bannerImgPath && (
        <div style={{ width: '100%', padding: '0 0 4px 0', lineHeight: 0 }}>
          <img
            src={`https://cdn.vatikart.in/${bannerImgPath}`}
            alt="Catalogue banner"
            style={{
              width: '100%',
              maxHeight: '320px',
              objectFit: 'cover',
              borderRadius: '0 0 12px 12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              display: 'block',
            }}
          />
        </div>
      )}

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

      {(accessError || pendingPrivateCatalogue) ? (
        <main className="container" style={{ flex: 1, padding: '48px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '40px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Lock icon */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '2rem'
            }}>🔒</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>Private Catalogue</h2>
            {(pendingPrivateCatalogue?.title || accessError?.catalogueTitle) && (
              <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                {pendingPrivateCatalogue?.title || accessError?.catalogueTitle}
              </p>
            )}
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
              {accessError?.message || 'This catalogue is private. Request access from the store owner to view its products.'}
            </p>

            {accessRequestStatus === 'submitted' ? (
              <div style={{
                padding: '24px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <h3 style={{ color: '#10B981', fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>✅ Request Sent!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Please wait while the store owner reviews your request. You will automatically be granted access here once approved.
                </p>
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                  <div className="loading-spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(16, 185, 129, 0.3)', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={accessRequestStatus === 'submitting'}
                  style={{
                    marginTop: '8px',
                    padding: '14px',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '1rem',
                    cursor: accessRequestStatus === 'submitting' ? 'not-allowed' : 'pointer',
                    opacity: accessRequestStatus === 'submitting' ? 0.7 : 1
                  }}
                >
                  {accessRequestStatus === 'submitting' ? 'Submitting...' : 'Request Access'}
                </button>
                {/* Back to catalogue grid */}
                <button
                  type="button"
                  onClick={handleBackFromAccessRequest}
                  style={{
                    padding: '12px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  ← Back to all catalogues
                </button>
              </form>
            )}
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </main>
      ) : currentView === 'catalog' ? (
        !selectedCatalogueId ? (
          <main className="container" style={{ flex: 1, padding: '48px 24px', width: '100%' }}>
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Welcome to our Store
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                Browse our collections below
              </p>
            </div>

            {catalogues.length > 0 ? (
              <div className="directory-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '32px',
                paddingBottom: '48px'
              }}>
                {catalogues.map((cat) => {
                  const isPrivate = cat.privacy_level === 'PRIVATE';
                  return (
                    <div
                      key={cat.catalogue_id}
                      onClick={() => handleCatalogueClick(cat)}
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      className="catalogue-card"
                    >
                      <div style={{ position: 'relative', height: '200px', backgroundColor: 'var(--bg-secondary)' }}>
                        {cat.cover_image ? (
                          <img
                            src={cat.cover_image.startsWith('http') ? cat.cover_image : `https://cdn.vatikart.in/${cat.cover_image}`}
                            alt={cat.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                            <ShoppingBag size={48} />
                          </div>
                        )}
                        {isPrivate && (
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(6px)',
                            padding: '5px 10px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#F59E0B',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                          }}>
                            <Lock size={11} strokeWidth={2.5} />
                            PRIVATE
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                          {cat.title}
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span>{cat.products_count} {cat.products_count === 1 ? 'product' : 'products'}</span>
                          {isPrivate ? (
                            <span style={{ color: '#F59E0B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Lock size={12} /> Request Access
                            </span>
                          ) : (
                            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>Browse →</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>No collections available</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                  This store has no published collections at the moment. Please check back later.
                </p>
              </div>
            )}
          </main>
        ) : (
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
                allTags={allTags}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
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
                {(selectedSizes.length > 0 || selectedColors.length > 0 || selectedTags.length > 0 || selectedCategory !== 'All' || searchTerm) && (
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
                        emitStorefrontActivity('view_product', prod.name);
                        postAnalytics('VIEW', prod.id ?? null);
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
        )
      ) : (
        <CheckoutView
          cartItems={cart}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onBackToStore={() => setCurrentView('catalog')}
          onConfirmOrder={handleConfirmCheckout}
          resellerPhone={resellerPhone}
          catalogShareTemplate={catalogShareTemplate}
          compileTemplate={compileTemplate}
          storefrontLink={window.location.href}
          currencySymbol="₹"
          lang={lang}
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
        onClearCart={() => setCart([])}
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
        .catalogue-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .catalogue-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.3);
          border-color: var(--accent-primary) !important;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
