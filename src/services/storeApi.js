import { products as fallbackProducts } from '../data/products';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.vatikart.in';

function parseCatalogueIdFromPath() {
  const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9\-]+)/i)
    || window.location.pathname.match(/\/catalogue\/([a-zA-Z0-9\-]+)/i);
  return match ? match[1] : null;
}

export function getStoreConfig() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  let subdomain = null;
  // If hostname has 3 parts (subdomain.domain.tld) and first part isn't www, api, or localhost
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'localhost') {
    subdomain = parts[0];
  }
  
  // For local testing (e.g. companyname.localhost), check if it ends with .localhost and has a subdomain
  if (hostname.endsWith('.localhost') && parts.length >= 2 && parts[0] !== 'localhost') {
    subdomain = parts[0];
  }

  const params = new URLSearchParams(window.location.search);
  const catalogueId = params.get('catalogue') || params.get('catalogue_id') || parseCatalogueIdFromPath();
  const apiBase = (params.get('api') || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '');
  const token = params.get('token') || localStorage.getItem('vatikart_preview_token') || '';
  const storeName = params.get('store') || 'VatiKart Store';
  const margin = parseFloat(params.get('margin') || '0');

  if (token) {
    localStorage.setItem('vatikart_preview_token', token);
  }

  return { subdomain, catalogueId, apiBase, token, storeName, margin: Number.isFinite(margin) ? margin : 0 };
}

function getFullImageUrl(path) {
  if (!path) return undefined;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) {
    return path;
  }
  return `https://cdn.vatikart.in/${path}`;
}

function mapApiProduct(item, index, margin = 0) {
  const basePrice = Number(item.price) || 0;
  const baseOriginalPrice = item.original_price != null ? Number(item.original_price) : basePrice;
  const multiplier = margin > 0 ? (1 + margin / 100) : 1;
  const price = Number((basePrice * multiplier).toFixed(2));
  const originalPrice = Number((baseOriginalPrice * multiplier).toFixed(2));
  const title = item.product || item.title || `Product ${index + 1}`;
  const category = item.category || item.slug || 'General';

  return {
    id: item.product_id ?? item.id ?? index + 1,
    name: title,
    category,
    price,
    originalPrice: originalPrice,
    gstRate: item.gst_rate != null ? Number(item.gst_rate) : 0,
    unitType: item.unit_type || null,
    minimumOrderQty: item.minimum_order_qty != null ? Number(item.minimum_order_qty) : 1,
    bulkDiscounts: item.bulk_discounts || [],
    rating: 4.5,
    reviewsCount: 0,
    tag: item.total_stock > 0 ? 'In Stock' : 'Out of Stock',
    description: item.description || item.slug || title,
    image:
      getFullImageUrl(item.img_path)
      || getFullImageUrl(item.imageUri)
      || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60',
    gallery: item.images && item.images.length > 0
      ? item.images.map(getFullImageUrl)
      : [
          getFullImageUrl(item.img_path) || getFullImageUrl(item.imageUri) || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60'
        ],
    sizes: item.sizes?.length
      ? item.sizes.map((s) => (typeof s === 'string' ? s : s.label))
      : ['One Size'],
    colors: item.colors?.length
      ? item.colors.map((c) => ({
          name: c.name || c.label || 'Default',
          hex: c.hex || c.accent || '#94a3b8',
        }))
      : [{ name: 'Default', hex: '#94a3b8' }],
    options: {},
    priceMode: item.price_mode || 'perPiece',
    setQuantity: item.set_quantity != null ? Number(item.set_quantity) : null,
    setName: item.set_name || null,
    setComposition: item.set_composition || [],
  };
}

async function tryFetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    // ignore
  }
  if (!response.ok) {
    if (response.status === 403 && (body?.error === 'REQUIRES_ACCESS' || body?.code === 'REQUIRES_ACCESS')) {
      throw { type: 'REQUIRES_ACCESS', message: body.msg || 'Private catalogue requires access' };
    }
    return null;
  }
  return body;
}

async function fetchWithAuthPaths(catalogueId, apiBase, token, margin = 0) {
  const phone = localStorage.getItem('vatikart_customer_phone');
  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(phone ? { 'customer-phone': phone } : {}),
  };

  const paths = [
    `/catalogue/public/${catalogueId}/products`,
    `/product/fetch-list/${catalogueId}`,
    `/catalogue/${catalogueId}/products`,
    `/store/catalogue/${catalogueId}/products`,
  ];

  for (const path of paths) {
    const body = await tryFetchJson(`${apiBase}${path}`, { headers });
    if (body?.status && Array.isArray(body.data)) {
      return {
        products: body.data.map((item, index) => mapApiProduct(item, index, margin)),
        title: body.title || null
      };
    }
    if (Array.isArray(body)) {
      return {
        products: body.map((item, index) => mapApiProduct(item, index, margin)),
        title: null
      };
    }
  }

  return null;
}

