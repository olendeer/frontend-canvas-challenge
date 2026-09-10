import { HttpClient, RequestConfig } from 'core/http';
import { API } from 'data/endpoints';
import { AppConfig } from 'domain/contracts';

import { ConfigRepo } from './config.repo';

export class ConfigRepoImpl implements ConfigRepo {
  constructor(private readonly _http: HttpClient) {}

  getConfig = async (config?: RequestConfig): Promise<AppConfig> => {
    const response = await this._http.get<AppConfig>(API.config.toUrl(), config);

    return response.data;
  };
}
