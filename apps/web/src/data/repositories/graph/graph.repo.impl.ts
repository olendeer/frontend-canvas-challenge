import { HttpClient, RequestConfig } from 'core/http';
import { GraphDto } from 'data/dto/graph';
import { API } from 'data/endpoints';
import { Graph } from 'domain/contracts';
import { GraphSnapshot } from 'domain/graph/entities';

import { GraphRepo } from './graph.repo';

export class GraphRepoImpl implements GraphRepo {
  constructor(private readonly _http: HttpClient) {}

  getGraph = async (spaceId: string, config?: RequestConfig): Promise<GraphSnapshot> => {
    const response = await this._http.get<Graph>(API.spaces.graph.toUrl({ spaceId }), config);

    return { etag: response.etag ?? '', graph: GraphDto.mapToEntity(response.data) };
  };

  saveGraph = async (
    spaceId: string,
    graph: Graph,
    ifMatch: string,
    config?: RequestConfig,
  ): Promise<GraphSnapshot> => {
    const response = await this._http.put<Graph, Graph>(
      API.spaces.graph.toUrl({ spaceId }),
      graph,
      { ...config, ifMatch },
    );

    return { etag: response.etag ?? '', graph: GraphDto.mapToEntity(response.data) };
  };
}
