import { Graph, GraphEdge, GraphNode, GraphNodeKind, Viewport } from 'domain/contracts';

import { ChainIssue } from './graph.types';

/**
 * Индекс графа: собирается один раз на изменение структуры или данных нод вместо линейного
 * поиска на каждое обращение. Хранит только примитивы, поэтому не удерживает удалённые ноды
 * и не может разойтись с координатами, которых в нём нет.
 */
interface GraphIndex {
  kindById: Map<string, GraphNodeKind>;
  promptTextById: Map<string, string>;
  resultByGenerator: Map<string, string>;
  sourceByTarget: Map<string, string>;
}

/** Повторяет ограничения схемы графа на бэкенде, чтобы не отправлять заведомо неверный PUT. */
const POSITION_LIMIT = 10_000;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;

const DEFAULT_NODE_DATA = {
  generator: { label: 'Генератор' },
  prompt: { text: '' },
  result: { label: 'Результат' },
} as const;

/** Колонки под поток «текст → генератор → результат»: новые ноды сразу стоят по цепочке. */
const COLUMN_BY_KIND: Record<GraphNodeKind, number> = { generator: 1, prompt: 0, result: 2 };
const COLUMN_WIDTH = 320;
const ROW_HEIGHT = 260;

const EMPTY_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/**
 * Граф рабочего пространства: ноды, связи, положение канваса и все правила работы с ними.
 *
 * Сущность неизменяемая — каждый метод отдаёт новый граф, поэтому React видит новую ссылку
 * ровно тогда, когда что-то изменилось. Параметр TNode позволяет канвасу держать в той же
 * сущности ноды React Flow: их служебные поля лишь дополняют поля схемы API и отсекаются
 * в toPayload.
 */
export class GraphEntity<TNode extends GraphNode = GraphNode, TEdge extends GraphEdge = GraphEdge> {
  private _index: GraphIndex | null;

  constructor(
    readonly nodes: TNode[],
    readonly edges: TEdge[],
    readonly viewport: Viewport,
    index: GraphIndex | null = null,
  ) {
    this._index = index;
  }

  static empty(): GraphEntity {
    return new GraphEntity([], [], EMPTY_VIEWPORT);
  }

  static createNode(kind: GraphNodeKind, position: GraphNode['position']): GraphNode {
    // Единственное приведение типа: TypeScript не связывает kind с формой data при сборке
    // элемента размеченного объединения.
    return {
      data: { ...DEFAULT_NODE_DATA[kind] },
      id: crypto.randomUUID(),
      position: { x: position.x, y: position.y },
      type: kind,
    } as GraphNode;
  }

  static createEdge(source: string, target: string): GraphEdge {
    return { id: crypto.randomUUID(), source, target };
  }

  /**
   * Непрозрачный токен структуры: одна и та же ссылка у графов, которые отличаются только
   * координатами и служебными полями нод. Подписчики, которым важна структура, а не
   * координаты, используют его как ключ мемоизации и не пересчитываются на каждом кадре
   * перетаскивания.
   */
  get structure(): object {
    return this._getIndex();
  }

  isNodeLimitReached(max: number): boolean {
    return this.nodes.length >= max;
  }

  isEdgeLimitReached(max: number): boolean {
    return this.edges.length >= max;
  }

  /**
   * Разрешены только «текст → генератор» и «генератор → результат». У входа одна связь,
   * у генератора один результат, текст может питать несколько генераторов. Те же правила
   * проверяет сервер — здесь они нужны, чтобы не создавать связь, которую он отвергнет.
   * Вызывается на каждом кадре перетаскивания связи, поэтому только обращения к Map.
   */
  canConnect(source: string | null | undefined, target: string | null | undefined): boolean {
    if (!source || !target || source === target) {
      return false;
    }

    const index = this._getIndex();
    const from = index.kindById.get(source);
    const to = index.kindById.get(target);

    if (from === undefined || to === undefined || index.sourceByTarget.has(target)) {
      return false;
    }

    if (from === 'prompt') {
      return to === 'generator';
    }

    return from === 'generator' && to === 'result' && !index.resultByGenerator.has(source);
  }

  /** Чего не хватает генератору для запуска; null — цепочка готова. */
  chainIssueFor(generatorId: string): ChainIssue | null {
    const index = this._getIndex();

    if (!index.resultByGenerator.has(generatorId)) {
      return ChainIssue.resultMissing;
    }

    const promptId = index.sourceByTarget.get(generatorId);
    const text = promptId === undefined ? undefined : index.promptTextById.get(promptId);

    if (text === undefined) {
      return ChainIssue.promptMissing;
    }

    return text.trim() ? null : ChainIssue.promptEmpty;
  }

  /** Граф с новой нодой выбранного типа; origin — левый верхний угол видимой области. */
  withNewNode(kind: GraphNodeKind, origin: GraphNode['position']): GraphEntity<TNode, TEdge> {
    const node = GraphEntity.createNode(kind, this._nextPositionFor(kind, origin)) as TNode;

    return this.withNodes([...this.nodes, node]);
  }

