

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.vatikart.in';

function parseCatalogueIdFromPath() {
  const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9\-]+)/i)
    || window.location.pathname.match(/\/catalogue\/([a-zA-Z0-9\-]+)/i);
  return match ? match[1] : null;
}

export function getStoreConfig() {
  const hostname = window.location.hostname.toLowerCase();
  const parts = hostname.split('.');
  
  let subdomain = null;

  const isVatikartHost = hostname.endsWith('vatikart.in') || hostname.endsWith('localhost');

  if (isVatikartHost) {
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
      subdomain = parts[0];
    }
  } else {
    subdomain = hostname;
  }

  const params = new URLSearchParams(window.location.search);
  const catalogueId = params.get('catalogue') || params.get('catalogue_id') || parseCatalogueIdFromPath();
  const selectedIds = params.get('ids') ? params.get('ids').split(',').map(Number).filter(Number.isFinite) : [];
  const apiBase = (params.get('api') || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '');
  const token = params.get('token') || localStorage.getItem('vatikart_preview_token') || '';
  const storeName = params.get('store') || 'VatiKart Store';
  const margin = parseFloat(params.get('margin') || '0');
  const resellerName = params.get('reseller_name') || '';
  const resellerPhone = params.get('reseller_phone') || '';

  if (token) {
    localStorage.setItem('vatikart_preview_token', token);
  }

  return {
    subdomain,
    catalogueId,
    selectedIds,
    apiBase,
    token,
    storeName,
    margin: Number.isFinite(margin) ? margin : 0,
    resellerName,
    resellerPhone,
  };
}

export function compileTemplate(templateStr, varsObject = {}) {
  if (!templateStr) return '';
  return templateStr.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = varsObject[key.trim()];
    return value == null ? '' : String(value);
  });
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
  const sizeOptions = item.sizes?.length
    ? item.sizes.map((size) =>
        typeof size === 'string'
          ? { label: size, isSet: false, setQuantity: 1 }
          : {
              label: size.label,
              optionId: size.option_id,
              accent: size.accent || null,
              isSet: Boolean(size.is_set),
              setQuantity: Number(size.set_quantity || 1),
              sortOrder: size.sort_order ?? 0,
            }
      )
    : [{ label: 'One Size', isSet: false, setQuantity: 1 }];
  const tags = Array.isArray(item.tags)
    ? item.tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim())
    : [];

  return {
    id: item.product_id ?? item.id ?? index + 1,
    name: title,
    category,
    price,
    originalPrice: originalPrice,
    gstRate: item.gst_rate != null ? Number(item.gst_rate) : 0,
    unitType: item.unit_type || null,
    minimumOrderQty: item.minimum_order_qty != null ? Number(item.minimum_order_qty) : 1,
    bulkDiscounts: (item.bulk_discounts || []).map((d) => ({
      ...d,
      discounted_price: d.discounted_price != null ? Number((Number(d.discounted_price) * multiplier).toFixed(2)) : null,
    })),
    rating: 4.5,
    reviewsCount: 0,
    trackInventory: item.track_inventory !== false,
    tag: (item.track_inventory === false || item.total_stock > 0) ? 'In Stock' : 'Out of Stock',
    tags,
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
    sizeOptions,
    sizes: sizeOptions.map((size) => size.label),
    colors: item.colors?.length
      ? item.colors.map((c) => ({
          optionId: c.option_id,
          name: c.name || c.label || 'Default',
          hex: c.hex || c.accent || '#94a3b8',
          isSet: Boolean(c.is_set),
          setQuantity: Number(c.set_quantity || 1),
        }))
      : [{ name: 'Default', hex: '#94a3b8' }],
    inventoryItems: Array.isArray(item.inventory_items)
      ? item.inventory_items.map((inv) => ({
          sizeOptionId: inv.size_option_id ?? null,
          colorOptionId: inv.color_option_id ?? null,
          sizeLabel: inv.size_label ?? null,
          colorLabel: inv.color_label ?? null,
          quantity: Number(inv.quantity || 0),
        }))
      : [],
    options: {},
    priceMode: item.price_mode || 'perPiece',
    setQuantity: item.set_quantity != null ? Number(item.set_quantity) : null,
    setName: item.set_name || null,
  };
}

