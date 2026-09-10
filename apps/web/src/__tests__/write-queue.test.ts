import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WriteQueue } from 'core/sync';

const DELAY_MS = 500;

interface Harness {
  queue: WriteQueue<number>;
  settle: (error?: Error) => void;
  source: { value: number };
  writes: number[];
}

const createHarness = (options: { getIsBlocking?: (error: unknown) => boolean } = {}): Harness => {
  const source = { value: 0 };
  const writes: number[] = [];
  const pending: { reject: (error: Error) => void; resolve: () => void }[] = [];

  const queue = new WriteQueue<number>({
    getDelayMs: () => DELAY_MS,
    getIsBlocking: options.getIsBlocking,
    read: () => source.value,
    write: (value) =>
      new Promise<void>((resolve, reject) => {
        writes.push(value);
        pending.push({ reject, resolve });
      }),
  });

  const settle = (error?: Error) => {
    const next = pending.shift();

    if (!next) {
      throw new Error('Нет запроса в полёте.');
    }

    if (error) {
      next.reject(error);
    } else {
      next.resolve();
    }
  };

  return { queue, settle, source, writes };
};

describe('WriteQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('отправляет одну запись после серии правок', async () => {
    const { queue, settle, source, writes } = createHarness();

    for (const value of [1, 2, 3]) {
      source.value = value;
      queue.schedule();
      await vi.advanceTimersByTimeAsync(100);
    }

    expect(writes).toEqual([]);

    await vi.advanceTimersByTimeAsync(DELAY_MS);
    expect(writes).toEqual([3]);

    settle();
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.getSnapshot()).toMatchObject({ isPending: false, isWriting: false });
  });

  it('сохраняет одиночную правку', async () => {
    const { queue, source, writes } = createHarness();

    source.value = 7;
    queue.schedule();

    await vi.advanceTimersByTimeAsync(DELAY_MS);
    expect(writes).toEqual([7]);
  });

  it('не отправляет вторую запись, пока первая в полёте, и уходит с последним состоянием', async () => {
    const { queue, settle, source, writes } = createHarness();

    source.value = 1;
    queue.schedule();
    await vi.advanceTimersByTimeAsync(DELAY_MS);
    expect(writes).toEqual([1]);

    source.value = 2;
    queue.schedule();
    source.value = 3;
    queue.schedule();
    await vi.advanceTimersByTimeAsync(DELAY_MS);

    expect(writes).toEqual([1]);
    expect(queue.getSnapshot().isPending).toBe(true);

    settle();
    await vi.advanceTimersByTimeAsync(0);
    expect(writes).toEqual([1, 3]);
  });

  it('flush отправляет отложенное сразу и ждёт ответа', async () => {
    const { queue, settle, source, writes } = createHarness();

    source.value = 5;
    queue.schedule();

    const flushed = queue.flush();

    await vi.advanceTimersByTimeAsync(0);
    expect(writes).toEqual([5]);

    settle();
    await expect(flushed).resolves.toBeUndefined();
  });

  it('после ошибки не повторяет запись сама и отдаёт ошибку через flush', async () => {
    const { queue, settle, source, writes } = createHarness();
    const failure = new Error('сеть недоступна');

    source.value = 1;
    queue.schedule();
    await vi.advanceTimersByTimeAsync(DELAY_MS);

    settle(failure);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(writes).toEqual([1]);
    expect(queue.getSnapshot()).toMatchObject({ error: failure, isPending: true });

    const flushed = queue.flush().catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(0);
    expect(writes).toEqual([1, 1]);

    settle(failure);
    await expect(flushed).resolves.toBe(failure);
  });

  it('блокирующая ошибка останавливает запись до перечитывания графа', async () => {
    const { queue, settle, source, writes } = createHarness({ getIsBlocking: () => true });

    source.value = 1;
    queue.schedule();
    await vi.advanceTimersByTimeAsync(DELAY_MS);

    settle(new Error('конфликт версий'));
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.getSnapshot().isBlocked).toBe(true);

    source.value = 2;
    queue.schedule();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(writes).toEqual([1]);

    queue.reset();
    source.value = 3;
    queue.schedule();
    await vi.advanceTimersByTimeAsync(DELAY_MS);
    expect(writes).toEqual([1, 3]);
  });

  it('reset снимает признак несохранённых правок', async () => {
    const { queue, source, writes } = createHarness();

    source.value = 1;
    queue.schedule();
    queue.reset();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(writes).toEqual([]);
    expect(queue.getSnapshot().isPending).toBe(false);
  });

  it('снимок сохраняет ссылку, пока состояние не изменилось', () => {
    const { queue, source } = createHarness();
    const before = queue.getSnapshot();

    source.value = 1;
    queue.schedule();

    const after = queue.getSnapshot();

    expect(after).not.toBe(before);

    queue.schedule();
    expect(queue.getSnapshot()).toBe(after);
  });
});
