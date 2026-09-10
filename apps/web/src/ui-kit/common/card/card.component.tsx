import { ElementType, HTMLAttributes, ReactNode } from 'react';

import styles from './card.module.scss';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
}

export const Card = ({ as: Tag = 'div', children, className, ...rest }: CardProps) => (
  <Tag {...rest} className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
    {children}
  </Tag>
);
