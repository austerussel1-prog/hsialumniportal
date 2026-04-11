import { API_URL } from './api';

const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [700, 1500];

const sleep = (delayMs) => new Promise((resolve) => {
  window.setTimeout(resolve, delayMs);
});

const normalizeUrl = (value) => String(value || '').trim();

const getRequestUrl = (input) => {
  if (typeof input === 'string') return input;
  if (input && typeof input.url === 'string') return input.url;
  return '';
};

const getRequestMethod = (input, init) => {
  const explicitMethod = init && typeof init.method === 'string' ? init.method : '';
  const requestMethod = input && typeof input.method === 'string' ? input.method : '';
  return String(explicitMethod || requestMethod || 'GET').trim().toUpperCase();
};

const isBackendRequest = (url) => {
  const normalizedUrl = normalizeUrl(url);
  const normalizedApiUrl = normalizeUrl(API_URL).replace(/\/$/, '');

  if (!normalizedUrl) return false;
  if (normalizedUrl.startsWith('/api/') || normalizedUrl.startsWith('/uploads/')) return true;
  if (!normalizedApiUrl) return false;

  return normalizedUrl === normalizedApiUrl
    || normalizedUrl.startsWith(`${normalizedApiUrl}/api/`)
    || normalizedUrl.startsWith(`${normalizedApiUrl}/uploads/`);
};

const shouldRetryNetworkError = (error) => error && error.name !== 'AbortError';

export const installApiFetchResilience = () => {
  if (typeof window === 'undefined') return;
  if (window.__HSI_FETCH_RESILIENCE_INSTALLED__) return;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = getRequestUrl(input);
    const method = getRequestMethod(input, init);
    const canRetry = isBackendRequest(url) && RETRYABLE_METHODS.has(method);

    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = await nativeFetch(input, init);
        const shouldRetryStatus = canRetry && RETRYABLE_STATUS_CODES.has(response.status) && attempt < RETRY_DELAYS_MS.length;
        if (!shouldRetryStatus) {
          return response;
        }
      } catch (error) {
        const shouldRetry = canRetry && shouldRetryNetworkError(error) && attempt < RETRY_DELAYS_MS.length;
        if (!shouldRetry) {
          throw error;
        }
      }

      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  };

  window.__HSI_FETCH_RESILIENCE_INSTALLED__ = true;
};

export const warmBackendConnection = () => {
  if (typeof window === 'undefined') return;
  if (window.__HSI_BACKEND_WARMUP_STARTED__) return;

  const healthUrl = API_URL
    ? `${API_URL}/api/health`
    : (import.meta.env.DEV ? '/api/health' : '');

  if (!healthUrl) return;

  window.__HSI_BACKEND_WARMUP_STARTED__ = true;
  window.fetch(healthUrl, {
    method: 'GET',
    cache: 'no-store',
    keepalive: true,
  }).catch(() => {
    // Ignore warm-up failures. The retry wrapper handles real requests.
  });
};