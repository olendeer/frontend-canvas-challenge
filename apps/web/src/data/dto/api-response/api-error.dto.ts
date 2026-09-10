import { HttpError, HttpErrorCodes, HttpErrorMessage } from 'core/http';

import { ApiErrorResponse } from './api-error.response';

/** Единственное место, где конверт ошибки API превращается в HttpError. */
export class ApiErrorDto {
  static mapToEntity(body: unknown, status: number, requestId = ''): HttpError {
    const envelope = body as ApiErrorResponse | null | undefined;
    const error = envelope?.error;

    if (!error?.code) {
      return new HttpError(HttpErrorMessage.unknown, status, HttpErrorCodes.UNKNOWN, requestId);
    }

    return new HttpError(error.message || HttpErrorMessage.unknown, status, error.code, requestId);
  }
}
