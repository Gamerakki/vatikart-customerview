import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadStoreProducts, getStoreConfig, bookPublicOrder, requestAccessToCatalogue, compileTemplate, registerCustomerPushToken } from './services/storeApi';
import Header from './components/Header';
import FilterSidebar from './components/FilterSidebar';
import ProductCard from './components/ProductCard';
import ProductDrawer from './components/ProductDrawer';
import CartDrawer from './components/CartDrawer';
import MockInvoiceModal from './components/MockInvoiceModal';
import CheckoutView from './components/CheckoutView';
import BuyerAuthModal from './components/BuyerAuthModal';
import { ShoppingBag, Lock } from 'lucide-react';
import { io } from 'socket.io-client';
import { translations } from './utils/i18n';
import { requestNotificationPermissionAndGetToken, logStorefrontEvent, initRemoteConfig } from './utils/firebase';

const ORDER_STEPS = ['UNCONFIRMED', 'CONFIRMED', 'ACCEPTED', 'COMPLETED'];

const THEME_TOKENS = {
  modern: {
    fontFamily: '"Inter", sans-serif',
    accent: '#0D9488',
    dark: {
      bgPrimary: '#0F172A',
      bgSecondary: '#1E293B',
      textPrimary: '#F1F5F9',
      textSecondary: '#94A3B8',
      cardBorder: '1px solid #334155',
    },
    light: {
      bgPrimary: '#f8fafc',
      bgSecondary: '#ffffff',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      cardBorder: '1px solid #e2e8f0',
    },
    cardRadius: '12px',
    cardHoverTransform: 'translateY(-4px)',
    cardHoverShadow: '0 12px 20px -8px rgba(0,0,0,0.4)',
    imageAspectRatio: '1 / 1',
    imageObjectFit: 'contain',
    cardClipPath: 'none',
  },
  fashion: {
    fontFamily: '"Playfair Display", "Georgia", serif',
    accent: '#B45309',
    light: {
      bgPrimary: '#FAF7F2',
      bgSecondary: '#F3EFE6',
      textPrimary: '#1A1816',
      textSecondary: '#5A544F',
      cardBorder: '1px solid #E5E1D8',
    },
    dark: {
      bgPrimary: '#121110',
      bgSecondary: '#1C1A18',
      textPrimary: '#FAF7F2',
      textSecondary: '#A59F99',
      cardBorder: '1px solid #2C2927',
    },
    cardRadius: '0px',
    cardHoverTransform: 'scale(1.015)',
    cardHoverShadow: '0 4px 12px rgba(27,24,22,0.06)',
    imageAspectRatio: '3 / 4',
    imageObjectFit: 'cover',
    cardClipPath: 'none',
  },
  toy: {
    fontFamily: '"Quicksand", sans-serif',
    accent: '#FB7185',
    light: {
      bgPrimary: '#EFF6FF',
      bgSecondary: '#DBEAFE',
      textPrimary: '#1E3A8A',
      textSecondary: '#4B5563',
      cardBorder: '2px dashed #93C5FD',
    },
    dark: {
      bgPrimary: '#0A122C',
      bgSecondary: '#111E46',
      textPrimary: '#EFF6FF',
      textSecondary: '#93C5FD',
      cardBorder: '2px dashed #1E3A8A',
    },
    cardRadius: '24px',
    cardHoverTransform: 'scale(1.05) rotate(1deg)',
    cardHoverShadow: '0 10px 25px -5px rgba(30,58,138,0.12)',
    imageAspectRatio: '1 / 1',
    imageObjectFit: 'contain',
    cardClipPath: 'none',
  },
  organic: {
    fontFamily: '"Inter", sans-serif',
    accent: '#10B981',
    light: {
      bgPrimary: '#F0FDF4',
      bgSecondary: '#FFFFFF',
      textPrimary: '#064E3B',
      textSecondary: '#374151',
      cardBorder: '1px solid #A7F3D0',
    },
    dark: {
      bgPrimary: '#041E11',
      bgSecondary: '#092F1C',
      textPrimary: '#F0FDF4',
      textSecondary: '#A7F3D0',
      cardBorder: '1px solid #064E3B',
    },
    cardRadius: '8px 32px 8px 32px',
    cardHoverTransform: 'translateY(-4px) scale(1.01)',
    cardHoverShadow: '0 10px 20px -8px rgba(6,78,59,0.1)',
    imageAspectRatio: '1 / 1',
    imageObjectFit: 'contain',
    cardClipPath: 'none',
  },
};

