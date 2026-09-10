import { RequestConfig } from 'core/http';
import { Generation } from 'domain/contracts';

import { CreateGenerationPayload } from './generations.repo.payload';

/** Результат запуска: сервер отвечает 202 и рекомендует паузу до первого опроса. */
export interface StartedGeneration {
  generation: Generation;
  retryAfterMs: number | null;
}

export interface GenerationsRepo {
  createGeneration: (
    spaceId: string,
    payload: CreateGenerationPayload,
    idempotencyKey: string,
    config?: RequestConfig,
  ) => Promise<StartedGeneration>;
  getGenerations: (spaceId: string, config?: RequestConfig) => Promise<Generation[]>;
}
