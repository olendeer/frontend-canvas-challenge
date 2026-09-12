import { RequestConfig } from 'core/http';
import { GenerationEntity, GenerationsEntity } from 'domain/generation';

import { CreateGenerationPayload } from './generations.repo.payload';

/** Результат запуска: сервер отвечает 202 и рекомендует паузу до первого опроса. */
export interface StartedGeneration {
  generation: GenerationEntity;
  retryAfterMs: number | null;
}

export interface GenerationsRepo {
  createGeneration: (
    spaceId: string,
    payload: CreateGenerationPayload,
    idempotencyKey: string,
    config?: RequestConfig,
  ) => Promise<StartedGeneration>;
  getGenerations: (spaceId: string, config?: RequestConfig) => Promise<GenerationsEntity>;
}
