'use client';

import { ConfigEntity } from 'domain/config';
import { GraphNodeKind } from 'domain/contracts';
import { Button } from 'ui-kit';

import { CanvasGraph } from '../canvas.store';
import styles from './canvas-toolbar.module.scss';

interface CanvasToolbarProps {
  config: ConfigEntity;
  graph: CanvasGraph;
  onAddNode: (kind: GraphNodeKind) => void;
}

const NODE_BUTTONS: readonly { kind: GraphNodeKind; label: string }[] = [
  { kind: 'prompt', label: 'Добавить текст' },
  { kind: 'generator', label: 'Добавить генератор' },
  { kind: 'result', label: 'Добавить результат' },
];

export const CanvasToolbar = ({ config, graph, onAddNode }: CanvasToolbarProps) => {
  const isFull = graph.isNodeLimitReached(config.maxNodes);

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
        Нод: {graph.nodes.length} из {config.maxNodes}
        {isFull ? '. Лимит достигнут.' : ''}
      </p>
    </div>
  );
};
