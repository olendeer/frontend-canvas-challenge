import { ReactNode } from 'react';

import styles from './status-badge.module.scss';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'progress';

interface StatusBadgeProps {
  children: ReactNode;
  tone: StatusTone;
}

export const StatusBadge = ({ children, tone }: StatusBadgeProps) => (
  <span className={[styles.badge, styles[tone]].join(' ')}>{children}</span>
);
