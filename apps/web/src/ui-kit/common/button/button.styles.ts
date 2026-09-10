import styles from './button.module.scss';

export type ButtonSize = 'md' | 'sm';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonAppearance {
  className?: string;
  isFullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

/** Один расчёт классов для кнопок и ссылок-кнопок. */
export const getButtonClassName = ({
  className,
  isFullWidth,
  size = 'md',
  variant = 'primary',
}: ButtonAppearance): string =>
  [
    styles.button,
    styles[variant],
    styles[size],
    isFullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
