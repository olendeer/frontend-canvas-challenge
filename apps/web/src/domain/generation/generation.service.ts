import { RequestConfig } from 'core/http';
import { StartedGeneration } from 'data/repositories';
import { GenerationScenario } from 'domain/contracts';

import { GenerationsEntity } from './entities';

export interface GenerationService {
  getGenerations: (spaceId: string, config?: RequestConfig) => Promise<GenerationsEntity>;
  start: (
    spaceId: string,
    nodeId: string,
    scenario: GenerationScenario,
  ) => Promise<StartedGeneration>;
}
