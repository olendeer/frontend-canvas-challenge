import styles from './spinner.module.scss';

interface SpinnerProps {
  label?: string;
}

export const Spinner = ({ label = 'Загрузка' }: SpinnerProps) => (
  <span className={styles.spinner} role="status">
    <span className="visually-hidden">{label}</span>
  </span>
);
