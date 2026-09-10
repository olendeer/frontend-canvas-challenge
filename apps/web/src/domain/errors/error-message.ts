import { HttpError, HttpErrorCodes, HttpErrorMessage } from 'core/http';

import { ApiErrorCodes, SIMULATED_FAILURE } from './error-codes';

/** Единственная таблица «код ошибки → текст с подсказкой, что делать дальше». */
const MESSAGES: Record<string, string> = {
  [ApiErrorCodes.GENERATION_IN_PROGRESS]:
    'У этого генератора уже идёт генерация. Дождитесь результата.',
  [ApiErrorCodes.GENERATION_NOT_FOUND]: 'Генерация не найдена — возможно, данные сервера сброшены.',
  [ApiErrorCodes.GENERATOR_REQUIRED]: 'Запуск возможен только с ноды генератора.',
  [ApiErrorCodes.GRAPH_CHANGED]:
    'Граф изменился после сохранения. Мы сохраним правки и запустим снова.',
  [ApiErrorCodes.GRAPH_VERSION_CONFLICT]:
    'Граф на сервере изменился. Ваши правки на месте: перечитайте серверный граф, чтобы продолжить.',
  [ApiErrorCodes.IDEMPOTENCY_CONFLICT]:
    'Прежний ключ запуска использован с другими данными. Повторите запуск.',
  [ApiErrorCodes.INCOMPLETE_CHAIN]:
    'Цепочка неполная: соедините непустой текст, генератор и результат.',
  [ApiErrorCodes.INTERNAL_ERROR]: 'Сервер не смог обработать запрос. Повторите попытку.',
  [ApiErrorCodes.INVALID_GRAPH]: 'Сервер не принял граф: проверьте связи между нодами и подписи.',
  [ApiErrorCodes.INVALID_JSON]: 'Сервер не разобрал запрос. Повторите попытку.',
  [ApiErrorCodes.PAYLOAD_TOO_LARGE]: 'Граф слишком большой. Удалите часть нод и повторите.',
  [ApiErrorCodes.PRECONDITION_FAILED]: 'Условие запроса не выполнено. Перечитайте данные сервера.',
  [ApiErrorCodes.PRECONDITION_REQUIRED]:
    'Не хватает версии графа. Перечитайте серверный граф и повторите.',
  [ApiErrorCodes.ROUTE_NOT_FOUND]: 'Ресурс не найден. Проверьте адрес API.',
  [ApiErrorCodes.SPACE_NOT_FOUND]: 'Рабочее пространство не найдено. Откройте его из списка.',
  [ApiErrorCodes.UNSUPPORTED_MEDIA_TYPE]: 'Сервер ожидает JSON. Повторите попытку.',
  [ApiErrorCodes.VALIDATION_ERROR]: 'Сервер не принял данные запроса. Проверьте поля нод.',
  [HttpErrorCodes.NETWORK]: HttpErrorMessage.network,
  [HttpErrorCodes.UNKNOWN]: HttpErrorMessage.unknown,
  [SIMULATED_FAILURE]: 'Тестовый отказ генерации. Запустите её снова.',
};

export const getErrorMessage = (error: unknown): string => {
  if (!(error instanceof HttpError)) {
    return HttpErrorMessage.unknown;
  }

  return MESSAGES[error.code] ?? error.message ?? HttpErrorMessage.unknown;
};

export const getCodeMessage = (code: string | null): string =>
  (code && MESSAGES[code]) || HttpErrorMessage.unknown;

export const getIsErrorCode = (error: unknown, ...codes: ApiErrorCodes[]): boolean =>
  error instanceof HttpError && codes.includes(error.code as ApiErrorCodes);

/**
 * Конфликт версии графа. Повторять такую запись бессмысленно: пока пользователь не перечитает
 * серверный граф, сервер будет отвечать тем же 412. Очередь записи использует это как признак
 * блокирующей ошибки.
 */
export const getIsGraphConflict = (error: unknown): boolean =>
  getIsErrorCode(
    error,
    ApiErrorCodes.GRAPH_VERSION_CONFLICT,
    ApiErrorCodes.PRECONDITION_FAILED,
    ApiErrorCodes.PRECONDITION_REQUIRED,
  );
