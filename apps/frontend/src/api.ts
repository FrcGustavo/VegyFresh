export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiErrorPayload {
  message?: string;
}

const parseJson = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text || !text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Respuesta inválida del servidor');
  }
};

const parseErrorPayload = async (response: Response): Promise<ApiErrorPayload | null> => {
  try {
    return await parseJson<ApiErrorPayload>(response);
  } catch {
    return null;
  }
};

// ─── Token refresh queue ──────────────────────────────────────────────────────
let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

async function attemptTokenRefresh(): Promise<string | null> {
  // Lazy imports to avoid circular dependency issues at module init
  const { authStorage } = await import('./auth/authStorage');
  const { authApi } = await import('./auth/authApi');

  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) {
    authStorage.clearTokens();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    return null;
  }

  try {
    const tokens = await authApi.refresh(refreshToken);
    authStorage.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens.access_token;
  } catch {
    authStorage.clearTokens();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    return null;
  }
}

function buildHeaders(accessToken: string | null, extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extra,
  };
}

// Default keeps legacy call sites working while new API services can opt into typed responses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchApi<T = any>(endpoint: string, options?: RequestInit): Promise<T | null> {
  const { authStorage } = await import('./auth/authStorage');
  const accessToken = authStorage.getAccessToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(accessToken, options?.headers),
  });

  if (response.status === 401) {
    let newToken: string | null = null;

    if (_isRefreshing) {
      // Queue subsequent 401s until the ongoing refresh resolves
      newToken = await new Promise<string | null>((resolve) => {
        _refreshQueue.push(resolve);
      });
    } else {
      _isRefreshing = true;
      try {
        newToken = await attemptTokenRefresh();
      } finally {
        _refreshQueue.forEach((cb) => cb(newToken ?? null));
        _refreshQueue = [];
        _isRefreshing = false;
      }
    }

    if (!newToken) {
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }

    // Retry original request with new token
    const retryResponse = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: buildHeaders(newToken, options?.headers),
    });

    if (!retryResponse.ok) {
      const error = await parseErrorPayload(retryResponse);
      throw new Error(error?.message || 'Error en la petición');
    }

    if (retryResponse.status === 204) return null;
    return parseJson<T>(retryResponse);
  }

  if (!response.ok) {
    const error = await parseErrorPayload(response);
    throw new Error(error?.message || 'Error en la petición');
  }

  // For DELETE requests or empty responses
  if (response.status === 204) return null;

  return parseJson<T>(response);
}
