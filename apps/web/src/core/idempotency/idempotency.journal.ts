import { AppStorage } from 'core/storage';

const JOURNAL_KEY = 'canvas.idempotency';

interface JournalEntry {
  fingerprint: string;
  key: string;
}

type Journal = Record<string, JournalEntry>;

/**
 * Ключи идемпотентности, привязанные к отпечатку тела запроса и переживающие перезагрузку.
 * Повтор того же запроса получает прежний ключ, изменённое тело — новый.
 */
export class IdempotencyJournal {
  constructor(private readonly _storage: AppStorage) {}

  keyFor = (intent: string, body: unknown): string => {
    const fingerprint = JSON.stringify(body ?? null);
    const journal = this._read();

    if (journal[intent]?.fingerprint === fingerprint) {
      return journal[intent].key;
    }

    const key = crypto.randomUUID();

    this._storage.write<Journal>(JOURNAL_KEY, { ...journal, [intent]: { fingerprint, key } });

    return key;
  };

  release = (intent: string): void => {
    const journal = this._read();

    if (!Object.hasOwn(journal, intent)) {
      return;
    }

    const rest = Object.entries(journal).reduce<Journal>((result, [name, entry]) => {
      if (name !== intent) {
        result[name] = entry;
      }

      return result;
    }, {});

    this._storage.write<Journal>(JOURNAL_KEY, rest);
  };

  private _read = (): Journal => this._storage.read<Journal>(JOURNAL_KEY) ?? {};
}
