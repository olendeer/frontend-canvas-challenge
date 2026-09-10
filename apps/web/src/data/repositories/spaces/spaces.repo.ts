import { RequestConfig } from 'core/http';
import { Space } from 'domain/contracts';

import { CreateSpacePayload } from './spaces.repo.payload';

export interface SpacesRepo {
  createSpace: (payload: CreateSpacePayload, config?: RequestConfig) => Promise<Space>;
  getSpace: (spaceId: string, config?: RequestConfig) => Promise<Space>;
  getSpaces: (config?: RequestConfig) => Promise<Space[]>;
}
