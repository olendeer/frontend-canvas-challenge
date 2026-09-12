import { RequestConfig } from 'core/http';
import { SpaceEntity } from 'domain/space';

import { CreateSpacePayload } from './spaces.repo.payload';

export interface SpacesRepo {
  createSpace: (payload: CreateSpacePayload, config?: RequestConfig) => Promise<SpaceEntity>;
  getSpace: (spaceId: string, config?: RequestConfig) => Promise<SpaceEntity>;
  getSpaces: (config?: RequestConfig) => Promise<SpaceEntity[]>;
}
