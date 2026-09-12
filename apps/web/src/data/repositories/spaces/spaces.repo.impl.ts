import { HttpClient, RequestConfig } from 'core/http';
import { SpaceDto } from 'data/dto/space';
import { API } from 'data/endpoints';
import { Space } from 'domain/contracts';
import { SpaceEntity } from 'domain/space';

import { SpacesRepo } from './spaces.repo';
import { CreateSpacePayload } from './spaces.repo.payload';

export class SpacesRepoImpl implements SpacesRepo {
  constructor(private readonly _http: HttpClient) {}

  getSpaces = async (config?: RequestConfig): Promise<SpaceEntity[]> => {
    const response = await this._http.get<Space[]>(API.spaces.toUrl(), config);

    return SpaceDto.mapToList(response.data);
  };

  getSpace = async (spaceId: string, config?: RequestConfig): Promise<SpaceEntity> => {
    const response = await this._http.get<Space>(API.spaces.byId.toUrl({ spaceId }), config);

    return SpaceDto.mapToEntity(response.data);
  };

  createSpace = async (
    payload: CreateSpacePayload,
    config?: RequestConfig,
  ): Promise<SpaceEntity> => {
    const response = await this._http.post<Space, CreateSpacePayload>(
      API.spaces.toUrl(),
      payload,
      config,
    );

    return SpaceDto.mapToEntity(response.data);
  };
}
