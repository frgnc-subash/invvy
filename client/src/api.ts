import { API_URL } from './config';
import type { Category, DashboardStats, Inventory, Item, ItemCreate, ItemUpdate, Notification, User } from './types';

export const TOKEN_KEY = 'inventrack_token';

type Token = {
  access_token: string;
  token_type: string;
};

type RequestOptions = {
  method?: string;
  auth?: boolean;
  body?: unknown;
};

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const REQUEST_CACHE_TTL_MS = 30_000;
const requestCache = new Map<string, CacheEntry>();
const requestInflight = new Map<string, Promise<unknown>>();

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function handleUnauthorized() {
  invalidateApiCache();
  localStorage.removeItem(TOKEN_KEY);
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export function invalidateApiCache() {
  requestCache.clear();
  requestInflight.clear();
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((entry: { msg?: string }) => entry.msg || JSON.stringify(entry)).join(', ');
    }
    return JSON.stringify(data.detail || data);
  } catch {
    return response.statusText || 'Request failed';
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isCacheable = method === 'GET' && options.body === undefined;
  const headers: HeadersInit = {};
  const token = getToken();
  const cacheKey = isCacheable ? `${method}|${options.auth !== false ? 'auth' : 'public'}|${token || ''}|${path}` : '';

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (isCacheable) {
    const cached = requestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const inflight = requestInflight.get(cacheKey);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const fetchPromise = fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  }).then(async (response) => {
    if (response.status === 401) {
      handleUnauthorized();
    }

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  });

  if (!isCacheable) {
    return fetchPromise;
  }

  requestInflight.set(cacheKey, fetchPromise);

  try {
    const value = await fetchPromise;
    requestCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
    });
    return value;
  } finally {
    requestInflight.delete(cacheKey);
  }
}

export function register(email: string, password: string, name?: string) {
  return request<Token>('/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, name: name || undefined },
  }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function login(email: string, password: string) {
  return request<Token>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function getMe() {
  return request<User>('/auth/me');
}

export function getDashboardStats() {
  return request<DashboardStats>('/dashboard/stats');
}

export function getNotifications(archived = false) {
  return request<Notification[]>(`/notifications?archived=${archived}`);
}

export function markNotificationRead(id: string) {
  return request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function archiveNotification(id: string) {
  return request<Notification>(`/notifications/${id}/archive`, { method: 'PATCH' }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function getInventories() {
  return request<Inventory[]>('/inventories');
}

export function createInventory(name: string, description?: string) {
  return request<Inventory>('/inventories', {
    method: 'POST',
    body: { name, description: description || undefined },
  }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function updateInventory(id: string, name: string, description?: string) {
  return request<Inventory>(`/inventories/${id}`, {
    method: 'PUT',
    body: { name, description: description || undefined },
  }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function deleteInventory(id: string) {
  return request<void>(`/inventories/${id}`, { method: 'DELETE' }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function getInventory(id: string) {
  return request<Inventory>(`/inventories/${id}`);
}

export function getCategories(invId: string) {
  return request<Category[]>(`/inventories/${invId}/categories`);
}

export function createCategory(invId: string, name: string, description?: string) {
  return request<Category>(`/inventories/${invId}/categories`, {
    method: 'POST',
    body: { name, description: description || undefined },
  }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function updateCategory(invId: string, catId: string, name: string, description?: string) {
  return request<Category>(`/inventories/${invId}/categories/${catId}`, {
    method: 'PUT',
    body: { name, description: description || undefined },
  }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function deleteCategory(invId: string, catId: string) {
  return request<void>(`/inventories/${invId}/categories/${catId}`, { method: 'DELETE' }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function getItems(params?: { cat_id?: string; inv_id?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.cat_id) searchParams.set('cat_id', params.cat_id);
  if (params?.inv_id) searchParams.set('inv_id', params.inv_id);
  const query = searchParams.toString();
  return request<Item[]>(`/items${query ? `?${query}` : ''}`);
}

export function createItem(data: ItemCreate) {
  return request<Item>('/items', { method: 'POST', body: data }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function updateItem(id: string, data: ItemUpdate) {
  return request<Item>(`/items/${id}`, { method: 'PUT', body: data }).then((value) => {
    invalidateApiCache();
    return value;
  });
}

export function deleteItem(id: string) {
  return request<void>(`/items/${id}`, { method: 'DELETE' }).then((value) => {
    invalidateApiCache();
    return value;
  });
}
