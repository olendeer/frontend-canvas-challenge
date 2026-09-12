import { HttpClient, RequestConfig } from 'core/http';
import { ConfigDto } from 'data/dto/config';
import { API } from 'data/endpoints';
import { ConfigEntity } from 'domain/config';
import { AppConfig } from 'domain/contracts';

import { ConfigRepo } from './config.repo';

export class ConfigRepoImpl implements ConfigRepo {
  constructor(private readonly _http: HttpClient) {}

  getConfig = async (config?: RequestConfig): Promise<ConfigEntity> => {
    const response = await this._http.get<AppConfig>(API.config.toUrl(), config);

    return ConfigDto.mapToEntity(response.data);
  };
}
