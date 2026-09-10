import {
  HttpClient,
  HttpError,
  HttpErrorCodes,
  HttpErrorMessage,
  HttpMethods,
  HttpResponse,
  RequestConfig,
  StatusCodes,
} from 'core/http';

export type ErrorMapper = (body: unknown, status: number, requestId: string) => HttpError;

interface FetchAdapterOptions {
  baseUrl: string;
  mapError: ErrorMapper;
}

interface SendOptions extends RequestConfig {
  body?: unknown;
  method: HttpMethods;
}

/**
 * Единственное место в приложении, где вызывается fetch. Здесь собираются заголовки,
 * сериализуется тело, проверяется статус, разбирается ответ и вычитываются ETag,
 * Location и Retry-After. Выше по стеку остаются только данные и HttpError.
 */
export class FetchAdapter implements HttpClient {
  constructor(private readonly _options: FetchAdapterOptions) {}

  get = <TData>(url: string, config?: RequestConfig): Promise<HttpResponse<TData>> =>
    this._send<TData>(url, { ...config, method: HttpMethods.GET });

  post = <TData, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestConfig,
  ): Promise<HttpResponse<TData>> =>
    this._send<TData>(url, { ...config, body, method: HttpMethods.POST });

  put = <TData, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestConfig,
  ): Promise<HttpResponse<TData>> =>
    this._send<TData>(url, { ...config, body, method: HttpMethods.PUT });

  resolve = (path: string): string => new URL(path, this._options.baseUrl).toString();

  private _send = async <TData>(
    url: string,
    options: SendOptions,
  ): Promise<HttpResponse<TData>> => {
    const response = await this._fetch(url, options);

    return this._toResponse<TData>(response);
  };

  private _fetch = async (url: string, options: SendOptions): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };

    if (options.ifMatch) {
      headers['If-Match'] = options.ifMatch;
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      return await fetch(this._toUrl(url, options.query), {
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        cache: 'no-store',
        headers,
        method: options.method,
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      throw new HttpError(
        HttpErrorMessage.network,
        StatusCodes.NETWORK_ERROR,
        HttpErrorCodes.NETWORK,
      );
    }
  };

  private _toResponse = async <TData>(response: Response): Promise<HttpResponse<TData>> => {
    const requestId = response.headers.get('X-Request-Id') ?? '';
    const text = await this._readText(response);

    if (!response.ok) {
      throw this._options.mapError(this._parse(text), response.status, requestId);
    }

    const value = this._parse(text);

    if (value === undefined) {
      throw new HttpError(
        HttpErrorMessage.unknown,
        response.status,
        HttpErrorCodes.UNKNOWN,
        requestId,
      );
    }

    return {
      data: value as TData,
      etag: response.headers.get('ETag'),
      location: response.headers.get('Location'),
      requestId,
      retryAfterMs: this._toRetryAfterMs(response.headers.get('Retry-After')),
      status: response.status,
    };
  };

  private _readText = async (response: Response): Promise<string | null> => {
    if (
      response.status === StatusCodes.NO_CONTENT ||
      response.status === StatusCodes.NOT_MODIFIED
    ) {
      return null;
    }

    const text = await response.text();

    return text === '' ? null : text;
  };

  /** undefined — тело есть, но это не JSON; null — тела нет. */
  private _parse = (text: string | null): unknown => {
    if (text === null) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };

  private _toRetryAfterMs = (header: string | null): number | null => {
    if (!header) {
      return null;
    }

    const seconds = Number(header);

    return Number.isFinite(seconds) ? seconds * 1000 : null;
  };

  private _toUrl = (path: string, query?: RequestConfig['query']): string => {
    const url = new URL(path, this._options.baseUrl);

    if (query) {
      Object.entries(query).forEach(([name, value]) => {
        if (value !== undefined) {
          url.searchParams.set(name, String(value));
        }
      });
    }

    return url.toString();
  };
}
