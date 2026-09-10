import { ResolvedConfig } from 'domain/config';
import { Generation } from 'domain/contracts';

/**
 * Готовые ответы на два вопроса, которые задаёт каждая нода: «что у этого генератора» и
 * «что показать в этой ноде результата». Список приходит от новых к старым, поэтому первое
 * попадание — самая свежая попытка.
 */
export interface GenerationIndex {
  byNode: Map<string, Generation>;
  byResultNode: Map<string, Generation>;
  /** Незавершённые генерации: пока их нет, опрос останавливается. */
  processingCount: number;
}

export const EMPTY_GENERATION_INDEX: GenerationIndex = {
  byNode: new Map(),
  byResultNode: new Map(),
  processingCount: 0,
};

export const getIsProcessing = (generation?: Generation | null): boolean =>
  generation?.status === 'processing';

export const getIsFailed = (generation?: Generation | null): boolean =>
  generation?.status === 'failed';

export const getIsSucceeded = (generation?: Generation | null): boolean =>
  generation?.status === 'succeeded';

/**
 * Один проход по списку: два индекса и счётчик активных. Без него каждая нода искала бы свою
 * попытку линейным find, то есть O(ноды × генерации) на каждый кадр перерисовки канваса.
 */
export const buildGenerationIndex = (generations: readonly Generation[]): GenerationIndex => {
  const byNode = new Map<string, Generation>();
  const byResultNode = new Map<string, Generation>();
  let processingCount = 0;

  for (let index = 0; index < generations.length; index += 1) {
    const generation = generations[index];

    if (!byNode.has(generation.nodeId)) {
      byNode.set(generation.nodeId, generation);

      if (generation.status === 'processing') {
        processingCount += 1;
      }
    }

    if (!byResultNode.has(generation.resultNodeId)) {
      byResultNode.set(generation.resultNodeId, generation);
    }
  }

  return { byNode, byResultNode, processingCount };
};

/**
 * Пауза до следующего опроса или false, когда опрашивать нечего. Первая пауза берётся из
 * Retry-After ответа 202, дальше — из настроек сервера.
 */
export const getPollDelayMs = (
  generations: readonly Generation[] | undefined,
  config: ResolvedConfig,
  retryAfterMs: number | null,
): number | false => {
  // Список идёт от новых к старым, поэтому активная попытка находится в его начале.
  if (!generations?.some(getIsProcessing)) {
    return false;
  }

  return retryAfterMs ?? config.pollIntervalMs;
};
