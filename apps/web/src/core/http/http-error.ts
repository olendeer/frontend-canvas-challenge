import { StatusCodes } from './http.types';

/** Единый вид любой ошибки запроса: сетевой, HTTP или разбора тела. */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  get isNetworkError(): boolean {
    return this.status === StatusCodes.NETWORK_ERROR;
  }

  get isServerError(): boolean {
    return this.status >= StatusCodes.INTERNAL_SERVER_ERROR;
  }

  get isRetryable(): boolean {
    return this.isNetworkError || this.isServerError;
  }
}
