import { AppStorage } from 'core/storage';

export class LocalStorageAdapter implements AppStorage {
  read = <TValue>(key: string): TValue | null => {
    const raw = this._getStorage()?.getItem(key);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as TValue;
    } catch {
      return null;
    }
  };

  write = <TValue>(key: string, value: TValue): void => {
    try {
      this._getStorage()?.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  };

  remove = (key: string): void => {
    this._getStorage()?.removeItem(key);
  };

  private _getStorage = (): Storage | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };
}
