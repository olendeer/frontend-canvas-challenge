import { ConfigEntity } from 'domain/config';

import { GenerationEntity } from './generation.entity';

/**
 * Список генераций пространства с готовыми ответами на два вопроса, которые задаёт каждая
 * нода: «что у этого генератора» и «что показать в этой ноде результата».
 *
 * Индексы собираются одним проходом при создании. Список приходит от новых к старым, поэтому
 * первое попадание — самая свежая попытка. Без индексов каждая нода искала бы свою попытку
 * линейным find, то есть O(ноды × генерации) на каждую перерисовку канваса.
 */
export class GenerationsEntity {
  private static _empty: GenerationsEntity | null = null;

  private readonly _byNode = new Map<string, GenerationEntity>();
  private readonly _byResultNode = new Map<string, GenerationEntity>();
  private readonly _hasProcessing: boolean;

  constructor(readonly items: GenerationEntity[]) {
    let hasProcessing = false;

    for (let index = 0; index < items.length; index += 1) {
      const generation = items[index];

      if (!this._byNode.has(generation.nodeId)) {
        this._byNode.set(generation.nodeId, generation);
      }

      if (!this._byResultNode.has(generation.resultNodeId)) {
        this._byResultNode.set(generation.resultNodeId, generation);
      }

      hasProcessing = hasProcessing || generation.isProcessing;
    }

    this._hasProcessing = hasProcessing;
  }

  /** Один экземпляр на всё приложение: ссылка стабильна, пока список не загрузился. */
  static empty(): GenerationsEntity {
    GenerationsEntity._empty ??= new GenerationsEntity([]);

    return GenerationsEntity._empty;
  }

  get hasProcessing(): boolean {
    return this._hasProcessing;
  }

  forNode(nodeId: string): GenerationEntity | undefined {
    return this._byNode.get(nodeId);
  }

  forResultNode(resultNodeId: string): GenerationEntity | undefined {
    return this._byResultNode.get(resultNodeId);
  }

  /**
   * Пауза до следующего опроса или false, когда опрашивать нечего. Первая пауза берётся из
   * Retry-After ответа 202, дальше — из настроек сервера.
   */
  pollDelayMs(config: ConfigEntity, retryAfterMs: number | null): number | false {
    if (!this._hasProcessing) {
      return false;
    }

    return retryAfterMs ?? config.pollIntervalMs;
  }
}
