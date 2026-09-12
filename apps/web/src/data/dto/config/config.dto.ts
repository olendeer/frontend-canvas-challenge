import { ConfigEntity } from 'domain/config/entities';
import { AppConfig } from 'domain/contracts';

export class ConfigDto {
  static mapToEntity(data: AppConfig): ConfigEntity {
    return new ConfigEntity(
      data.debounceMs,
      data.pollIntervalMs,
      data.generationDelayMs,
      data.maxNodes,
      data.maxEdges,
    );
  }
}
