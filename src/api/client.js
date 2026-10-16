// Shared API client for the SubMate backend. All browser-to-PostgreSQL traffic
// flows through these functions; the database connection string never reaches
// the frontend.
//
// Session cookies are HttpOnly, so the browser attaches them automatically. We
// use `credentials: 'include'` so the same session works whether the API is
// same-origin (bundled SPA) or an explicitly trusted cross-origin/CORS host.
// When the server reports an expired session the client broadcasts an event that
// the app listens for, sending the user back to the sign-in screen.

export class ApiError extends Error {
  constructor(status, body = {}) {
    super((body && body.error && body.error.message) || 'The request failed.');
    this.name = 'ApiError';
    this.status = status;
    this.code = body && body.error ? body.error.code : undefined;
    this.details = body && body.error ? body.error.details : undefined;
    this.validation =
      this.details && this.details.fields ? this.details.fields : null;
  }
}

export const UNAUTHORIZED_EVENT = 'submate:unauthorized';

async function request(path, { method = 'GET', body, headers } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, {
      error: { message: 'Cannot reach the SubMate backend. Is the server running?' },
    });
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new ApiError(response.status, payload);
    if (
      response.status === 401 &&
      error.code !== 'INVALID_CREDENTIALS' &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: error }));
    }
    throw error;
  }
  return payload;
}

function toQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const api = {
  health: () => request('/health'),

  auth: {
    me: () => request('/auth/me'),
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },

  catalog: () => request('/catalog'),
  catalogEntry: (serviceKey) => request(`/catalog/${encodeURIComponent(serviceKey)}`),

  subscriptions: {
    list: (params = {}) => request(`/subscriptions${toQuery(params)}`),
    get: (id) => request(`/subscriptions/${id}`),
    create: (body, force = false) =>
      request(`/subscriptions${force ? '?force=true' : ''}`, { method: 'POST', body }),
    update: (id, body, force = false) =>
      request(`/subscriptions/${id}${force ? '?force=true' : ''}`, { method: 'PUT', body }),
    setStatus: (id, status) =>
      request(`/subscriptions/${id}/status`, { method: 'PATCH', body: { status } }),
    remove: (id) => request(`/subscriptions/${id}`, { method: 'DELETE' }),
  },

  dashboard: () => request('/dashboard'),

  settings: {
    get: () => request('/settings'),
    update: (body) => request('/settings', { method: 'PUT', body }),
  },

  exportUrl: () => '/api/export.csv',
};

export function downloadExport() {
  window.location.assign(api.exportUrl());
}
