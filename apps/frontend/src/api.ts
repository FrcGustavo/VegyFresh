export const API_URL = 'http://localhost:3000';

export async function fetchApi(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error en la petición');
  }
  
  // For DELETE requests or empty responses
  if (response.status === 204) return null;
  
  return response.json();
}
