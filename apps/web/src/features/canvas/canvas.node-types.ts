import type { NodeTypes } from '@xyflow/react';

import { GeneratorNode, PromptNode, ResultNode } from './nodes';

/** Ссылка должна быть стабильной: React Flow сравнивает её по идентичности. */
export const nodeTypes: NodeTypes = {
  generator: GeneratorNode,
  prompt: PromptNode,
  result: ResultNode,
};
