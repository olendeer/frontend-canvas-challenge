type Listener = () => void;

/**
 * Минимальное внешнее хранилище под useSyncExternalStore: подписка и снимок состояния.
 * Снимок заменяется целиком, поэтому неизменившиеся снимки сохраняют ссылку.
 */
export class ObservableStore<TSnapshot> {
  private readonly _listeners = new Set<Listener>();

  constructor(private _snapshot: TSnapshot) {}

  subscribe = (listener: Listener): (() => void) => {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  };

  getSnapshot = (): TSnapshot => this._snapshot;

  protected _set = (snapshot: TSnapshot): void => {
    this._snapshot = snapshot;

    for (const listener of this._listeners) {
      listener();
    }
  };
}
