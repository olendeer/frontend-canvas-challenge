import { WriteQueue } from 'core/sync';
import { Graph } from 'domain/contracts';
import { getIsGraphConflict } from 'domain/errors';

import { CanvasStore } from './canvas.store';

export interface CanvasController {
  dispose: () => void;
  queue: WriteQueue<Graph>;
  store: CanvasStore;
}

interface CanvasControllerOptions {
  getDelayMs: () => number;
  save: (graph: Graph) => Promise<void>;
}

/**
 * Связывает черновик графа с отложенной записью: любая правка помечает черновик грязным,
 * очередь через debounce отправляет актуальный снимок, конфликт версий останавливает запись
 * до решения пользователя. Больше нигде в приложении сохранение графа не запускается.
 */
export const createCanvasController = ({
  getDelayMs,
  save,
}: CanvasControllerOptions): CanvasController => {
  const store = new CanvasStore();
  const queue = new WriteQueue<Graph>({
    getDelayMs,
    getIsBlocking: getIsGraphConflict,
    read: store.toPayload,
    write: save,
  });

  store.setOnChange(queue.schedule);

  // Уход со страницы не должен тихо терять правку, сделанную за миг до этого: отложенное
  // уходит на сервер сразу, ошибку показывать уже некому.
  const dispose = () => {
    queue.flush().catch(() => undefined);
    queue.dispose();
  };

  return { dispose, queue, store };
};
