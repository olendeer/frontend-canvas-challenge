import { describe, expect, it } from 'vitest';

import { CONFIG_DEFAULTS } from 'domain/config';
import { Generation } from 'domain/contracts';
import { buildGenerationIndex, getPollDelayMs } from 'domain/generation';

const generation = (
  id: string,
  nodeId: string,
  resultNodeId: string,
  status: Generation['status'],
): Generation => ({
  createdAt: '2026-01-01T00:00:00.000Z',
  failureCode: status === 'failed' ? 'SIMULATED_FAILURE' : null,
  graphETag: '"etag"',
  id,
  imageUrl: status === 'succeeded' ? '/assets/demo.svg' : null,
  links: {},
  nodeId,
  prompt: 'Горы',
  resultNodeId,
  scenario: status === 'failed' ? 'failure' : 'success',
  spaceId: 'space',
  status,
});

describe('buildGenerationIndex', () => {
  it('берёт самую свежую попытку для генератора и для ноды результата', () => {
    // Список приходит от новых к старым.
    const index = buildGenerationIndex([
      generation('new', 'g1', 'r2', 'succeeded'),
      generation('old', 'g1', 'r1', 'failed'),
    ]);

    expect(index.byNode.get('g1')?.id).toBe('new');
    expect(index.byResultNode.get('r2')?.id).toBe('new');
    expect(index.byResultNode.get('r1')?.id).toBe('old');
    expect(index.processingCount).toBe(0);
  });

  it('считает активные попытки по последней генерации каждой ноды', () => {
    const index = buildGenerationIndex([
      generation('a', 'g1', 'r1', 'processing'),
      generation('b', 'g2', 'r2', 'succeeded'),
    ]);

    expect(index.processingCount).toBe(1);
  });

  it('на пустом списке отдаёт пустые индексы', () => {
    const index = buildGenerationIndex([]);

    expect(index.byNode.size).toBe(0);
    expect(index.byResultNode.size).toBe(0);
  });
});

describe('getPollDelayMs', () => {
  it('останавливает опрос, когда нет активных попыток', () => {
    expect(getPollDelayMs(undefined, CONFIG_DEFAULTS, null)).toBe(false);
    expect(getPollDelayMs([generation('a', 'g1', 'r1', 'failed')], CONFIG_DEFAULTS, null)).toBe(
      false,
    );
  });

  it('берёт паузу из Retry-After, иначе из настроек сервера', () => {
    const active = [generation('a', 'g1', 'r1', 'processing')];

    expect(getPollDelayMs(active, CONFIG_DEFAULTS, 1_000)).toBe(1_000);
    expect(getPollDelayMs(active, CONFIG_DEFAULTS, null)).toBe(CONFIG_DEFAULTS.pollIntervalMs);
  });
});
