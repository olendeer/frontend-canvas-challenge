import type { GraphEntity } from './graph.entity';

/** Чего не хватает генератору для запуска. Повторяет проверку INCOMPLETE_CHAIN на сервере. */
export enum ChainIssue {
  promptEmpty = 'promptEmpty',
  promptMissing = 'promptMissing',
  resultMissing = 'resultMissing',
}

export const CHAIN_ISSUE_MESSAGE: Record<ChainIssue, string> = {
  [ChainIssue.promptEmpty]: 'Заполните описание изображения в текстовой ноде.',
  [ChainIssue.promptMissing]: 'Соедините текстовую ноду со входом генератора.',
  [ChainIssue.resultMissing]: 'Соедините выход генератора с нодой результата.',
};

/**
 * Граф вместе с версией представления: ETag выдаётся только для него и живёт отдельно от
 * сущности, потому что черновик правится локально, а версия меняется только ответом сервера.
 */
export interface GraphSnapshot {
  etag: string;
  graph: GraphEntity;
}
