'use client';

import { ReactNode } from 'react';

import { getErrorMessage } from 'domain/errors';
import { Alert, AlertTone, Button } from 'ui-kit';

interface ErrorAlertProps {
  actionLabel?: string;
  /** Пояснение к ошибке: что именно произойдёт после действия. */
  children?: ReactNode;
  error: unknown;
  onAction?: () => void;
  title: string;
  tone?: AlertTone;
}

/**
 * Единственный способ показать ошибку запроса: текст берётся из таблицы кодов, кнопка
 * повтора выглядит и называется одинаково на всех экранах.
 */
export const ErrorAlert = ({
  actionLabel = 'Повторить',
  children,
  error,
  onAction,
  title,
  tone,
}: ErrorAlertProps) => (
  <Alert
    action={
      onAction ? (
        <Button onClick={onAction} size="sm" variant="secondary">
          {actionLabel}
        </Button>
      ) : undefined
    }
    title={title}
    tone={tone}
  >
    {getErrorMessage(error)} {children}
  </Alert>
);
