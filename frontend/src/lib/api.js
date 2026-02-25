export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

async function request(path, options = {}, requestOptions = {}) {
  const token = localStorage.getItem('erp_auth_token');
  const authHeaders =
    !requestOptions.skipAuth && token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  get: (path, requestOptions) => request(path, {}, requestOptions),
  post: (path, body, requestOptions) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }, requestOptions),
  put: (path, body, requestOptions) =>
    request(path, { method: 'PUT', body: JSON.stringify(body) }, requestOptions),
  delete: (path, requestOptions) => request(path, { method: 'DELETE' }, requestOptions)
};
