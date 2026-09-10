import { HttpResponse, RequestConfig } from './http.types';

export interface HttpClient {
  get: <TData>(url: string, config?: RequestConfig) => Promise<HttpResponse<TData>>;
  post: <TData, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestConfig,
  ) => Promise<HttpResponse<TData>>;
  put: <TData, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestConfig,
  ) => Promise<HttpResponse<TData>>;
  /** Абсолютный адрес для относительной ссылки из ответа API: картинки, links.href. */
  resolve: (path: string) => string;
}
