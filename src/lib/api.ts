import { auth } from './firebase';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Safely parses response as JSON, checking content-type and HTTP status
 * to prevent SyntaxError: Unexpected token '<' on HTML responses.
 */
export async function safeParseJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  
  if (!contentType.includes('application/json')) {
    const rawText = await res.text().catch(() => '');
    console.warn(`[API] Expected JSON but received ${contentType || 'unknown type'} (status ${res.status}):`, rawText.slice(0, 200));

    if (res.status === 401) {
      throw new Error('Authentication required: Please sign in to ask questions about your journal.');
    }
    if (res.status === 403) {
      throw new Error("MindVault couldn't access your memories right now. Please try again.");
    }
    if (res.status === 404) {
      throw new Error('The requested MindVault API endpoint was not found.');
    }
    if (res.status === 429) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }
    if (res.status >= 500) {
      throw new Error('MindVault service is momentarily busy. Please try again in a few moments.');
    }
    throw new Error(`Server returned an unexpected response format (${res.status}).`);
  }

  try {
    const data = await res.json();
    return data as T;
  } catch (err) {
    console.error('[API] Failed to parse JSON body:', err);
    throw new Error('Invalid response received from server. Please try again.');
  }
}
