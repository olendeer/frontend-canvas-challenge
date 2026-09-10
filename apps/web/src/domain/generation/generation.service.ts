import { RequestConfig } from 'core/http';
import { StartedGeneration } from 'data/repositories';
import { Generation, GenerationScenario } from 'domain/contracts';

export interface GenerationService {
  getGenerations: (spaceId: string, config?: RequestConfig) => Promise<Generation[]>;
  start: (
    spaceId: string,
    nodeId: string,
    scenario: GenerationScenario,
  ) => Promise<StartedGeneration>;
}
