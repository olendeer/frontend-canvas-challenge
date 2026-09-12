import { describe, expect, it } from 'vitest';

import { ConfigEntity } from 'domain/config';
import { Generation } from 'domain/contracts';
import { GenerationEntity, GenerationsEntity } from 'domain/generation';

const entity = (
  id: string,
  nodeId: string,
  resultNodeId: string,
  status: Generation['status'],
): GenerationEntity => {
  const data: Generation = {
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
  };

  return new GenerationEntity(data, data.imageUrl && 'http://localhost:4001/assets/demo.svg');
};

describe('GenerationEntity', () => {
  it('различает состояния операции и расшифровывает тестовый отказ', () => {
    const failed = entity('a', 'g1', 'r1', 'failed');
    const succeeded = entity('b', 'g2', 'r2', 'succeeded');
    const processing = entity('c', 'g3', 'r3', 'processing');

    expect(failed.isFailed).toBe(true);
    expect(failed.failureMessage).toMatch(/Тестовый отказ/);
    expect(succeeded.isSucceeded).toBe(true);
    expect(succeeded.failureMessage).toBeNull();
    expect(succeeded.imageUrl).toBe('http://localhost:4001/assets/demo.svg');
    expect(processing.isProcessing).toBe(true);
    expect(processing.imageUrl).toBeNull();
  });
});

describe('GenerationsEntity', () => {
  it('берёт самую свежую попытку для генератора и для ноды результата', () => {
    // Список приходит от новых к старым.
    const generations = new GenerationsEntity([
      entity('new', 'g1', 'r2', 'succeeded'),
      entity('old', 'g1', 'r1', 'failed'),
    ]);

    expect(generations.forNode('g1')?.id).toBe('new');
    expect(generations.forResultNode('r2')?.id).toBe('new');
    expect(generations.forResultNode('r1')?.id).toBe('old');
    expect(generations.hasProcessing).toBe(false);
  });

  it('видит незавершённую попытку и отдаёт паузу опроса, иначе останавливает опрос', () => {
    const active = new GenerationsEntity([entity('a', 'g1', 'r1', 'processing')]);
    const settled = new GenerationsEntity([entity('a', 'g1', 'r1', 'failed')]);
    const config = ConfigEntity.defaults();

    expect(active.hasProcessing).toBe(true);
    expect(active.pollDelayMs(config, 1_000)).toBe(1_000);
    expect(active.pollDelayMs(config, null)).toBe(config.pollIntervalMs);
    expect(settled.pollDelayMs(config, 1_000)).toBe(false);
  });

  it('пустой список — один и тот же экземпляр со стабильной ссылкой', () => {
    expect(GenerationsEntity.empty()).toBe(GenerationsEntity.empty());
    expect(GenerationsEntity.empty().forNode('g1')).toBeUndefined();
  });
});
