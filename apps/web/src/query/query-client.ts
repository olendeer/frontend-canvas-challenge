import { QueryClient } from '@tanstack/react-query';

import { HttpError } from 'core/http';

const MAX_RETRIES = 2;
const STALE_TIME_MS = 10_000;

/** Политика повторов задана один раз: сетевые сбои и 5xx повторяем, ответы 4xx — нет. */
const getShouldRetry = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= MAX_RETRIES) {
    return false;
  }

  return error instanceof HttpError && error.isRetryable;
};

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { refetchOnWindowFocus: false, retry: getShouldRetry, staleTime: STALE_TIME_MS },
    },
  });
