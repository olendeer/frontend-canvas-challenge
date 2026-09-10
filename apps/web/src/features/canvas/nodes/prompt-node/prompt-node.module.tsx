'use client';

import { NodeProps } from '@xyflow/react';

import { TextArea } from 'ui-kit';

import { useCanvasActions } from '../../canvas.context';
import { PromptNode as PromptNodeModel } from '../../canvas.types';
import { NodeFrame } from '../../node-frame';

const MAX_TEXT_LENGTH = 2000;

export const PromptNode = ({ data, id, selected }: NodeProps<PromptNodeModel>) => {
  const { onTextChange } = useCanvasActions();

  return (
    <NodeFrame hasOutput id={id} isSelected={selected} kind="prompt" title="Текст">
      <TextArea
        hint={`${data.text.length} из ${MAX_TEXT_LENGTH} символов`}
        label="Описание изображения"
        maxLength={MAX_TEXT_LENGTH}
        onChange={(event) => onTextChange(id, event.target.value)}
        placeholder="Например: горы на рассвете"
        rows={4}
        value={data.text}
      />
    </NodeFrame>
  );
};
