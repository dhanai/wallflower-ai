'use client';

export interface ApiRequestOptions extends RequestInit {
  /** Override default behaviour of parsing JSON. */
  parseJson?: boolean;
}

export interface ApiErrorShape {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  public status: number;
  public payload?: ApiErrorShape;

  constructor(message: string, status: number, payload?: ApiErrorShape) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request<T = unknown>(input: string, options: ApiRequestOptions = {}): Promise<T> {
  const { parseJson = true, headers, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();
  const hasBody = rest.body != null && rest.body !== undefined;

  const finalHeaders = new Headers({ Accept: 'application/json' });
  if (headers) {
    const incoming = headers instanceof Headers ? headers : new Headers(headers as HeadersInit);
    incoming.forEach((value, key) => finalHeaders.set(key, value));
  }

  if (hasBody || method !== 'GET') {
    if (!finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(input, {
    credentials: 'include',
    headers: finalHeaders,
    ...rest,
  });

  console.log('[apiClient] response status', response.status, 'for', input);

  if (!response.ok) {
    let payload: ApiErrorShape | undefined;

    try {
      payload = await response.clone().json();
    } catch (_) {
      // ignore json parse errors for non-json responses
    }

    const message = payload?.error || payload?.message || response.statusText || 'Request failed';
    throw new ApiError(message, response.status, payload);
  }

  if (!parseJson) {
    // caller wants raw response (for blobs/forms etc.)
    return undefined as T;
  }

  try {
    const json = await response.json();
    console.log('[apiClient] parsed json for', input, json);
    return json as T;
  } catch (error) {
    throw new ApiError('Failed to parse response JSON', response.status, { error: (error as Error).message });
  }
}

export const apiClient = {
  get<T = unknown>(url: string, options?: ApiRequestOptions) {
    return request<T>(url, { method: 'GET', ...options });
  },
  post<T = unknown>(url: string, body?: unknown, options?: ApiRequestOptions) {
    return request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  },
  put<T = unknown>(url: string, body?: unknown, options?: ApiRequestOptions) {
    return request<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  },
  delete<T = unknown>(url: string, options?: ApiRequestOptions) {
    return request<T>(url, { method: 'DELETE', ...options });
  },
};


