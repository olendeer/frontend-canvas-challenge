import { ReactNode } from 'react';

import styles from './alert.module.scss';

export type AlertTone = 'danger' | 'warning' | 'success' | 'info';

interface AlertProps {
  action?: ReactNode;
  children: ReactNode;
  title?: string;
  tone?: AlertTone;
}

const ROLE_BY_TONE: Record<AlertTone, string> = {
  danger: 'alert',
  info: 'status',
  success: 'status',
  warning: 'status',
};

export const Alert = ({ action, children, title, tone = 'danger' }: AlertProps) => (
  <div className={[styles.alert, styles[tone]].join(' ')} role={ROLE_BY_TONE[tone]}>
    <div className={styles.body}>
      {title ? <strong className={styles.title}>{title}</strong> : null}
      <span>{children}</span>
    </div>
    {action ? <div className={styles.action}>{action}</div> : null}
  </div>
);
