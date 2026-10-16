/**
 * Gerenciamento seguro de autenticação e sessão do Painel Administrativo.
 * Armazena token JWT/HMAC no sessionStorage e provê headers e wrapper
 * adminFetch para proteger as rotas de CRM e dados sensíveis.
 */

export const ADMIN_TOKEN_KEY = 'admin_token';
export const ADMIN_AUTH_KEY = 'admin_authenticated';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string) {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
  } catch {}
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
  } catch {}
}

export function getAdminAuthHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const token = getAdminToken();
  const headers = new Headers(customHeaders);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export function withAdminToken(url: string): string {
  const token = getAdminToken();
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Wrapper seguro para requisições da área administrativa.
 * Adiciona automaticamente Authorization: Bearer <token> e gerencia expiração de sessão.
 */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input && typeof input === 'object' && 'url' in input) {
    url = (input as Request).url;
  }

  const token = getAdminToken();
  const headers = new Headers(init?.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (response.status === 401 && !url.includes('/api/admin/login')) {
    clearAdminToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin-session-expired'));
    }
  }

  return response;
}

let isInterceptorInstalled = false;

/**
 * Tenta instalar um interceptor global em window.fetch de forma não-bloqueante
 * e segura contra ambientes restritos (como iframes onde window.fetch é somente leitura).
 */
export function setupAdminFetchInterceptor() {
  if (isInterceptorInstalled || typeof window === 'undefined') return;
  isInterceptorInstalled = true;

  try {
    const originalFetch = window.fetch;
    if (typeof originalFetch !== 'function') return;

    const interceptedFetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input && typeof input === 'object' && 'url' in input) {
        url = (input as Request).url;
      }

      const token = getAdminToken();
      const isAdminApi = url.includes('/api/leads') ||
        url.includes('/api/imported-leads') ||
        url.includes('/api/eleicoes') ||
        url.includes('/api/causa-animal') ||
        url.includes('/api/debug-db') ||
        (url.includes('/api/material') && init?.method && init.method !== 'POST') ||
        (url.includes('/api/ninapassadore') && init?.method && init.method !== 'POST') ||
        (url.includes('/api/popup-apoio') && init?.method && init.method !== 'POST') ||
        (url.includes('/api/petitions') && init?.method && init.method !== 'POST') ||
        (url.includes('/api/contra-maus-tratos') && init?.method && init.method !== 'POST') ||
        (url.includes('/api/citizens') && init?.method && init.method !== 'POST') ||
        (url.includes('/api/jogo/users')) ||
        (url.includes('/api/protocols') && (init?.method === 'PUT' || init?.method === 'DELETE'));

      if (token && (isAdminApi || !init?.method || init.method === 'GET')) {
        const headers = new Headers(init?.headers);
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        init = {
          ...init,
          headers
        };
      }

      return originalFetch.call(window, input, init).then(response => {
        if (response.status === 401 && isAdminApi && !url.includes('/api/admin/login')) {
          clearAdminToken();
          window.dispatchEvent(new CustomEvent('admin-session-expired'));
        }
        return response;
      });
    };

    // Tenta definir com Object.defineProperty; se falhar silenciosamente captura sem quebrar
    try {
      Object.defineProperty(window, 'fetch', {
        value: interceptedFetch,
        writable: true,
        configurable: true
      });
    } catch {
      try {
        (window as any).fetch = interceptedFetch;
      } catch {
        // Ambiente com proteção restrita a sobrescrita de fetch
      }
    }
  } catch {
    // Falha silenciosa para não travar o carregamento do app
  }
}
