'use client';

import { NodeProps } from '@xyflow/react';

import { getIsProcessing, getIsSucceeded } from 'domain/generation';
import { Spinner, StatusBadge } from 'ui-kit';

import { useCanvasStatus } from '../../canvas.context';
import { ResultNode as ResultNodeModel } from '../../canvas.types';
import { getGenerationFailureMessage, getGenerationStatusView } from '../../generation.status';
import { NodeFrame } from '../../node-frame';
import styles from './result-node.module.scss';

export const ResultNode = ({ data, id, selected }: NodeProps<ResultNodeModel>) => {
  const { generations } = useCanvasStatus();

  // Попытка выбирается по сохранённому в генерации resultNodeId и только самая свежая, поэтому
  // результат удалённой или перецепленной ветки не попадает в чужую ноду.
  const generation = generations.byResultNode.get(id);
  const status = getGenerationStatusView(generation);
  const failure = getGenerationFailureMessage(generation);

  return (
    <NodeFrame
      hasInput
      id={id}
      isSelected={selected}
      kind="result"
      status={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      title={data.label}
    >
      {getIsProcessing(generation) ? (
        <p className={styles.state}>
          <Spinner label="Ожидаем изображение" /> Ожидаем изображение…
        </p>
      ) : null}

      {getIsSucceeded(generation) && generation?.imageUrl ? (
        <figure className={styles.figure}>
          <img alt={`Результат генерации: ${generation.prompt}`} src={generation.imageUrl} />
          <figcaption className={styles.caption}>{generation.prompt}</figcaption>
        </figure>
      ) : null}

      {failure ? <p className={styles.error}>{failure}</p> : null}

      {generation ? null : <p className={styles.state}>Здесь появится изображение.</p>}
    </NodeFrame>
  );
};
