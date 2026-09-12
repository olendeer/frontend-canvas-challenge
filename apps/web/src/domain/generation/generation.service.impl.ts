import { RequestConfig } from 'core/http';
import { IdempotencyJournal } from 'core/idempotency';
import { GenerationsRepo, StartedGeneration } from 'data/repositories';
import { GenerationScenario } from 'domain/contracts';
import { GraphService } from 'domain/graph';

import { GenerationsEntity } from './entities';
import { GenerationService } from './generation.service';

export class GenerationServiceImpl implements GenerationService {
  constructor(
    private readonly _repo: GenerationsRepo,
    private readonly _graph: GraphService,
    private readonly _journal: IdempotencyJournal,
  ) {}

  getGenerations = (spaceId: string, config?: RequestConfig): Promise<GenerationsEntity> =>
    this._repo.getGenerations(spaceId, config);

  /**
   * Версию графа берём из сервиса графа — той же, что вернул последний PUT. Ключ
   * идемпотентности привязан к паре «пространство + нода» и телу запроса: повтор после
   * сетевой ошибки уходит с прежним ключом, а после принятого запуска ключ освобождается,
   * поэтому следующая генерация той же ноды получит новый.
   */
  start = async (
    spaceId: string,
    nodeId: string,
    scenario: GenerationScenario,
  ): Promise<StartedGeneration> => {
    const payload = { graphETag: this._graph.getVersion(spaceId), nodeId, scenario };
    const intent = `generation:${spaceId}:${nodeId}`;
    const started = await this._repo.createGeneration(
      spaceId,
      payload,
      this._journal.keyFor(intent, payload),
    );

    this._journal.release(intent);

    return started;
  };
}
