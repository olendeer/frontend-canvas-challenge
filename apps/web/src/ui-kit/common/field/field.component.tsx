import { ReactNode, useId } from 'react';

import styles from './field.module.scss';

/** Атрибуты, которые Field выдаёт своему полю: id, связь с подсказкой и признак ошибки. */
export interface FieldControlProps {
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  className: string;
  id: string;
}

interface FieldProps {
  children: (control: FieldControlProps) => ReactNode;
  error?: string;
  hint?: string;
  isLabelHidden?: boolean;
  label: string;
}

/**
 * Разметка любого поля: подпись, подсказка, текст ошибки и связывающие их aria-атрибуты.
 * Конкретные поля отличаются только тегом, поэтому это поведение описано здесь один раз.
 */
export const Field = ({ children, error, hint, isLabelHidden, label }: FieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ');

  return (
    <div className={styles.field}>
      <label className={isLabelHidden ? 'visually-hidden' : styles.label} htmlFor={id}>
        {label}
      </label>
      {children({
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        className: [styles.control, error ? styles.invalid : ''].filter(Boolean).join(' '),
        id,
      })}
      {hint ? (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className={styles.error} id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
};
