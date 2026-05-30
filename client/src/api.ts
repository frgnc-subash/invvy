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

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY);
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
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
  const headers: HeadersInit = {};
  const token = getToken();

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

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
}

export function register(email: string, password: string, name?: string) {
  return request<Token>('/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, name: name || undefined },
  });
}

export function login(email: string, password: string) {
  return request<Token>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
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
  return request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function archiveNotification(id: string) {
  return request<Notification>(`/notifications/${id}/archive`, { method: 'PATCH' });
}

export function getInventories() {
  return request<Inventory[]>('/inventories');
}

export function createInventory(name: string, description?: string) {
  return request<Inventory>('/inventories', {
    method: 'POST',
    body: { name, description: description || undefined },
  });
}

export function updateInventory(id: string, name: string, description?: string) {
  return request<Inventory>(`/inventories/${id}`, {
    method: 'PUT',
    body: { name, description: description || undefined },
  });
}

export function deleteInventory(id: string) {
  return request<void>(`/inventories/${id}`, { method: 'DELETE' });
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
  });
}

export function updateCategory(invId: string, catId: string, name: string, description?: string) {
  return request<Category>(`/inventories/${invId}/categories/${catId}`, {
    method: 'PUT',
    body: { name, description: description || undefined },
  });
}

export function deleteCategory(invId: string, catId: string) {
  return request<void>(`/inventories/${invId}/categories/${catId}`, { method: 'DELETE' });
}

export function getItems(params?: { cat_id?: string; inv_id?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.cat_id) searchParams.set('cat_id', params.cat_id);
  if (params?.inv_id) searchParams.set('inv_id', params.inv_id);
  const query = searchParams.toString();
  return request<Item[]>(`/items${query ? `?${query}` : ''}`);
}

export function createItem(data: ItemCreate) {
  return request<Item>('/items', { method: 'POST', body: data });
}

export function updateItem(id: string, data: ItemUpdate) {
  return request<Item>(`/items/${id}`, { method: 'PUT', body: data });
}

export function deleteItem(id: string) {
  return request<void>(`/items/${id}`, { method: 'DELETE' });
}
