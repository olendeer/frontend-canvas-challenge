import { FetchAdapter, LocalStorageAdapter } from 'core/adapters';
import { IdempotencyJournal } from 'core/idempotency';
import { getApiUrl } from 'core/utils';
import { ApiErrorDto } from 'data/dto/api-response';
import {
  ConfigRepo,
  ConfigRepoImpl,
  GenerationsRepoImpl,
  GraphRepoImpl,
  SpacesRepo,
  SpacesRepoImpl,
} from 'data/repositories';
import { GenerationService, GenerationServiceImpl } from 'domain/generation';
import { GraphService, GraphServiceImpl } from 'domain/graph';

/**
 * Граф зависимостей приложения. Для областей со своим поведением (версии графа, ключи
 * идемпотентности) наружу выходит доменный сервис; для простого чтения — сразу репозиторий,
 * чтобы не заводить прослойку, которая только пересылает вызов.
 */
export interface AppServices {
  config: ConfigRepo;
  generation: GenerationService;
  graph: GraphService;
  spaces: SpacesRepo;
}

export const createServices = (baseUrl: string = getApiUrl()): AppServices => {
  const http = new FetchAdapter({ baseUrl, mapError: ApiErrorDto.mapToEntity });
  const journal = new IdempotencyJournal(new LocalStorageAdapter());
  const graph = new GraphServiceImpl(new GraphRepoImpl(http));

  return {
    config: new ConfigRepoImpl(http),
    generation: new GenerationServiceImpl(new GenerationsRepoImpl(http), graph, journal),
    graph,
    spaces: new SpacesRepoImpl(http),
  };
};