export async function loadStoreProducts(overrideCatalogueId = undefined) {
  const { subdomain, catalogueId: configCatalogueId, apiBase, token, margin } = getStoreConfig();
  
  let resolvedCatalogueId = overrideCatalogueId !== undefined ? overrideCatalogueId : configCatalogueId;

  let catalogues = [];
  let companyInfo = null;

  if (subdomain) {
    try {
      const response = await fetch(`${apiBase}/company/resolve-subdomain/${subdomain}`, {
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        const body = await response.json();
        if (body?.status && body.data) {
          companyInfo = {
            companyId: body.data.company_id,
            companyName: body.data.company_name,
            logoImgPath: body.data.logo_img_path,
          };
          catalogues = body.data.catalogues || [];
          
          if (!resolvedCatalogueId) {
            if (catalogues.length === 1) {
              resolvedCatalogueId = catalogues[0].catalogue_id;
            } else {
              resolvedCatalogueId = null;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[storeApi] failed to resolve subdomain', err);
    }
  }

  if (!resolvedCatalogueId) {
    return {
      products: [],
      title: companyInfo?.companyName || null,
      source: 'api',
      catalogueId: null,
      companyInfo,
      catalogues,
      message: catalogues.length === 0 
        ? (subdomain ? `No catalogues found for '${subdomain}'.` : 'No catalogues specified.')
        : null,
    };
  }

  try {
    const live = await fetchWithAuthPaths(resolvedCatalogueId, apiBase, token, margin);
    if (live) {
      return {
        products: live.products,
        title: live.title || companyInfo?.companyName || null,
        source: 'api',
        catalogueId: resolvedCatalogueId,
        companyInfo,
        catalogues,
        message: live.products.length === 0 ? 'This catalogue has no products yet.' : null,
      };
    }
  } catch (err) {
    if (err.type === 'REQUIRES_ACCESS') {
      err.catalogueId = resolvedCatalogueId;
      err.companyInfo = companyInfo;
      err.catalogues = catalogues;
      throw err;
    }
    console.warn('[storeApi] live fetch failed', err);
  }

  return {
    products: [],
    title: companyInfo?.companyName || null,
    source: 'api',
    catalogueId: resolvedCatalogueId,
    companyInfo,
    catalogues,
    message: 'Catalogue not found or unable to fetch products.',
  };
}

export async function requestAccessToCatalogue(catalogueId, customerName, customerPhone) {
  const { apiBase } = getStoreConfig();
  const response = await fetch(`${apiBase}/catalogue/public/${catalogueId}/request-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ customerName, customerPhone }),
  });
  const body = await response.json();
  if (!response.ok || !body.status) {
    throw new Error(body.msg || 'Failed to request access.');
  }
  return body;
}

export async function bookPublicOrder(checkoutDetails) {
  const { catalogueId, apiBase, margin } = getStoreConfig();
  
  const payload = {
    catalogue_id: isNaN(parseInt(catalogueId, 10)) ? catalogueId : parseInt(catalogueId, 10),
    customer_name: checkoutDetails.customer.name,
    customer_phone: checkoutDetails.customer.phone,
    customer_address: checkoutDetails.customer.address,
    items: checkoutDetails.items.map((item) => ({
      product_id: parseInt(item.id, 10),
      qty: item.quantity,
      price: Number(item.price),
      selected_size: item.selectedSize && item.selectedSize !== 'One Size' ? item.selectedSize : null,
      selected_color: item.selectedColor ? item.selectedColor.name : null,
    })),
    subtotal: Number(checkoutDetails.subtotal),
    discount: Number(checkoutDetails.discount),
    shipping: 0,
    tax: Number(checkoutDetails.tax),
    total: Number(checkoutDetails.total),
    reseller_markup: Number(margin || 0),
  };

  const response = await fetch(`${apiBase}/order/public/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to save order to database.');
  }

  const result = await response.json();
  if (!result.status) {
    throw new Error(result.msg || 'Failed to save order to database.');
  }

  return result.data; // contains order_id and total
}
