import { RequestConfig } from 'core/http';
import { GraphRepo } from 'data/repositories';
import { Graph, GraphSnapshot } from 'domain/contracts';

import { GraphService } from './graph.service';

/**
 * Версии графа (ETag) живут только здесь. Компоненты и очередь записи их не передают:
 * save сам подставляет If-Match из последнего ответа, а запуск генерации берёт ту же версию
 * через getVersion. Так «прочитал ETag → передал в следующий запрос» описано в одном месте.
 */
export class GraphServiceImpl implements GraphService {
  private readonly _versions = new Map<string, string>();

  constructor(private readonly _repo: GraphRepo) {}

  getVersion = (spaceId: string): string => this._versions.get(spaceId) ?? '';

  read = async (spaceId: string, config?: RequestConfig): Promise<GraphSnapshot> => {
    const snapshot = await this._repo.getGraph(spaceId, config);

    this._versions.set(spaceId, snapshot.etag);

    return snapshot;
  };

  save = async (spaceId: string, graph: Graph): Promise<GraphSnapshot> => {
    const version = this._versions.get(spaceId) ?? (await this.read(spaceId)).etag;
    const snapshot = await this._repo.saveGraph(spaceId, graph, version);

    this._versions.set(spaceId, snapshot.etag);

    return snapshot;
  };
}
