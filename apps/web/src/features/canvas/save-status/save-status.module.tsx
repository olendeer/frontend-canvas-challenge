'use client';

import { WriteQueueState } from 'core/sync';
import { StatusBadge, StatusTone } from 'ui-kit';

interface SaveStatusView {
  label: string;
  tone: StatusTone;
}

interface SaveStatusProps {
  state: WriteQueueState;
}

/**
 * Одно место, где состояние очереди записи превращается в подпись. Порядок проверок задаёт
 * приоритет: конфликт важнее ошибки, ошибка важнее ожидания.
 */
const getSaveStatusView = ({
  error,
  isBlocked,
  isPending,
  isWriting,
}: WriteQueueState): SaveStatusView => {
  if (isBlocked) {
    return { label: 'Конфликт версий', tone: 'danger' };
  }

  if (error !== null) {
    return { label: 'Не сохранено', tone: 'danger' };
  }

  if (isWriting) {
    return { label: 'Сохраняем…', tone: 'progress' };
  }

  if (isPending) {
    return { label: 'Есть несохранённые правки', tone: 'warning' };
  }

  return { label: 'Сохранено', tone: 'success' };
};

export const SaveStatus = ({ state }: SaveStatusProps) => {
  const view = getSaveStatusView(state);

  return (
    <span aria-live="polite" data-testid="save-status">
      <StatusBadge tone={view.tone}>{view.label}</StatusBadge>
    </span>
  );
};
