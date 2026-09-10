import { describe, expect, it } from 'vitest';

import { HttpError, HttpErrorCodes, HttpErrorMessage } from 'core/http';
import { ApiErrorDto } from 'data/dto/api-response';

describe('ApiErrorDto', () => {
  it('разбирает конверт ошибки API', () => {
    const error = ApiErrorDto.mapToEntity(
      { error: { code: 'GRAPH_VERSION_CONFLICT', message: 'Граф изменился.' } },
      412,
      'request-1',
    );

    expect(error).toBeInstanceOf(HttpError);
    expect(error.code).toBe('GRAPH_VERSION_CONFLICT');
    expect(error.message).toBe('Граф изменился.');
    expect(error.status).toBe(412);
    expect(error.requestId).toBe('request-1');
  });

  it('сводит тело без кода ошибки к единому неизвестному виду', () => {
    for (const body of [null, undefined, {}, { error: {} }, 'сломанный ответ']) {
      const error = ApiErrorDto.mapToEntity(body, 500);

      expect(error.code).toBe(HttpErrorCodes.UNKNOWN);
      expect(error.message).toBe(HttpErrorMessage.unknown);
    }
  });

  it('различает сетевые ошибки, ошибки сервера и ответы 4xx', () => {
    expect(new HttpError('', 0, HttpErrorCodes.NETWORK).isRetryable).toBe(true);
    expect(new HttpError('', 500, 'INTERNAL_ERROR').isRetryable).toBe(true);
    expect(new HttpError('', 412, 'GRAPH_VERSION_CONFLICT').isRetryable).toBe(false);
  });
});
