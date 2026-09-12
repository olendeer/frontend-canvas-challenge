import { Graph } from 'domain/contracts';
import { GraphEntity } from 'domain/graph/entities';

export class GraphDto {
  static mapToEntity(data: Graph): GraphEntity {
    return new GraphEntity(data.nodes, data.edges, data.viewport);
  }
}
