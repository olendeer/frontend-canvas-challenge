import { ButtonHTMLAttributes } from 'react';

import { Spinner } from '../spinner';
import { ButtonAppearance, getButtonClassName } from './button.styles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonAppearance {
  isLoading?: boolean;
}

export const Button = ({
  children,
  className,
  disabled,
  isFullWidth,
  isLoading,
  size,
  type = 'button',
  variant,
  ...rest
}: ButtonProps) => (
  <button
    {...rest}
    aria-busy={isLoading || undefined}
    className={getButtonClassName({ className, isFullWidth, size, variant })}
    disabled={disabled || isLoading}
    type={type}
  >
    {isLoading ? <Spinner /> : null}
    <span>{children}</span>
  </button>
);
