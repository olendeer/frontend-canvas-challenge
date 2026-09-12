import { RequestConfig } from 'core/http';
import { ConfigEntity } from 'domain/config';

export interface ConfigRepo {
  getConfig: (config?: RequestConfig) => Promise<ConfigEntity>;
}
