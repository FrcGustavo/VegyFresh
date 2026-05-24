export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface ApiErrorPayload {
  message?: string;
}

const parseJsonSafely = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

// Default keeps legacy call sites working while new API services can opt into typed responses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchApi<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await parseJsonSafely<ApiErrorPayload>(response);
    throw new Error(error?.message || 'Error en la petición');
  }
  
  // For DELETE requests or empty responses
  if (response.status === 204) return null as T;
  
  return (await parseJsonSafely<T>(response)) as T;
}
