import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';

import { ObservableStore } from 'core/store';
import { ConfigEntity } from 'domain/config';
import { Graph, GraphNodeKind, Viewport } from 'domain/contracts';
import { GraphEntity } from 'domain/graph';

import { CanvasEdge, CanvasNode } from './canvas.types';

/** Граф канваса: та же сущность, но с нодами и связями в форме React Flow. */
export type CanvasGraph = GraphEntity<CanvasNode, CanvasEdge>;

/**
 * Локальный черновик графа — единственный источник правды для редактирования. Снимок хранилища
 * и есть сущность графа: все правила живут в ней, а стор отвечает только за то, какое событие
 * канваса во что превращается и когда запускать сохранение.
 *
 * Выделение ноды и замер её размеров правкой не считаются: они меняют снимок, но не поднимают
 * PUT. Перетаскивание правкой считается, но структуру не меняет, поэтому индекс графа
 * переезжает в новый снимок как есть.
 */
export class CanvasStore extends ObservableStore<CanvasGraph> {
  private _config = ConfigEntity.defaults();
  private _onChange: () => void = () => {};

  constructor() {
    super(GraphEntity.empty() as CanvasGraph);
  }

  /** Правка черновика: сюда подключается очередь записи. */
  setOnChange = (onChange: () => void): void => {
    this._onChange = onChange;
  };

  setConfig = (config: ConfigEntity): void => {
    this._config = config;
  };

  /** Состояние сервера. Правкой не считается: сохранять нечего. */
  replace = (graph: GraphEntity): void => {
    // Копии объектов: ноды канваса не должны делить ссылки с кэшем запросов.
    const nodes = graph.nodes.map((node) => ({ ...node })) as CanvasNode[];
    const edges: CanvasEdge[] = graph.edges.map((edge) => ({ ...edge }));

    this._set(new GraphEntity(nodes, edges, graph.viewport));
  };

  /** origin — левый верхний угол видимой области канваса в координатах графа. */
  addNode = (kind: GraphNodeKind, origin: { x: number; y: number }): void => {
    const graph = this.getSnapshot();

    if (graph.isNodeLimitReached(this._config.maxNodes)) {
      return;
    }

    this._commit(graph.withNewNode(kind, origin));
  };

  removeNodes = (ids: readonly string[]): void => {
    const graph = this.getSnapshot();
    const next = graph.withoutNodes(new Set(ids));

    if (next !== graph) {
      this._commit(next);
    }
  };

  connect = (connection: Connection): void => {
    const graph = this.getSnapshot();

    if (
      graph.isEdgeLimitReached(this._config.maxEdges) ||
      !graph.canConnect(connection.source, connection.target)
    ) {
      return;
    }

    this._commit(graph.withNewEdge(connection.source, connection.target));
  };

  /**
   * Изменения React Flow: один проход решает, нужно ли сохранение и пересборка индекса.
   * position меняет постоянные данные, но не структуру; select и dimensions не меняют ничего,
   * что уходит на сервер, поэтому не поднимают лишний PUT.
   */
  applyNodeChanges = (changes: NodeChange<CanvasNode>[]): void => {
    const graph = this.getSnapshot();
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

    const nodes = applyNodeChanges(changes, graph.nodes);

    this._commit(
      isStructural ? graph.withNodes(nodes, removed ?? undefined) : graph.withMovedNodes(nodes),
      isPersisted,
    );
  };

  applyEdgeChanges = (changes: EdgeChange<CanvasEdge>[]): void => {
    const graph = this.getSnapshot();
    let isPersisted = false;

    for (let index = 0; index < changes.length; index += 1) {
      if (changes[index].type !== 'select') {
        isPersisted = true;

        break;
      }
    }

    this._commit(graph.withEdges(applyEdgeChanges(changes, graph.edges)), isPersisted);
  };

  setPromptText = (id: string, text: string): void => {
    this._commit(this.getSnapshot().withNodeData(id, { text }));
  };

  setViewport = (viewport: Viewport): void => {
    this._commit(this.getSnapshot().withViewport(viewport));
  };

  /** Тело PUT читается очередью записи в момент отправки. */
  toPayload = (): Graph => this.getSnapshot().toPayload();

  private _commit = (graph: CanvasGraph, isPersisted = true): void => {
    this._set(graph);

    if (isPersisted) {
      this._onChange();
    }
  };
}
