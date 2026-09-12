'use client';

import { NodeProps } from '@xyflow/react';

import { Spinner, StatusBadge } from 'ui-kit';

import { useCanvasStatus } from '../../canvas.context';
import { ResultNode as ResultNodeModel } from '../../canvas.types';
import { getGenerationStatusView } from '../../generation.status';
import { NodeFrame } from '../../node-frame';
import styles from './result-node.module.scss';

export const ResultNode = ({ data, id, selected }: NodeProps<ResultNodeModel>) => {
  const { generations } = useCanvasStatus();

  // Попытка выбирается по сохранённому в генерации resultNodeId и только самая свежая, поэтому
  // результат удалённой или перецепленной ветки не попадает в чужую ноду.
  const generation = generations.forResultNode(id);
  const status = getGenerationStatusView(generation);

  return (
    <NodeFrame
      hasInput
      id={id}
      isSelected={selected}
      kind="result"
      status={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      title={data.label}
    >
      {generation?.isProcessing ? (
        <p className={styles.state}>
          <Spinner label="Ожидаем изображение" /> Ожидаем изображение…
        </p>
      ) : null}

      {generation?.isSucceeded && generation.imageUrl ? (
        <figure className={styles.figure}>
          <img alt={`Результат генерации: ${generation.prompt}`} src={generation.imageUrl} />
          <figcaption className={styles.caption}>{generation.prompt}</figcaption>
        </figure>
      ) : null}

      {generation?.failureMessage ? (
        <p className={styles.error}>{generation.failureMessage}</p>
      ) : null}

      {generation ? null : <p className={styles.state}>Здесь появится изображение.</p>}
    </NodeFrame>
  );
};
