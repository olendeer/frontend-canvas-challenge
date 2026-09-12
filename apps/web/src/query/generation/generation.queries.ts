'use client';

import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';

import { StartedGeneration } from 'data/repositories';
import { ConfigEntity } from 'domain/config';
import { GenerationScenario } from 'domain/contracts';
import { GenerationsEntity } from 'domain/generation';
import { useGenerationService } from 'providers/services.hooks';

import { queryKeys } from '../query-keys';

export interface StartGenerationInput {
  nodeId: string;
  scenario: GenerationScenario;
}

/**
 * Один запрос обслуживает и восстановление после перезагрузки, и ожидание результата:
 * список генераций пространства опрашивается, пока в нём есть незавершённая попытка, и
 * останавливается сам. Отдельного цикла опроса на ноду нет — состояние всех нод берётся
 * из одного индекса по этому списку.
 */
export const useGenerationsQuery = (
  spaceId: string,
  config: ConfigEntity,
  retryAfterMs: number | null,
): UseQueryResult<GenerationsEntity> => {
  const generation = useGenerationService();

  return useQuery({
    queryFn: ({ signal }) => generation.getGenerations(spaceId, { signal }),
    queryKey: queryKeys.generations(spaceId),
    refetchInterval: ({ state }) => state.data?.pollDelayMs(config, retryAfterMs) ?? false,
    staleTime: 0,
  });
};

/**
 * Запуск генерации: сначала дожидаемся сохранения графа (в том числе ещё не сработавшего
 * debounce), и только потом отправляем запрос. Ошибка сохранения прерывает запуск.
 */
export const useStartGenerationMutation = (
  spaceId: string,
  flushGraph: () => Promise<void>,
): UseMutationResult<StartedGeneration, Error, StartGenerationInput> => {
  const generation = useGenerationService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nodeId, scenario }: StartGenerationInput) => {
      await flushGraph();

      return generation.start(spaceId, nodeId, scenario);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.generations(spaceId) }),
  });
};
