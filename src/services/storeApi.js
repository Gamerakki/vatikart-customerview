import { products as fallbackProducts } from '../data/products';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.vatikart.in';

function parseCatalogueIdFromPath() {
  const match = window.location.pathname.match(/\/c\/(\d+)/i)
    || window.location.pathname.match(/\/catalogue\/(\d+)/i);
  return match ? match[1] : null;
}

export function getStoreConfig() {
  const params = new URLSearchParams(window.location.search);
  const catalogueId = params.get('catalogue') || params.get('catalogue_id') || parseCatalogueIdFromPath();
  const apiBase = (params.get('api') || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '');
  const token = params.get('token') || localStorage.getItem('vatikart_preview_token') || '';
  const storeName = params.get('store') || 'VatiKart Store';

  if (token) {
    localStorage.setItem('vatikart_preview_token', token);
  }

  return { catalogueId, apiBase, token, storeName };
}

function mapApiProduct(item, index) {
  const price = Number(item.price) || 0;
  const title = item.product || item.title || `Product ${index + 1}`;
  const category = item.category || item.slug || 'General';

  return {
    id: item.product_id ?? item.id ?? index + 1,
    name: title,
    category,
    price,
    originalPrice: price,
    rating: 4.5,
    reviewsCount: 0,
    tag: item.total_stock > 0 ? 'In Stock' : 'Out of Stock',
    description: item.description || item.slug || title,
    image:
      item.img_path
      || item.imageUri
      || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60',
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
  };
}

async function tryFetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchWithAuthPaths(catalogueId, apiBase, token) {
  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const paths = [
    `/product/fetch-list/${catalogueId}`,
    `/catalogue/${catalogueId}/products`,
    `/catalogue/public/${catalogueId}/products`,
    `/store/catalogue/${catalogueId}/products`,
  ];

  for (const path of paths) {
    const body = await tryFetchJson(`${apiBase}${path}`, { headers });
    if (body?.status && Array.isArray(body.data) && body.data.length >= 0) {
      return body.data.map(mapApiProduct);
    }
    if (Array.isArray(body) && body.length > 0) {
      return body.map(mapApiProduct);
    }
  }

  return null;
}

export async function loadStoreProducts() {
  const { catalogueId, apiBase, token } = getStoreConfig();

  if (!catalogueId) {
    return {
      products: fallbackProducts,
      source: 'static',
      catalogueId: null,
      message: 'No catalogue id in URL — showing demo catalog. Use ?catalogue=ID&token=JWT for live preview.',
    };
  }

  try {
    const live = await fetchWithAuthPaths(catalogueId, apiBase, token);
    if (live && live.length > 0) {
      return {
        products: live,
        source: 'api',
        catalogueId,
        message: null,
      };
    }

    if (live && live.length === 0) {
      return {
        products: [],
        source: 'api',
        catalogueId,
        message: 'This catalogue has no published products yet.',
      };
    }
  } catch (err) {
    console.warn('[storeApi] live fetch failed', err);
  }

  return {
    products: fallbackProducts,
    source: 'fallback',
    catalogueId,
    message: token
      ? 'Could not load live catalogue — showing demo products.'
      : 'Add ?token=YOUR_JWT from merchant console for authenticated preview, or publish products on the API.',
  };
}
