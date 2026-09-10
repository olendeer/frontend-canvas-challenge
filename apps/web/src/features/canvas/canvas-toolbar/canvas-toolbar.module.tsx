'use client';

import { GraphNodeKind } from 'domain/contracts';
import { getIsLimitReached } from 'domain/graph';
import { Button } from 'ui-kit';

import styles from './canvas-toolbar.module.scss';

interface CanvasToolbarProps {
  maxNodes: number;
  nodeCount: number;
  onAddNode: (kind: GraphNodeKind) => void;
}

const NODE_BUTTONS: readonly { kind: GraphNodeKind; label: string }[] = [
  { kind: 'prompt', label: 'Добавить текст' },
  { kind: 'generator', label: 'Добавить генератор' },
  { kind: 'result', label: 'Добавить результат' },
];

export const CanvasToolbar = ({ maxNodes, nodeCount, onAddNode }: CanvasToolbarProps) => {
  const isFull = getIsLimitReached(nodeCount, maxNodes);

  return (
    <div className={styles.toolbar}>
      <div className={styles.actions}>
        {NODE_BUTTONS.map(({ kind, label }) => (
          <Button
            disabled={isFull}
            key={kind}
            onClick={() => onAddNode(kind)}
            size="sm"
            variant="secondary"
          >
            {label}
          </Button>
        ))}
      </div>
      <p className={styles.counter}>
        Нод: {nodeCount} из {maxNodes}
        {isFull ? '. Лимит достигнут.' : ''}
      </p>
    </div>
  );
};
