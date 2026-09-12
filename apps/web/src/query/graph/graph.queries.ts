'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { GraphSnapshot } from 'domain/graph';
import { useGraphService } from 'providers/services.hooks';

import { queryKeys } from '../query-keys';

/**
 * Серверный граф читается запросом, а редактируется локальный черновик, поэтому фонового
 * обновления здесь нет: граф перечитывается только при открытии пространства и по явной
 * кнопке после конфликта версий. Сохранение идёт не мутацией, а очередью записи
 * (core/sync): мутации TanStack Query не умеют ни debounce, ни строгой очередности.
 */
export const useGraphQuery = (spaceId: string): UseQueryResult<GraphSnapshot> => {
  const graph = useGraphService();

  return useQuery({
    queryFn: ({ signal }) => graph.read(spaceId, { signal }),
    queryKey: queryKeys.graph(spaceId),
    staleTime: Infinity,
  });
};
