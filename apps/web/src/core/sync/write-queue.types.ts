export interface WriteQueueState {
  /** Последняя ошибка записи; сбрасывается при следующей успешной отправке. */
  error: unknown;
  /** Запись остановлена до явного решения пользователя (например, конфликт версий). */
  isBlocked: boolean;
  /** Есть правки, которые ещё не приняты сервером. */
  isPending: boolean;
  isWriting: boolean;
}

export interface WriteQueueOptions<TPayload> {
  /** Читается в момент правки, поэтому пауза может прийти из настроек сервера позже. */
  getDelayMs: () => number;
  /**
   * Ошибка, после которой повторять запись бессмысленно: очередь встаёт до reset().
   * Так политика конкретной операции задаётся снаружи, а очередь остаётся общей.
   */
  getIsBlocking?: (error: unknown) => boolean;
  /** Вызывается в момент отправки, поэтому уходит всегда самое свежее состояние. */
  read: () => TPayload;
  write: (payload: TPayload) => Promise<void>;
}
