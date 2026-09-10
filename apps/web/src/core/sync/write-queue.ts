import { ObservableStore } from 'core/store';

import { WriteQueueOptions, WriteQueueState } from './write-queue.types';

const IDLE: WriteQueueState = { error: null, isBlocked: false, isPending: false, isWriting: false };

/**
 * Отложенная запись одного ресурса: debounce на серию правок и строгая очередь из одного
 * запроса. Пока запись выполняется, новые правки только помечаются, а после ответа
 * отправляется актуальное состояние — ответ старого запроса ничего не затирает, потому что
 * очередь читает данные в момент отправки и никогда не пишет их обратно в источник.
 */
export class WriteQueue<TPayload> extends ObservableStore<WriteQueueState> {
  private _error: unknown = null;
  private _inFlight: Promise<void> | null = null;
  private _isBlocked = false;
  private _isPending = false;
  private _timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly _options: WriteQueueOptions<TPayload>) {
    super(IDLE);
  }

  /** Правка произошла: запись уйдёт через delayMs после последнего вызова. */
  schedule = (): void => {
    this._isPending = true;

    if (!this._isBlocked) {
      this._clearTimer();
      this._timer = setTimeout(this._onTimer, this._options.getDelayMs());
    }

    this._publish();
  };

  /** Отправить отложенное сразу и дождаться, пока очередь опустеет. Бросает ошибку записи. */
  flush = async (): Promise<void> => {
    this._clearTimer();

    await this._pump();

    if (this._error !== null) {
      throw this._error;
    }
  };

  /**
   * Отправить отложенное, не дожидаясь ответа. Ошибка остаётся в состоянии очереди, и её
   * показывает интерфейс, поэтому потребителям не нужен свой catch.
   */
  flushInBackground = (): void => {
    this.flush().catch(() => undefined);
  };

  /** Правок больше нет: черновик совпал с серверным состоянием. Снимает и блокировку. */
  reset = (): void => {
    this._clearTimer();
    this._error = null;
    this._isBlocked = false;
    this._isPending = false;
    this._publish();
  };

  dispose = (): void => {
    this._clearTimer();
  };

  private _onTimer = (): void => {
    this._timer = null;
    void this._pump();
  };

  private _pump = (): Promise<void> => {
    if (this._inFlight !== null) {
      return this._inFlight;
    }

    if (!this._isPending || this._isBlocked) {
      return Promise.resolve();
    }

    const payload = this._options.read();

    this._isPending = false;
    this._error = null;

    const promise: Promise<void> = this._options.write(payload).then(
      () => {
        this._settle(promise);

        // Правки, пришедшие во время записи, ждут своего таймера debounce; если таймер уже
        // отработал или запись форсировали через flush, отправляем их сразу.
        return this._timer === null ? this._pump() : undefined;
      },
      (error: unknown) => {
        this._error = error;
        this._isPending = true;
        this._isBlocked = this._options.getIsBlocking?.(error) ?? false;
        this._settle(promise);
      },
    );

    this._inFlight = promise;
    this._publish();

    return promise;
  };

  private _settle = (promise: Promise<void>): void => {
    if (this._inFlight === promise) {
      this._inFlight = null;
    }

    this._publish();
  };

  private _clearTimer = (): void => {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  };

  private _publish = (): void => {
    const previous = this.getSnapshot();
    const isWriting = this._inFlight !== null;

    if (
      previous.error === this._error &&
      previous.isBlocked === this._isBlocked &&
      previous.isPending === this._isPending &&
      previous.isWriting === isWriting
    ) {
      return;
    }

    this._set({
      error: this._error,
      isBlocked: this._isBlocked,
      isPending: this._isPending,
      isWriting,
    });
  };
}
