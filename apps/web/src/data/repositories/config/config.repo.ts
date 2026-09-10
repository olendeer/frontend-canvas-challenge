import { RequestConfig } from 'core/http';
import { AppConfig } from 'domain/contracts';

export interface ConfigRepo {
  getConfig: (config?: RequestConfig) => Promise<AppConfig>;
}
