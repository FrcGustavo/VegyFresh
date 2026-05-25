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
type RefreshQueueResult = {
  token: string | null;
  error: Error | null;
};
let _refreshQueue: Array<(result: RefreshQueueResult) => void> = [];

const getErrorStatus = (error: unknown): number | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status;
  }

  return null;
};

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
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 401 || status === 403) {
      authStorage.clearTokens();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return null;
    }

    throw error;
  }
}

function buildHeaders(
  accessToken: string | null,
  options?: RequestInit,
  forceAuthorization = false,
): HeadersInit {
  const headers = new Headers(options?.headers);
  const body = options?.body;

  const shouldSetJsonContentType =
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob);

  if (shouldSetJsonContentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken && (forceAuthorization || !headers.has('Authorization'))) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

// Default keeps legacy call sites working while new API services can opt into typed responses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchApi<T = any>(endpoint: string, options?: RequestInit): Promise<T | null> {
  const { authStorage } = await import('./auth/authStorage');
  const accessToken = authStorage.getAccessToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(accessToken, options),
  });

  if (response.status === 401) {
    let newToken: string | null = null;

    if (_isRefreshing) {
      // Queue subsequent 401s until the ongoing refresh resolves
      const refreshResult = await new Promise<RefreshQueueResult>((resolve) => {
        _refreshQueue.push(resolve);
      });
      if (refreshResult.error) {
        throw refreshResult.error;
      }
      newToken = refreshResult.token;
    } else {
      _isRefreshing = true;
      let refreshError: Error | null = null;
      try {
        newToken = await attemptTokenRefresh();
      } catch (error) {
        refreshError =
          error instanceof Error
            ? error
            : new Error('No fue posible refrescar la sesión');
      } finally {
        _refreshQueue.forEach((cb) =>
          cb({ token: newToken ?? null, error: refreshError }),
        );
        _refreshQueue = [];
        _isRefreshing = false;
      }

      if (refreshError) {
        throw refreshError;
      }
    }

    if (!newToken) {
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }

    // Retry original request with new token
    const retryResponse = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: buildHeaders(newToken, options, true),
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
