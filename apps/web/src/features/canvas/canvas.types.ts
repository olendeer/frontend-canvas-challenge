import type { Edge, Node } from '@xyflow/react';

import { GraphNodeData, GraphNodeKind } from 'domain/contracts';

/**
 * Нода канваса — это постоянные поля графа плюс служебные поля React Flow (selected,
 * dragging, measured). Постоянная часть берётся из схемы API, поэтому расхождения между
 * тем, что рисуется, и тем, что уходит в PUT, быть не может.
 */
type CanvasNodeOf<TKind extends GraphNodeKind> = Node<GraphNodeData<TKind>, TKind> & {
  type: TKind;
};

export type PromptNode = CanvasNodeOf<'prompt'>;
export type GeneratorNode = CanvasNodeOf<'generator'>;
export type ResultNode = CanvasNodeOf<'result'>;
export type CanvasNode = PromptNode | GeneratorNode | ResultNode;
export type CanvasEdge = Edge;
