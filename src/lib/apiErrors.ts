import axios from 'axios';

export function getHttpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function getApiErrorMessage(error: unknown, fallback = 'The request could not be completed. Please try again.'): string {
  const status = getHttpStatus(error);
  // Never surface unexpected server/transport exception text, identifiers or SQL.
  if (status != null && status >= 500) return 'The service could not complete this request. Please try again later.';
  if (status === 401) return 'Your session has expired or authentication is required. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource could not be found.';
  if (status === 409) return 'This request conflicts with existing account or payment state. Refresh the details before trying again.';
  if (status === 400) {
    if (axios.isAxiosError<unknown>(error)) {
      const data = error.response?.data;
      if (typeof data === 'object' && data != null && 'message' in data &&
          typeof data.message === 'string' && data.message.trim() && data.message.length <= 500) {
        return data.message;
      }
    }
    return 'Check the supplied details and payment terms, then try again.';
  }
  return fallback;
}