const TOY_KEYWORDS = ['toy', 'kid', 'baby', 'play', 'doll', 'game', 'bear', 'child', 'toddler', 'learning', 'plush', 'soft toy', 'gift', 'fun'];
const FASHION_KEYWORDS = ['cloth', 'dress', 'shirt', 'apparel', 'wear', 'fashion', 'boutique', 'silk', 'suit', 'shoe', 'jewelry', 'saree', 'pant', 't-shirt', 'jean', 'jacket', 'kurti', 'clothing', 'designer', 'cotton'];

function detectTheme(title = '', description = '', products = []) {
  const text = `${title} ${description} ${products.map((p) => `${p.name} ${p.category || ''}`).join(' ')}`.toLowerCase();

  let toyScore = 0;
  let fashionScore = 0;

  TOY_KEYWORDS.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}`, 'g');
    const matches = text.match(regex);
    if (matches) toyScore += matches.length;
  });

  FASHION_KEYWORDS.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}`, 'g');
    const matches = text.match(regex);
    if (matches) fashionScore += matches.length;
  });

  if (toyScore > fashionScore && toyScore > 0) return 'toy';
  if (fashionScore > toyScore && fashionScore > 0) return 'fashion';
  return 'modern';
}

export default function App() {
  const [selectedCatalogueId, setSelectedCatalogueId] = useState(() => {
    return getStoreConfig().catalogueId;
  });
  const [isDirectLink] = useState(() => {
    return !!getStoreConfig().catalogueId;
  });
  const [catalogues, setCatalogues] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
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
  const drawerViewRef = useRef({ productId: null, startedAt: 0 });
  const [lang, setLang] = useState(() => localStorage.getItem('vatikart_lang') || 'en');
  const [fcmToken, setFcmToken] = useState(null);

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vatikart_theme') || 'dark';
  });
  const [storefrontTheme, setStorefrontTheme] = useState('modern');

  useEffect(() => {
    // Initialize Remote Config
    void initRemoteConfig();

    (async () => {
      try {
        const token = await requestNotificationPermissionAndGetToken();
        if (token) {
          setFcmToken(token);
        }
      } catch (err) {
        console.warn('[firebase] Token registration skipped or failed', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (customerPhone && fcmToken) {
      void registerCustomerPushToken(customerPhone, fcmToken);
    }
  }, [customerPhone, fcmToken]);

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

        const detected = detectTheme(result.title, result.message || '', result.products || []);
        const queryParams = new URLSearchParams(window.location.search);
        const forcedTemplate = queryParams.get('template') || queryParams.get('theme');
        if (forcedTemplate && ['modern', 'fashion', 'toy', 'organic'].includes(forcedTemplate)) {
          setStorefrontTheme(forcedTemplate);
        } else {
          setStorefrontTheme(detected);
        }

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
        logStorefrontEvent('view_catalogue', {
          catalogue_id: selectedCatalogueId,
          title: result.title || getStoreConfig().storeName || 'catalog',
          company_id: result.companyInfo?.companyId ? String(result.companyInfo.companyId) : undefined
        });
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
  const [currentView, setCurrentView] = useState('catalog'); // 'catalog' | 'checkout' | 'orders'
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    businessName: '',
    phone: '',
    email: '',
  });
  const [lookupPhoneInput, setLookupPhoneInput] = useState(() => {
    return localStorage.getItem('vatikart_customer_phone') || '';
  });

  useEffect(() => {
    const cached = localStorage.getItem('buyer_profile');
    if (cached) {
      try {
        const profile = JSON.parse(cached);
        if (profile?.name && profile?.phone) {
          setBuyer(profile);
          setCustomerName(profile.name);
          setCustomerPhone(profile.phone);
          return;
        }
      } catch {
        // fall through to legacy migration
      }
    }

    try {
      const legacy = localStorage.getItem('vatikart_customer');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const phone = String(parsed.phone || '').replace(/\D/g, '').slice(-10);
        if (parsed.name && phone.length === 10) {
          const profile = { name: parsed.name, phone };
          localStorage.setItem('buyer_profile', JSON.stringify(profile));
          setBuyer(profile);
          setCustomerName(profile.name);
          setCustomerPhone(profile.phone);
          return;
        }
      }
    } catch {
      // ignore legacy parse errors
    }

    setShowAuthModal(true);
  }, []);

  const handleAuthSubmit = useCallback((profile) => {
    const normalizedPhone = profile.phone.replace(/\D/g, '').slice(-10);
    const normalized = { name: profile.name.trim(), phone: normalizedPhone };
    localStorage.setItem('buyer_profile', JSON.stringify(normalized));
    localStorage.setItem('vatikart_customer', JSON.stringify(normalized));
    localStorage.setItem('vatikart_customer_phone', normalizedPhone);
    setBuyer(normalized);
    setCustomerName(normalized.name);
    setCustomerPhone(normalizedPhone);
    setLookupPhoneInput(normalizedPhone);
    setShowAuthModal(false);
  }, []);

  const trackActivity = useCallback(async (activityType, details) => {
    if (!buyer || !companyInfo?.companyId) return;
    try {
      const { apiBase } = getStoreConfig();
      await fetch(`${apiBase}/order/public/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: buyer.name,
          buyerPhone: buyer.phone.replace(/\D/g, ''),
          activityType,
          details,
          companyId: companyInfo.companyId,
        }),
      });
    } catch (err) {
      console.warn('Failed to track activity', err);
    }
  }, [buyer, companyInfo?.companyId]);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vatikart_theme', theme);
  }, [theme]);

  useEffect(() => {
    const disableRightClick = (e) => e.preventDefault();
    document.addEventListener('contextmenu', disableRightClick);
    return () => document.removeEventListener('contextmenu', disableRightClick);
  }, []);

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
  const whatsappTargetPhone = companyInfo?.salesPhone || companyInfo?.supportPhone || resellerPhone || '919876543210';

  const loadCustomerOrders = useCallback(async (phoneOverride) => {
    const phoneToUse = (phoneOverride !== undefined ? phoneOverride : localStorage.getItem('vatikart_customer_phone') || '').trim();
    if (!phoneToUse) {
      setCustomerOrders([]);
      setOrdersError('Please enter your phone number to check your orders.');
      return;
    }

    setOrdersLoading(true);
    setOrdersError('');
    try {
      const { apiBase } = getStoreConfig();
      const response = await fetch(`${apiBase}/order/public/customer/${encodeURIComponent(phoneToUse)}`, {
        headers: { Accept: 'application/json' },
      });

      const body = await response.json();
      if (!response.ok || !body?.status) {
        throw new Error(body?.msg || 'Failed to fetch customer orders.');
      }

      setCustomerOrders(Array.isArray(body.data) ? body.data : []);
      // If successful, cache this number so they don't need to re-type it next time
      localStorage.setItem('vatikart_customer_phone', phoneToUse);
      const result = await loadStoreProducts(selectedCatalogueId);
      if (result && result.products) {
        setProducts(result.products);
      }
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Unable to load orders right now.');
      setCustomerOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

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

  useEffect(() => {
    const companyName = companyInfo?.companyName?.trim();
    if (!companyName) return;

    document.title = `${companyName} | Official Digital Storefront`;

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute(
      'content',
      `Explore catalog collections and order directly from ${companyName} via WhatsApp.`
    );
  }, [companyInfo]);

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
    logStorefrontEvent('add_to_cart', {
      product_id: productWithVariant.id,
      product_name: productWithVariant.name,
      price: productWithVariant.price,
      quantity: productWithVariant.quantity,
      selected_size: productWithVariant.selectedSize || 'One Size',
      selected_color: productWithVariant.selectedColor?.name || 'Default'
    });
    void trackActivity('add_to_cart', `${productWithVariant.name} (x${productWithVariant.quantity})`);
  };

  const handleAddMatrixToCart = (items) => {
    setCart((prevCart) => {
      const newCart = [...prevCart];
      items.forEach((item) => {
        const baseProduct = products.find((p) => p.id === item.productId);
        const cartPayload = baseProduct
          ? {
              ...baseProduct,
              selectedSize: item.size,
              selectedColor: item.color,
              selectedOptions: {},
              quantity: item.quantity,
            }
          : {
              id: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              selectedSize: item.size,
              selectedColor: item.color,
            };

        const idx = newCart.findIndex((cartItem) =>
          cartItem.id === item.productId
          && cartItem.selectedSize === item.size
          && cartItem.selectedColor?.name === item.color.name,
        );

        if (idx > -1) {
          newCart[idx].quantity += item.quantity;
        } else {
          newCart.push(cartPayload);
        }
      });
      localStorage.setItem('vatikart_cart', JSON.stringify(newCart));
      return newCart;
    });

    setIsCartOpen(true);
    void trackActivity('add_to_cart', `Bulk matrix addition (${items.length} variants)`);
  };

  const postAnalytics = (eventType, productId = null, eventValue = null) => {
    if (!companyInfo?.companyId) return;
    const { apiBase } = getStoreConfig();
    fetch(`${apiBase}/analytics/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: companyInfo.companyId,
        productId: productId ?? null,
        eventType,
        eventValue,
      }),
    }).catch(() => {});
  };

  const handleCloseProductDrawer = () => {
    if (drawerViewRef.current.productId && drawerViewRef.current.startedAt > 0) {
      const seconds = Math.max(1, Math.round((Date.now() - drawerViewRef.current.startedAt) / 1000));
      postAnalytics('VIEW_DURATION', drawerViewRef.current.productId, String(seconds));
    }

    drawerViewRef.current = { productId: null, startedAt: 0 };
    setIsProductOpen(false);
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
      quantity: Math.max(1, Number(product.minimumOrderQty) || 1)
    });
  };

  const handleUpdateQty = (index, newQty) => {
    const cartItem = cart[index];
    const moq = Math.max(1, Number(cartItem?.minimumOrderQty) || 1);
    if (newQty < moq) {
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

  const handleSubmitBusinessEnquiry = async (event) => {
    event.preventDefault();
    if (isSubmittingLead) return;

    const payload = {
      name: leadForm.name.trim(),
      business_name: leadForm.businessName.trim(),
      phone: leadForm.phone.replace(/\D/g, ''),
      email: leadForm.email.trim() || null,
      company_id: companyInfo?.companyId ?? null,
    };

    if (!payload.name || !payload.business_name || payload.phone.length < 10) {
      alert('Please fill in name, business name, and a valid WhatsApp number.');
      return;
    }

    setIsSubmittingLead(true);
    try {
      const { apiBase } = getStoreConfig();
      const response = await fetch(`${apiBase}/company/business-enquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.status) {
        throw new Error(body?.msg || 'Failed to submit enquiry.');
      }
      setShowLeadModal(false);
      setLeadForm({ name: '', businessName: '', phone: '', email: '' });
      alert('Enquiry submitted successfully.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit enquiry.');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleConfirmCheckout = async (checkoutDetails) => {
    try {
      // 1. Save order to database and get generated order_id
      const result = await bookPublicOrder(checkoutDetails, selectedCatalogueId);
      const orderId = result.order_id || ('VK-' + Math.floor(100000 + Math.random() * 900000));
      
      const orderLink = `${window.location.origin}${window.location.pathname}?order_id=${encodeURIComponent(orderId)}`;
      const formattedTotal = `₹${Number(checkoutDetails.total || 0).toFixed(2)}`;
      const template = checkoutDetails.whatsappTemplate || 'Your order {order_id} of total {total} is confirmed. {link}';
      const compiledFromTemplate = compileTemplate(template, {
        ...(checkoutDetails.whatsappVars || {}),
        order_id: orderId,
        total: formattedTotal,
        link: orderLink,
      });
      const updatedWhatsappMsg = checkoutDetails.whatsappMsg
        ? checkoutDetails.whatsappMsg
            .replace(/\{\s*order_id\s*\}/gi, orderId)
            .replace(/\{\s*total\s*\}/gi, formattedTotal)
            .replace(/\{\s*link\s*\}/gi, orderLink)
        : compiledFromTemplate;

      const sanitizedTargetPhone = (whatsappTargetPhone || '').replace(/[^0-9]/g, '');
      window.open(updatedWhatsappMsg ? `https://wa.me/${sanitizedTargetPhone}?text=${encodeURIComponent(updatedWhatsappMsg)}` : `https://wa.me/${sanitizedTargetPhone}`, '_blank');
      
      // Log Firebase Checkout Event
      logStorefrontEvent('checkout_whatsapp', {
        order_id: orderId,
        total: checkoutDetails.total,
        subtotal: checkoutDetails.subtotal,
        tax: checkoutDetails.tax,
        discount: checkoutDetails.discount,
        items_count: checkoutDetails.items.length
      });

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
      const result = await loadStoreProducts(selectedCatalogueId);
      if (result && result.products) {
        setProducts(result.products);
      }
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

  const currentTokens = THEME_TOKENS[storefrontTheme] || THEME_TOKENS.modern;
  const modeTokens = currentTokens[theme] || currentTokens.light || currentTokens.dark;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <style>{`
        :root {
          --font-family-store: ${currentTokens.fontFamily};
          --accent-primary: ${currentTokens.accent};
          --bg-primary: ${modeTokens.bgPrimary};
          --bg-secondary: ${modeTokens.bgSecondary};
          --card-bg: ${modeTokens.bgSecondary};
          --text-primary: ${modeTokens.textPrimary};
          --text-secondary: ${modeTokens.textSecondary};
          --card-radius: ${currentTokens.cardRadius};
          --card-border: ${modeTokens.cardBorder};
          --card-hover-transform: ${currentTokens.cardHoverTransform};
          --card-hover-shadow: ${currentTokens.cardHoverShadow};
          --image-aspect-ratio: ${currentTokens.imageAspectRatio};
          --image-object-fit: ${currentTokens.imageObjectFit};
          --card-clip-path: ${currentTokens.cardClipPath};
        }

        body {
          font-family: var(--font-family-store) !important;
          background-color: var(--bg-primary) !important;
          color: var(--text-primary) !important;
          transition: background-color 0.4s ease, color 0.4s ease;
        }

        .grid-auto > div, .product-card-root {
          border-radius: var(--card-radius) !important;
          border: var(--card-border) !important;
          background-color: var(--bg-secondary) !important;
          transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease !important;
        }

        .grid-auto > div:hover, .product-card-root:hover {
          transform: var(--card-hover-transform) !important;
          box-shadow: var(--card-hover-shadow) !important;
        }

        .product-card-image-wrap {
          position: relative !important;
          width: 100% !important;
          overflow: hidden !important;
          padding-bottom: 0px !important;
          aspect-ratio: var(--image-aspect-ratio) !important;
          clip-path: var(--card-clip-path) !important;
        }

        .product-card-image-wrap img {
          width: 100% !important;
          height: 100% !important;
          object-fit: var(--image-object-fit) !important;
          transition: transform 0.5s ease !important;
        }

        .product-card-image-wrap:hover img {
          transform: scale(1.06) !important;
        }

        header, footer, nav {
          font-family: var(--font-family-store) !important;
        }
      `}</style>

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
        onMyOrdersClick={() => {
          setCurrentView('orders');
          void loadCustomerOrders();
        }}
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
                  {accessRequestStatus === 'submitting' ? t('submitting') : t('request_access_btn')}
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
                  {t('back_to_catalogues')}
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
                  {t('welcome_to_store')}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                  {t('browse_collections')}
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('no_collections')}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                  {t('no_collections_desc')}
                </p>
              </div>
            )}
          </main>
        ) : (
          <main className="container main-layout" style={{ flex: 1, padding: '32px 24px', width: '100%' }}>
            
            {/* Sidebar Filters */}
            <aside className="sidebar-container">
              <FilterSidebar
                products={products}
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
                t={t}
              />
            </aside>
            {/* Product Catalog Grid Section */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedCategory === 'All' ? t('all_products') : selectedCategory}
                  <span style={{ fontSize: '0.95rem', color: 'var(--text-tertiary)', fontWeight: 500, marginLeft: '10px' }}>
                    ({filteredProducts.length} {filteredProducts.length === 1 ? t('item_found') : t('items_found')})
                  </span>
                </h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const section = document.getElementById('print-price-sheet-section');
                      if (section) {
                        section.style.display = 'block';
                        window.print();
                        section.style.display = 'none';
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#0D9488',
                      color: '#FFF',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    📄 Export Price List
                  </button>

                  {/* Download Buttons */}
                  {selectedCatalogueId && products.length > 0 && companyInfo?.showDownloadButtons !== false && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={`${getStoreConfig().apiBase}/catalogue/public/${selectedCatalogueId}/export/pdf?theme=corporate&columns=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderRadius: '20px',
                          textDecoration: 'none',
                          fontWeight: 700
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {t('download_pdf')}
                      </a>
                      <a
                        href={`${getStoreConfig().apiBase}/catalogue/public/${selectedCatalogueId}/export/excel`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderRadius: '20px',
                          textDecoration: 'none',
                          fontWeight: 700
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {t('download_excel')}
                      </a>
                    </div>
                  )}

                  {/* Active filters pill display */}
                  {(selectedSizes.length > 0 || selectedColors.length > 0 || selectedTags.length > 0 || selectedCategory !== 'All' || searchTerm) && (
                    <button
                      onClick={handleClearAll}
                      style={{ fontSize: '0.825rem', color: 'var(--accent-primary)', fontWeight: 600 }}
                    >
                      {t('clear_filters')}
                    </button>
                  )}
                </div>
              </div>

              {/* Product Cards Grid */}
              {filteredProducts.length > 0 ? (
                <div className="grid-auto">
                  {filteredProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      companyName={companyInfo?.companyName}
                      onViewDetails={(prod) => {
                        setSelectedProduct(prod);
                        drawerViewRef.current = {
                          productId: prod.id ?? null,
                          startedAt: Date.now(),
                        };
                        setIsProductOpen(true);
                        emitStorefrontActivity('view_product', prod.name);
                        void trackActivity('view_product', prod.name);
                        postAnalytics('VIEW', prod.id ?? null);
                        logStorefrontEvent('view_product', {
                          product_id: prod.id,
                          product_name: prod.name,
                          price: prod.price,
                          category: prod.category
                        });
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
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('no_products_found')}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                    {t('no_products_desc')}
                  </p>
                  <button onClick={handleClearAll} className="btn btn-primary" style={{ marginTop: '8px' }}>
                    {t('reset_filters')}
                  </button>
                </div>
              )}
            </section>
          </main>
        )
      ) : currentView === 'orders' ? (
        <main className="container" style={{ flex: 1, padding: '32px 24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{t('my_orders_title')}</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  void loadCustomerOrders(lookupPhoneInput);
                }}
              >
                {t('refresh')}
              </button>
              <button className="btn btn-outline" onClick={() => setCurrentView('catalog')}>{t('back_to_store')}</button>
            </div>
          </div>

          {/* Manual phone lookup input */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {t('check_orders_by_phone')}
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Enter phone number (e.g. 9876543210)"
                value={lookupPhoneInput}
                onChange={(e) => setLookupPhoneInput(e.target.value)}
                className="form-input"
                style={{ flex: 1, height: '42px', padding: '0 12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  void loadCustomerOrders(lookupPhoneInput);
                }}
                style={{ height: '42px', padding: '0 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {t('search')}
              </button>
            </div>
          </div>

          {ordersLoading ? (
            <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t('loading_orders')}</div>
          ) : ordersError ? (
            <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{ordersError}</div>
          ) : customerOrders.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t('no_orders_found')}</div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {customerOrders.map((order) => {
                const currentStepIndex = ORDER_STEPS.indexOf(order.status);

                return (
                  <div key={order.orderId} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Order #{order.orderId}</div>
                      <div style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{order.status}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {ORDER_STEPS.map((step, idx) => (
                        <div
                          key={step}
                          style={{
                            fontSize: '0.72rem',
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-color)',
                            color: idx <= currentStepIndex ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                            background: idx <= currentStepIndex ? 'var(--accent-light)' : 'transparent',
                            fontWeight: 700,
                          }}
                        >
                          {step}
                        </div>
                      ))}
                    </div>

                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {t('order_date')}: {new Date(order.addedDate).toLocaleString()}
                    </div>

                    <div style={{ display: 'grid', gap: '6px', fontSize: '0.86rem' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>Subtotal: <strong style={{ color: 'var(--text-primary)' }}>₹{Number(order.subtotal || 0).toFixed(2)}</strong></div>
                      <div style={{ color: 'var(--text-secondary)' }}>Tax: <strong style={{ color: 'var(--text-primary)' }}>₹{Number(order.tax || 0).toFixed(2)}</strong></div>
                      <div style={{ color: 'var(--text-secondary)' }}>Total: <strong style={{ color: 'var(--text-primary)' }}>₹{Number(order.total || 0).toFixed(2)}</strong></div>
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '8px', display: 'grid', gap: '5px' }}>
                      {(order.items || []).map((item) => (
                        <div key={item.id} style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <span>{item.title} x {item.qty}</span>
                          <strong style={{ color: 'var(--text-primary)' }}>₹{Number(item.price || 0).toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      ) : (
        <CheckoutView
          cartItems={cart}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onBackToStore={() => setCurrentView('catalog')}
          onConfirmOrder={handleConfirmCheckout}
          whatsappTargetPhone={whatsappTargetPhone}
          resellerPhone={resellerPhone}
          catalogShareTemplate={catalogShareTemplate}
          compileTemplate={compileTemplate}
          storefrontLink={window.location.href}
          currencySymbol="₹"
          lang={lang}
          storePolicies={companyInfo?.policies || ''}
        />
      )}

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '36px 0', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{storeTitle}</h3>
            {companyInfo?.tagline ? <p style={{ margin: 0 }}>{companyInfo.tagline}</p> : null}
            {companyInfo?.address ? <p style={{ margin: 0 }}>{companyInfo.address}</p> : null}
            {companyInfo?.pincode ? <p style={{ margin: 0 }}>Pincode: {companyInfo.pincode}</p> : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Contact Us</h4>
            {companyInfo?.email ? <p style={{ margin: 0 }}>Email: {companyInfo.email}</p> : null}
            {companyInfo?.salesEmail ? <p style={{ margin: 0 }}>Sales Email: {companyInfo.salesEmail}</p> : null}
            {companyInfo?.supportEmail ? <p style={{ margin: 0 }}>Support Email: {companyInfo.supportEmail}</p> : null}
            {companyInfo?.salesPhone ? <p style={{ margin: 0 }}>Sales: {companyInfo.salesPhone}</p> : null}
            {companyInfo?.supportPhone ? <p style={{ margin: 0 }}>Support: {companyInfo.supportPhone}</p> : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Store Policies</h4>
            <div style={{ maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {companyInfo?.policies || 'Policies will be published here soon.'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Business Enquiries</h4>
            <p style={{ margin: 0 }}>Interested in launching your own digital wholesale storefront?</p>
            <button
              type="button"
              onClick={() => setShowLeadModal(true)}
              style={{
                alignSelf: 'flex-start',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Powered by VatiKart
            </button>
          </div>
        </div>
      </footer>

      {showLeadModal ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Business Enquiry</h3>
              <button type="button" onClick={() => setShowLeadModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>x</button>
            </div>
            <form onSubmit={handleSubmitBusinessEnquiry} style={{ display: 'grid', gap: '12px' }}>
              <input
                type="text"
                placeholder="Your Name"
                value={leadForm.name}
                onChange={(e) => setLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <input
                type="text"
                placeholder="Business Name"
                value={leadForm.businessName}
                onChange={(e) => setLeadForm((prev) => ({ ...prev, businessName: e.target.value }))}
                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <input
                type="tel"
                placeholder="WhatsApp Number"
                value={leadForm.phone}
                onChange={(e) => setLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={leadForm.email}
                onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <button
                type="submit"
                disabled={isSubmittingLead}
                style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: 'var(--accent-primary)', color: '#fff', fontWeight: 800, cursor: isSubmittingLead ? 'not-allowed' : 'pointer', opacity: isSubmittingLead ? 0.7 : 1 }}
              >
                {isSubmittingLead ? 'Submitting...' : 'Submit Enquiry'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Product Detail Drawer */}
      <ProductDrawer
        isOpen={isProductOpen}
        onClose={handleCloseProductDrawer}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
        onAddMatrixToCart={handleAddMatrixToCart}
        whatsappTargetPhone={whatsappTargetPhone}
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

      {/* Print Price Sheet Hidden Trigger Block */}
      <div id="print-price-sheet-section" style={{ display: 'none' }}>
        <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '24px', margin: '0 0 4px 0' }}>{storeTitle}</h1>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 20px 0' }}>
            Wholesale Price List - Generated on {new Date().toLocaleDateString()}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Product SKU</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Product Details</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => (
                <tr key={prod.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px' }}>{prod.sku || '-'}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{prod.name}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>₹{prod.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responsive layout styles injection */}
      <style>{`
        /* Disable select & drag globally on storefront */
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        input, textarea, select {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }
        img {
          pointer-events: none;
          -webkit-user-drag: none;
          user-drag: none;
        }

        /* Watermark Container CSS */
        .design-watermark-wrapper {
          position: relative;
          overflow: hidden;
        }
        .design-watermark-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 16px;
          font-weight: 900;
          color: rgba(13, 148, 136, 0.12);
          pointer-events: none;
          z-index: 10;
          white-space: nowrap;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          #print-price-sheet-section, #print-price-sheet-section * {
            visibility: visible;
          }
          #print-price-sheet-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }

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

      <BuyerAuthModal isOpen={showAuthModal} onSubmit={handleAuthSubmit} />
    </div>
  );
}
