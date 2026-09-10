import { RequestConfig } from 'core/http';
import { Graph, GraphSnapshot } from 'domain/contracts';

export interface GraphRepo {
  getGraph: (spaceId: string, config?: RequestConfig) => Promise<GraphSnapshot>;
  saveGraph: (
    spaceId: string,
    graph: Graph,
    ifMatch: string,
    config?: RequestConfig,
  ) => Promise<GraphSnapshot>;
}