  withNewEdge(source: string, target: string): GraphEntity<TNode, TEdge> {
    return this.withEdges([...this.edges, GraphEntity.createEdge(source, target) as TEdge]);
  }

  /**
   * Изменились структура или данные нод: индекс пересобирается. Если ноды удалены, их связи
   * уходят вместе с ними — одним проходом и только при реальном удалении.
   */
  withNodes(nodes: TNode[], removed?: ReadonlySet<string>): GraphEntity<TNode, TEdge> {
    const edges = removed === undefined ? this.edges : this._dropEdgesTouching(removed);

    return new GraphEntity(nodes, edges, this.viewport);
  }

  /** Ноды удалены по идентификаторам: отсеиваются и они, и их связи. */
  withoutNodes(removed: ReadonlySet<string>): GraphEntity<TNode, TEdge> {
    const nodes = this.nodes.filter((node) => !removed.has(node.id));

    return nodes.length === this.nodes.length ? this : this.withNodes(nodes, removed);
  }

  /**
   * Изменились только координаты или служебные поля React Flow — всё, чего нет в индексе.
   * Индекс переезжает в новый граф как есть и не пересобирается на каждом кадре.
   */
  withMovedNodes(nodes: TNode[]): GraphEntity<TNode, TEdge> {
    return new GraphEntity(nodes, this.edges, this.viewport, this._getIndex());
  }

  withEdges(edges: TEdge[]): GraphEntity<TNode, TEdge> {
    return new GraphEntity(this.nodes, edges, this.viewport);
  }

  withViewport(viewport: Viewport): GraphEntity<TNode, TEdge> {
    return new GraphEntity(this.nodes, this.edges, viewport, this._getIndex());
  }

  /** Новое значение data только у одной ноды: остальные сохраняют ссылку. */
  withNodeData(id: string, data: TNode['data']): GraphEntity<TNode, TEdge> {
    return this.withNodes(this.nodes.map((node) => (node.id === id ? { ...node, data } : node)));
  }

  /**
   * Тело PUT: только поля схемы графа. Служебные поля React Flow (selected, dragging,
   * measured, width, height) сервер не принимает. Один проход map по плотному массиву даёт
   * такой же плотный массив; предварительное new Array(n) сделало бы его holey, а reduce
   * с push — тем же проходом, но менее читаемым. Объекты data переиспользуются по ссылке:
   * они никогда не меняются на месте, копия не нужна.
   */
  toPayload(): Graph {
    return {
      edges: this.edges.map(({ id, source, target }) => ({ id, source, target })),
      nodes: this.nodes.map(
        (node) =>
          ({
            data: node.data,
            id: node.id,
            position: {
              x: clamp(Math.round(node.position.x), -POSITION_LIMIT, POSITION_LIMIT),
              y: clamp(Math.round(node.position.y), -POSITION_LIMIT, POSITION_LIMIT),
            },
            type: node.type,
          }) as GraphNode,
      ),
      viewport: {
        x: clamp(this.viewport.x, -POSITION_LIMIT, POSITION_LIMIT),
        y: clamp(this.viewport.y, -POSITION_LIMIT, POSITION_LIMIT),
        zoom: clamp(this.viewport.zoom, ZOOM_MIN, ZOOM_MAX),
      },
    };
  }

  private _nextPositionFor(
    kind: GraphNodeKind,
    origin: GraphNode['position'],
  ): GraphNode['position'] {
    let row = 0;

    for (let index = 0; index < this.nodes.length; index += 1) {
      if (this.nodes[index].type === kind) {
        row += 1;
      }
    }

    return { x: origin.x + COLUMN_BY_KIND[kind] * COLUMN_WIDTH, y: origin.y + row * ROW_HEIGHT };
  }

  /** Массив выделяется только если что-то действительно удаляется, иначе прежняя ссылка. */
  private _dropEdgesTouching(removed: ReadonlySet<string>): TEdge[] {
    let kept: TEdge[] | null = null;

    for (let index = 0; index < this.edges.length; index += 1) {
      const edge = this.edges[index];

      if (removed.has(edge.source) || removed.has(edge.target)) {
        kept ??= this.edges.slice(0, index);

        continue;
      }

      kept?.push(edge);
    }

    return kept ?? this.edges;
  }

  private _getIndex(): GraphIndex {
    if (this._index !== null) {
      return this._index;
    }

    const kindById = new Map<string, GraphNodeKind>();
    const promptTextById = new Map<string, string>();
    const resultByGenerator = new Map<string, string>();
    const sourceByTarget = new Map<string, string>();

    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];

      kindById.set(node.id, node.type);

      if (node.type === 'prompt') {
        promptTextById.set(node.id, node.data.text);
      }
    }

    for (let index = 0; index < this.edges.length; index += 1) {
      const edge = this.edges[index];

      sourceByTarget.set(edge.target, edge.source);

      if (kindById.get(edge.source) === 'generator') {
        resultByGenerator.set(edge.source, edge.target);
      }
    }

    this._index = { kindById, promptTextById, resultByGenerator, sourceByTarget };

    return this._index;
  }
}
