import { HttpError } from "../api/httpClient";

export function isAuthError(error: unknown) {
  return (
    error instanceof HttpError && (error.status === 401 || error.status === 403)
  );
}
