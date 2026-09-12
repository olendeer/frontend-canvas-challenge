import { RequestConfig } from 'core/http';
import { Graph } from 'domain/contracts';
import { GraphSnapshot } from 'domain/graph/entities';

export interface GraphRepo {
  getGraph: (spaceId: string, config?: RequestConfig) => Promise<GraphSnapshot>;
  saveGraph: (
    spaceId: string,
    graph: Graph,
    ifMatch: string,
    config?: RequestConfig,
  ) => Promise<GraphSnapshot>;
}
