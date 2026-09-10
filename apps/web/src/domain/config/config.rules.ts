import { AppConfig } from 'domain/contracts';

/** Значения из GET /api/config; используются, пока настройки не загрузились. */
export type ResolvedConfig = Pick<
  AppConfig,
  'debounceMs' | 'generationDelayMs' | 'maxEdges' | 'maxNodes' | 'pollIntervalMs'
>;

export const CONFIG_DEFAULTS: ResolvedConfig = {
  debounceMs: 500,
  generationDelayMs: 1500,
  maxEdges: 20,
  maxNodes: 20,
  pollIntervalMs: 500,
};

export const resolveConfig = (config?: AppConfig | null): ResolvedConfig =>
  config ?? CONFIG_DEFAULTS;
