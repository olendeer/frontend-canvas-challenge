'use client';

import { Handle, Position } from '@xyflow/react';
import { ReactNode } from 'react';

import { GraphNodeKind } from 'domain/contracts';

import { useCanvasActions } from '../canvas.context';
import styles from './node-frame.module.scss';

interface NodeFrameProps {
  children?: ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  id: string;
  isSelected?: boolean;
  kind: GraphNodeKind;
  status?: ReactNode;
  title: string;
}

/**
 * Общая обвязка всех нод: порты, заголовок, кнопка удаления и место под состояние.
 * Ноды отличаются только содержимым, поэтому разметка и подписи портов живут здесь.
 */
export const NodeFrame = ({
  children,
  hasInput,
  hasOutput,
  id,
  isSelected,
  kind,
  status,
  title,
}: NodeFrameProps) => {
  const { onRemoveNode } = useCanvasActions();

  return (
    <div
      className={[styles.node, styles[kind], isSelected ? styles.selected : '']
        .filter(Boolean)
        .join(' ')}
    >
      {hasInput ? (
        <Handle
          aria-label={`Вход ноды «${title}»`}
          className={styles.handle}
          position={Position.Left}
          type="target"
        />
      ) : null}

      <header className={styles.header}>
        <span className={styles.title}>{title}</span>
        <button
          aria-label={`Удалить ноду «${title}»`}
          className={['nodrag', styles.remove].join(' ')}
          onClick={() => onRemoveNode(id)}
          type="button"
        >
          Удалить
        </button>
      </header>

      {status ? <div className={styles.status}>{status}</div> : null}
      {/* nodrag и nowheel: ввод и кнопки внутри ноды не перетаскивают её и не зумят канвас. */}
      {children ? (
        <div className={['nodrag', 'nowheel', styles.body].join(' ')}>{children}</div>
      ) : null}

      <footer className={styles.ports}>
        {hasInput ? <span>вход слева</span> : <span />}
        {hasOutput ? <span>выход справа</span> : null}
      </footer>

      {hasOutput ? (
        <Handle
          aria-label={`Выход ноды «${title}»`}
          className={styles.handle}
          position={Position.Right}
          type="source"
        />
      ) : null}
    </div>
  );
};
