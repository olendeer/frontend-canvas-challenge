import { Card } from '../card';
import { Spinner } from '../spinner';
import styles from './loading-card.module.scss';

interface LoadingCardProps {
  label: string;
}

/** Одинаковое состояние ожидания для любого экрана: спиннер, подпись и её озвучка. */
export const LoadingCard = ({ label }: LoadingCardProps) => (
  <Card className={styles.card}>
    <Spinner label={label} /> {label}…
  </Card>
);
