'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { ConfigEntity } from 'domain/config';
import { useConfigRepo } from 'providers/services.hooks';

import { queryKeys } from '../query-keys';

/** Настройки бэкенда: debounce, пауза опроса и лимиты нод. Читаются один раз за сессию. */
export const useConfigQuery = (): UseQueryResult<ConfigEntity> => {
  const config = useConfigRepo();

  return useQuery({
    queryFn: ({ signal }) => config.getConfig({ signal }),
    queryKey: queryKeys.config(),
    staleTime: Infinity,
  });
};
