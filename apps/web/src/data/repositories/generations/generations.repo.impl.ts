import { HttpClient, RequestConfig } from 'core/http';
import { GenerationDto } from 'data/dto/generation';
import { API } from 'data/endpoints';
import { Generation } from 'domain/contracts';

import { GenerationsRepo, StartedGeneration } from './generations.repo';
import { CreateGenerationPayload } from './generations.repo.payload';

export class GenerationsRepoImpl implements GenerationsRepo {
  constructor(private readonly _http: HttpClient) {}

  getGenerations = async (spaceId: string, config?: RequestConfig): Promise<Generation[]> => {
    const response = await this._http.get<Generation[]>(
      API.spaces.generations.toUrl({ spaceId }),
      config,
    );

    return GenerationDto.mapToList(response.data, this._http.resolve);
  };

  createGeneration = async (
    spaceId: string,
    payload: CreateGenerationPayload,
    idempotencyKey: string,
    config?: RequestConfig,
  ): Promise<StartedGeneration> => {
    const response = await this._http.post<Generation, CreateGenerationPayload>(
      API.spaces.generations.toUrl({ spaceId }),
      payload,
      { ...config, idempotencyKey },
    );

    return {
      generation: GenerationDto.mapToEntity(response.data, this._http.resolve),
      retryAfterMs: response.retryAfterMs,
    };
  };
}
