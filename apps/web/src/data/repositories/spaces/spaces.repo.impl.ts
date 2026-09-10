import { HttpClient, RequestConfig } from 'core/http';
import { API } from 'data/endpoints';
import { Space } from 'domain/contracts';

import { SpacesRepo } from './spaces.repo';
import { CreateSpacePayload } from './spaces.repo.payload';

export class SpacesRepoImpl implements SpacesRepo {
  constructor(private readonly _http: HttpClient) {}

  getSpaces = async (config?: RequestConfig): Promise<Space[]> => {
    const response = await this._http.get<Space[]>(API.spaces.toUrl(), config);

    return response.data;
  };

  getSpace = async (spaceId: string, config?: RequestConfig): Promise<Space> => {
    const response = await this._http.get<Space>(API.spaces.byId.toUrl({ spaceId }), config);

    return response.data;
  };

  createSpace = async (payload: CreateSpacePayload, config?: RequestConfig): Promise<Space> => {
    const response = await this._http.post<Space, CreateSpacePayload>(
      API.spaces.toUrl(),
      payload,
      config,
    );

    return response.data;
  };
}
