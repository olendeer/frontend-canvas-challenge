export enum HttpMethods {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
}

export enum StatusCodes {
  /** Запрос не дошёл до сервера: сетевая ошибка. */
  NETWORK_ERROR = 0,
  NO_CONTENT = 204,
  NOT_MODIFIED = 304,
  INTERNAL_SERVER_ERROR = 500,
}

export enum HttpErrorCodes {
  NETWORK = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export enum HttpErrorMessage {
  network = 'Не удалось связаться с сервером. Проверьте соединение и повторите.',
  unknown = 'Что-то пошло не так. Повторите попытку.',
}

export interface RequestConfig {
  /** Уходит в If-Match: условие сохранения для ресурсов с ETag. */
  ifMatch?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

export interface HttpResponse<TData> {
  data: TData;
  etag: string | null;
  location: string | null;
  requestId: string;
  retryAfterMs: number | null;
  status: number;
}
