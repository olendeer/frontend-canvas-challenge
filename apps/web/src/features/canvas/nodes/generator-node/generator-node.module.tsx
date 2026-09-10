'use client';

import { NodeProps } from '@xyflow/react';
import { useState } from 'react';

import { GenerationScenario } from 'domain/contracts';
import { getCodeMessage, getErrorMessage } from 'domain/errors';
import { getIsFailed, getIsProcessing } from 'domain/generation';
import { CHAIN_ISSUE_MESSAGE, getChainIssue } from 'domain/graph';
import { Button, Select, SelectOption, StatusBadge } from 'ui-kit';

import { useCanvasActions, useCanvasStatus } from '../../canvas.context';
import { GeneratorNode as GeneratorNodeModel } from '../../canvas.types';
import { getGenerationStatusView } from '../../generation.status';
import { NodeFrame } from '../../node-frame';
import styles from './generator-node.module.scss';

const SCENARIO_OPTIONS: readonly SelectOption[] = [
  { label: 'Успех', value: 'success' },
  { label: 'Тестовый отказ', value: 'failure' },
];

export const GeneratorNode = ({ data, id, selected }: NodeProps<GeneratorNodeModel>) => {
  const { onStartGeneration } = useCanvasActions();
  const { generations, index, startError, startErrorNodeId, startingNodeId } = useCanvasStatus();
  const [scenario, setScenario] = useState<GenerationScenario>('success');

  const generation = generations.byNode.get(id);
  const status = getGenerationStatusView(generation);
  const issue = getChainIssue(index, id);
  const isStarting = startingNodeId === id;
  const isRunning = isStarting || getIsProcessing(generation);
  const error =
    startErrorNodeId === id
      ? getErrorMessage(startError)
      : getIsFailed(generation)
        ? getCodeMessage(generation?.failureCode ?? null)
        : null;

  return (
    <NodeFrame
      hasInput
      hasOutput
      id={id}
      isSelected={selected}
      kind="generator"
      status={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      title={data.label}
    >
      <Select
        label="Сценарий генерации"
        onChange={(event) => setScenario(event.target.value as GenerationScenario)}
        options={SCENARIO_OPTIONS}
        value={scenario}
      />

      <Button
        disabled={isRunning || issue !== null}
        isFullWidth
        isLoading={isRunning}
        onClick={() => onStartGeneration(id, scenario)}
        size="sm"
      >
        {generation ? 'Запустить снова' : 'Сгенерировать'}
      </Button>

      {issue ? <p className={styles.hint}>{CHAIN_ISSUE_MESSAGE[issue]}</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </NodeFrame>
  );
};
