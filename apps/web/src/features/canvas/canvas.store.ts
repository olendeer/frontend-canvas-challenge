import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';

import { ObservableStore } from 'core/store';
import { CONFIG_DEFAULTS, ResolvedConfig } from 'domain/config';
import { Graph, GraphNodeKind, Viewport } from 'domain/contracts';
import {
  buildGraphIndex,
  createGraphNode,
  dropEdgesTouching,
  EMPTY_GRAPH,
  getIsLimitReached,
  getIsValidConnection,
  getNextNodePosition,
  GraphIndex,
  toGraphPayload,
  withNodeData,
} from 'domain/graph';

import { CanvasEdge, CanvasNode } from './canvas.types';

export interface CanvasSnapshot {
  edges: CanvasEdge[];
  index: GraphIndex;
  nodes: CanvasNode[];
  viewport: Viewport;
}

/**
 * Локальный черновик графа — единственный источник правды для редактирования.
 *
 * Снимок заменяется целиком, но неизменившиеся части сохраняют ссылки: перетаскивание ноды
 * не пересобирает индекс и не пересоздаёт массив связей, а выделение ноды вообще не считается
 * правкой и не запускает сохранение. Индекс пересобирается только при изменении структуры или
 * данных нод и хранит одни примитивы, поэтому не может разойтись с координатами.
 */
export class CanvasStore extends ObservableStore<CanvasSnapshot> {
  private _config: ResolvedConfig = CONFIG_DEFAULTS;
  private _onChange: () => void = () => {};

  constructor() {
    super({
      edges: [],
      index: buildGraphIndex([], []),
      nodes: [],
      viewport: EMPTY_GRAPH.viewport,
    });
  }

  /** Правка черновика: сюда подключается очередь записи. */
  setOnChange = (onChange: () => void): void => {
    this._onChange = onChange;
  };

  setConfig = (config: ResolvedConfig): void => {
    this._config = config;
  };

  /** Состояние сервера. Правкой не считается: сохранять нечего. */
  replace = (graph: Graph): void => {
    const nodes = graph.nodes.map((node) => ({ ...node })) as CanvasNode[];
    const edges: CanvasEdge[] = graph.edges.map((edge) => ({ ...edge }));

    this._set({ edges, index: buildGraphIndex(nodes, edges), nodes, viewport: graph.viewport });
  };

  /** origin — левый верхний угол видимой области канваса в координатах графа. */
  addNode = (kind: GraphNodeKind, origin: { x: number; y: number }): void => {
    const { edges, nodes, viewport } = this.getSnapshot();

    if (getIsLimitReached(nodes.length, this._config.maxNodes)) {
      return;
    }

    const node = createGraphNode(kind, getNextNodePosition(kind, nodes, origin)) as CanvasNode;

    this._commit([...nodes, node], edges, viewport, true);
  };

  removeNodes = (ids: readonly string[]): void => {
    const { edges, nodes, viewport } = this.getSnapshot();
    const removed = new Set(ids);
    const rest = nodes.filter((node) => !removed.has(node.id));

    if (rest.length === nodes.length) {
      return;
    }

    this._commit(rest, dropEdgesTouching(edges, removed), viewport, true);
  };

  connect = (connection: Connection): void => {
    const { edges, index, nodes, viewport } = this.getSnapshot();

    if (
      getIsLimitReached(edges.length, this._config.maxEdges) ||
      !getIsValidConnection(index, connection.source, connection.target)
    ) {
      return;
    }

    const edge: CanvasEdge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
    };

    this._commit(nodes, [...edges, edge], viewport, true);
  };

  /**
   * Изменения React Flow: один проход решает, нужно ли сохранение и переиндексация.
   * position меняет постоянные данные, но не структуру; select и dimensions не меняют ничего,
   * что уходит на сервер, поэтому не поднимают лишний PUT.
   */
  applyNodeChanges = (changes: NodeChange<CanvasNode>[]): void => {
    const { edges, nodes, viewport } = this.getSnapshot();
    let isPersisted = false;
    let isStructural = false;
    let removed: Set<string> | null = null;

    for (let index = 0; index < changes.length; index += 1) {
      const change = changes[index];

      if (change.type === 'select' || change.type === 'dimensions') {
        continue;
      }

      isPersisted = true;

      if (change.type === 'position') {
        continue;
      }

      isStructural = true;

      if (change.type === 'remove') {
        (removed ??= new Set()).add(change.id);
      }
    }

    this._commit(
      applyNodeChanges(changes, nodes),
      removed === null ? edges : dropEdgesTouching(edges, removed),
      viewport,
      isStructural,
      isPersisted,
    );
  };

  applyEdgeChanges = (changes: EdgeChange<CanvasEdge>[]): void => {
    const { edges, nodes, viewport } = this.getSnapshot();
    let isPersisted = false;

    for (let index = 0; index < changes.length; index += 1) {
      if (changes[index].type !== 'select') {
        isPersisted = true;

        break;
      }
    }

    this._commit(nodes, applyEdgeChanges(changes, edges), viewport, isPersisted, isPersisted);
  };

  setPromptText = (id: string, text: string): void => {
    const { edges, nodes, viewport } = this.getSnapshot();

    this._commit(withNodeData(nodes, id, { text }), edges, viewport, true);
  };

  setViewport = (viewport: Viewport): void => {
    const { edges, nodes } = this.getSnapshot();

    this._commit(nodes, edges, viewport, false);
  };

  /** Тело PUT читается очередью записи в момент отправки. */
  toPayload = (): Graph => {
    const { edges, nodes, viewport } = this.getSnapshot();

    return toGraphPayload(nodes, edges, viewport);
  };

  private _commit = (
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    viewport: Viewport,
    isStructural: boolean,
    isPersisted = true,
  ): void => {
    const previous = this.getSnapshot();

    this._set({
      edges,
      index: isStructural ? buildGraphIndex(nodes, edges) : previous.index,
      nodes,
      viewport,
    });

    if (isPersisted) {
      this._onChange();
    }
  };
}
