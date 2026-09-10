import { describe, expect, it } from 'vitest';

import { IdempotencyJournal } from 'core/idempotency';
import { AppStorage } from 'core/storage';

const createStorage = (): AppStorage => {
  const values = new Map<string, string>();

  return {
    read: <TValue>(key: string) => {
      const raw = values.get(key);

      return raw === undefined ? null : (JSON.parse(raw) as TValue);
    },
    remove: (key: string) => {
      values.delete(key);
    },
    write: (key: string, value: unknown) => {
      values.set(key, JSON.stringify(value));
    },
  };
};

const INTENT = 'generation:space:g1';

describe('IdempotencyJournal', () => {
  it('повторяет ключ для того же тела и выдаёт новый для изменённого', () => {
    const journal = new IdempotencyJournal(createStorage());
    const body = { graphETag: '"a"', nodeId: 'g1', scenario: 'success' };

    const first = journal.keyFor(INTENT, body);

    expect(journal.keyFor(INTENT, { ...body })).toBe(first);
    expect(journal.keyFor(INTENT, { ...body, scenario: 'failure' })).not.toBe(first);
  });

  it('после release выдаёт новый ключ для того же тела', () => {
    const journal = new IdempotencyJournal(createStorage());
    const body = { graphETag: '"a"', nodeId: 'g1', scenario: 'success' };

    const first = journal.keyFor(INTENT, body);

    journal.release(INTENT);

    expect(journal.keyFor(INTENT, body)).not.toBe(first);
  });

  it('не задевает ключи других намерений', () => {
    const journal = new IdempotencyJournal(createStorage());
    const other = 'generation:space:g2';
    const key = journal.keyFor(other, { nodeId: 'g2' });

    journal.keyFor(INTENT, { nodeId: 'g1' });
    journal.release(INTENT);

    expect(journal.keyFor(other, { nodeId: 'g2' })).toBe(key);
  });
});
