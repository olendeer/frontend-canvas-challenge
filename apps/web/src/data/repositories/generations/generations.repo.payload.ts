import { GenerationScenario } from 'domain/contracts';

export interface CreateGenerationPayload {
  graphETag: string;
  nodeId: string;
  scenario: GenerationScenario;
}