async function tryFetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
  });
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
  const cacheBust = Date.now();
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
    const separator = path.includes('?') ? '&' : '?';
    const body = await tryFetchJson(`${apiBase}${path}${separator}_ts=${cacheBust}`, { headers });
    if (body?.status && Array.isArray(body.data)) {
      return {
        products: body.data.map((item, index) => mapApiProduct(item, index, margin)),
        title: body.title || null,
        bannerText: body.bannerText ?? null,
        bannerActive: body.bannerActive ?? false,
        bannerImgPath: body.bannerImgPath ?? null,
        wholesalePricingApplied: body.wholesalePricingApplied ?? false,
        wholesaleGroupName: body.wholesaleGroupName ?? null,
        catalogShareTemplate: body.catalogShareTemplate ?? null,
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
  const { subdomain, catalogueId: configCatalogueId, selectedIds, apiBase, token, margin } = getStoreConfig();
  
  let resolvedCatalogueId = overrideCatalogueId !== undefined ? overrideCatalogueId : configCatalogueId;

  let catalogues = [];
  let companyInfo = null;

  if (subdomain) {
    try {
      const phone = localStorage.getItem('vatikart_customer_phone');
      const phoneQuery = phone ? `&customer_phone=${encodeURIComponent(phone)}` : '';
      const response = await fetch(`${apiBase}/company/resolve-subdomain/${subdomain}?_ts=${Date.now()}${phoneQuery}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        const body = await response.json();
        if (body?.status && body.data) {
          companyInfo = {
            companyId: body.data.company_id,
            companyName: body.data.company_name,
            tagline: body.data.tagline || null,
            logoImgPath: body.data.logo_img_path,
            salesPhone: body.data.sales_phone || body.data.salesPhone || null,
            supportPhone: body.data.support_phone || body.data.supportPhone || null,
            policies: body.data.policies || null,
            showDownloadButtons: body.data.show_download_buttons ?? true,
            address: body.data.address || null,
            pincode: body.data.pincode || null,
            email: body.data.email || null,
            supportEmail: body.data.support_email || body.data.supportEmail || null,
            salesEmail: body.data.sales_email || body.data.salesEmail || null,
          };
          catalogues = (body.data.catalogues || []).map((catalogue) => ({
            ...catalogue,
            title: catalogue.title || catalogue.catalogue_name || 'Unnamed Catalogue',
          }));
          
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
      const products = selectedIds.length > 0
        ? live.products.filter((product) => selectedIds.includes(Number(product.id)))
        : live.products;

      return {
        products,
        title: live.title || companyInfo?.companyName || null,
        source: 'api',
        catalogueId: resolvedCatalogueId,
        companyInfo,
        catalogues,
        bannerText: live.bannerText ?? null,
        bannerActive: live.bannerActive ?? false,
        bannerImgPath: live.bannerImgPath ?? null,
        wholesalePricingApplied: live.wholesalePricingApplied ?? false,
        wholesaleGroupName: live.wholesaleGroupName ?? null,
        catalogShareTemplate: live.catalogShareTemplate ?? null,
        message: products.length === 0 ? 'This catalogue has no products yet.' : null,
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
    wholesalePricingApplied: false,
    wholesaleGroupName: null,
    catalogShareTemplate: null,
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

export async function bookPublicOrder(checkoutDetails, catalogueIdOverride = null) {
  const { catalogueId: configCatalogueId, apiBase, margin } = getStoreConfig();
  const catalogueId = catalogueIdOverride || configCatalogueId || checkoutDetails?.catalogue_id;

  const customer = checkoutDetails?.customer || {};
  const buyerName = String(customer.name || checkoutDetails?.buyer_name || '').trim();
  const buyerPhone = String(customer.phone || checkoutDetails?.buyer_phone || '').replace(/\D/g, '');
  const buyerAddress = String(customer.address || checkoutDetails?.buyer_address || 'N/A').trim() || 'N/A';

  const rawItems = Array.isArray(checkoutDetails?.items) ? checkoutDetails.items : [];
  const items = rawItems
    .map((item) => {
      const productId = Number(item.product_id ?? item.productId ?? item.id);
      const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1) || 1);
      const price = Number(item.price ?? 0);
      if (!Number.isFinite(productId) || productId <= 0) return null;
      return {
        product_id: productId,
        qty,
        price: Number.isFinite(price) ? price : 0,
        selected_size: item.selectedSize && item.selectedSize !== 'One Size' ? item.selectedSize : (item.selected_size || null),
        selected_color: item.selectedColor?.name || item.selected_color || null,
      };
    })
    .filter(Boolean);

  if (!catalogueId) {
    throw new Error('Missing catalogue. Please reload the storefront and try again.');
  }
  if (!buyerName || buyerPhone.length < 10) {
    throw new Error('Please enter a valid name and 10-digit phone number.');
  }
  if (items.length === 0) {
    throw new Error('Your cart is empty or contains invalid products.');
  }

  const payload = {
    catalogue_id: isNaN(parseInt(String(catalogueId), 10)) ? catalogueId : parseInt(String(catalogueId), 10),
    company_id: checkoutDetails?.company_id ?? checkoutDetails?.companyId ?? null,
    customer_name: buyerName,
    buyer_name: buyerName,
    customer_phone: buyerPhone,
    buyer_phone: buyerPhone,
    customer_address: buyerAddress,
    items,
    subtotal: Number(checkoutDetails?.subtotal ?? 0) || 0,
    discount: Number(checkoutDetails?.discount ?? 0) || 0,
    shipping: Number(checkoutDetails?.shipping ?? 0) || 0,
    tax: Number(checkoutDetails?.tax ?? 0) || 0,
    total: Number(checkoutDetails?.total ?? 0) || 0,
    reseller_markup: Number(margin || 0),
  };

  let response;
  try {
    response = await fetch(`${apiBase}/order/public/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error('Network error while saving order. Please check your connection.');
  }

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok || !result?.status) {
    const detail =
      (typeof result?.error === 'string' && result.error)
      || result?.msg
      || (result?.error && typeof result.error === 'object'
        ? Object.values(result.error).join(', ')
        : null)
      || `Failed to save order to database. (${response.status})`;
    throw new Error(detail);
  }

  return result.data; // contains order_id and total
}

export async function sendStorefrontOtp(phone) {
  const { apiBase } = getStoreConfig();
  const response = await fetch(`${apiBase}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ phone: String(phone || '').replace(/\D/g, '') }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.status) {
    throw new Error(body?.msg || 'Failed to send OTP');
  }
  return body;
}

export async function verifyStorefrontOtp(phone, otp) {
  const { apiBase } = getStoreConfig();
  const response = await fetch(`${apiBase}/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      phone: String(phone || '').replace(/\D/g, ''),
      otp: String(otp || '').trim(),
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.status) {
    throw new Error(body?.msg || 'Invalid or expired OTP');
  }
  return body;
}

export async function fetchMyOrders(phone, sessionToken) {
  const { apiBase } = getStoreConfig();
  const response = await fetch(
    `${apiBase}/order/my-orders?phone=${encodeURIComponent(String(phone || '').replace(/\D/g, ''))}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${sessionToken}`,
        'x-otp-session': sessionToken,
      },
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.status) {
    throw new Error(body?.msg || 'Failed to fetch customer orders.');
  }
  return Array.isArray(body.data) ? body.data : [];
}

export async function registerCustomerPushToken(phone, pushToken) {
  const { apiBase } = getStoreConfig();
  try {
    const response = await fetch(`${apiBase}/user/customer/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ phone, pushToken }),
    });
    if (!response.ok) {
      console.warn('[storeApi] failed to save customer push token');
    }
  } catch (err) {
    console.warn('[storeApi] push token registration error', err);
  }
}

