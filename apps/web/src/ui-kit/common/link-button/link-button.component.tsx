import Link from 'next/link';
import { ComponentProps } from 'react';

import { ButtonAppearance, getButtonClassName } from '../button';

interface LinkButtonProps extends ComponentProps<typeof Link>, ButtonAppearance {}

export const LinkButton = ({
  children,
  className,
  isFullWidth,
  size,
  variant,
  ...rest
}: LinkButtonProps) => (
  <Link {...rest} className={getButtonClassName({ className, isFullWidth, size, variant })}>
    <span>{children}</span>
  </Link>
);
