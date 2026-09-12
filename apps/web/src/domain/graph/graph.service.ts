import { RequestConfig } from 'core/http';
import { Graph } from 'domain/contracts';

import { GraphSnapshot } from './entities';

export interface GraphService {
  /** ETag последнего прочитанного или сохранённого графа: нужен запуску генерации. */
  getVersion: (spaceId: string) => string;
  read: (spaceId: string, config?: RequestConfig) => Promise<GraphSnapshot>;
  save: (spaceId: string, graph: Graph) => Promise<GraphSnapshot>;
}
