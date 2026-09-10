import { Generation } from 'domain/contracts';
import { StatusTone } from 'ui-kit';

interface GenerationStatusView {
  label: string;
  tone: StatusTone;
}

const VIEW_BY_STATUS: Record<Generation['status'], GenerationStatusView> = {
  failed: { label: 'Отказ', tone: 'danger' },
  processing: { label: 'Генерация…', tone: 'progress' },
  succeeded: { label: 'Готово', tone: 'success' },
};

const NOT_STARTED: GenerationStatusView = { label: 'Не запускалась', tone: 'neutral' };

/** Одна таблица «статус генерации → подпись и тон» для генератора и результата. */
export const getGenerationStatusView = (generation?: Generation | null): GenerationStatusView =>
  generation ? VIEW_BY_STATUS[generation.status] : NOT_STARTED;
