import { ReactNode } from 'react';

import styles from './empty-state.module.scss';

interface EmptyStateProps {
  action?: ReactNode;
  description?: string;
  title: string;
}

export const EmptyState = ({ action, description, title }: EmptyStateProps) => (
  <div className={styles.empty}>
    <h2 className={styles.title}>{title}</h2>
    {description ? <p className={styles.description}>{description}</p> : null}
    {action}
  </div>
);
