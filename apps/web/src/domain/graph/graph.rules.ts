import { Graph, GraphEdge, GraphNode, GraphNodeKind, Viewport } from 'domain/contracts';

/**
 * Индекс графа: одна сборка на изменение структуры вместо линейного поиска на каждое
 * обращение. Читается при проверке связи (много раз за одно перетаскивание) и при выяснении
 * готовности цепочки для каждого генератора.
 */
export interface GraphIndex {
  /** Тип каждой ноды: этого достаточно, чтобы проверить совместимость связи. */
  kindById: Map<string, GraphNodeKind>;
  /** Текст каждой текстовой ноды: нужен для проверки готовности цепочки. */
  promptTextById: Map<string, string>;
  /** Нода результата, которую уже занял генератор: у генератора один выход. */
  resultByGenerator: Map<string, string>;
  /** Источник занятого входа: у каждого входа не больше одной связи. */
  sourceByTarget: Map<string, string>;
}

export enum ChainIssue {
  promptEmpty = 'promptEmpty',
  promptMissing = 'promptMissing',
  resultMissing = 'resultMissing',
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

export const CHAIN_ISSUE_MESSAGE: Record<ChainIssue, string> = {
  [ChainIssue.promptEmpty]: 'Заполните описание изображения в текстовой ноде.',
  [ChainIssue.promptMissing]: 'Соедините текстовую ноду со входом генератора.',
  [ChainIssue.resultMissing]: 'Соедините выход генератора с нодой результата.',
};

export const EMPTY_GRAPH: Graph = { edges: [], nodes: [], viewport: { x: 0, y: 0, zoom: 1 } };

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

export const buildGraphIndex = (
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): GraphIndex => {
  const kindById = new Map<string, GraphNodeKind>();
  const promptTextById = new Map<string, string>();
  const resultByGenerator = new Map<string, string>();
  const sourceByTarget = new Map<string, string>();

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];

    kindById.set(node.id, node.type);

    if (node.type === 'prompt') {
      promptTextById.set(node.id, node.data.text);
    }
  }

  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];

    sourceByTarget.set(edge.target, edge.source);

    if (kindById.get(edge.source) === 'generator') {
      resultByGenerator.set(edge.source, edge.target);
    }
  }

  return { kindById, promptTextById, resultByGenerator, sourceByTarget };
};

/**
 * Разрешены только «текст → генератор» и «генератор → результат». У входа одна связь,
 * у генератора один результат, текст может питать несколько генераторов. Те же правила
 * проверяет сервер — здесь они нужны, чтобы не создавать связь, которую он отвергнет.
 */
export const getIsValidConnection = (
  index: GraphIndex,
  source: string | null | undefined,
  target: string | null | undefined,
): boolean => {
  if (!source || !target || source === target) {
    return false;
  }

  const from = index.kindById.get(source);
  const to = index.kindById.get(target);

  if (from === undefined || to === undefined || index.sourceByTarget.has(target)) {
    return false;
  }

  if (from === 'prompt') {
    return to === 'generator';
  }

  return from === 'generator' && to === 'result' && !index.resultByGenerator.has(source);
};

/** Чего не хватает генератору для запуска. Повторяет проверку INCOMPLETE_CHAIN на сервере. */
export const getChainIssue = (index: GraphIndex, generatorId: string): ChainIssue | null => {
  if (!index.resultByGenerator.has(generatorId)) {
    return ChainIssue.resultMissing;
  }

  const promptId = index.sourceByTarget.get(generatorId);
  const text = promptId === undefined ? undefined : index.promptTextById.get(promptId);

  if (text === undefined) {
    return ChainIssue.promptMissing;
  }

  return text.trim() ? null : ChainIssue.promptEmpty;
};

export const createGraphNode = (kind: GraphNodeKind, position: GraphNode['position']) =>
  // Единственное приведение типа: TypeScript не связывает kind с формой data при сборке
  // элемента размеченного объединения.
  ({
    data: { ...DEFAULT_NODE_DATA[kind] },
    id: crypto.randomUUID(),
    position: { x: position.x, y: position.y },
    type: kind,
  }) as GraphNode;

/**
 * Тело PUT: только поля схемы графа. Служебные поля React Flow (selected, dragging, measured,
 * width, height) сервер не принимает. Один проход map по плотному массиву даёт такой же
 * плотный массив; предварительное new Array(n) сделало бы его holey, а reduce с push —
 * тем же проходом, но менее читаемым. Объекты data и position переиспользуются по ссылке:
 * они никогда не меняются на месте, копия не нужна.
 */
export const toGraphPayload = (
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  viewport: Viewport,
): Graph => ({
  edges: edges.map(({ id, source, target }) => ({ id, source, target })),
  nodes: nodes.map(
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
    x: clamp(viewport.x, -POSITION_LIMIT, POSITION_LIMIT),
    y: clamp(viewport.y, -POSITION_LIMIT, POSITION_LIMIT),
    zoom: clamp(viewport.zoom, ZOOM_MIN, ZOOM_MAX),
  },
});

/**
 * Связи удалённых нод. Один проход; массив выделяется только если что-то действительно
 * удаляется, иначе возвращается прежняя ссылка и React не перерисовывает связи.
 */
export const dropEdgesTouching = <TEdge extends GraphEdge>(
  edges: TEdge[],
  removed: ReadonlySet<string>,
): TEdge[] => {
  let kept: TEdge[] | null = null;

  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];

    if (removed.has(edge.source) || removed.has(edge.target)) {
      kept ??= edges.slice(0, index);

      continue;
    }

    kept?.push(edge);
  }

  return kept ?? edges;
};

/** Новое значение data только у одной ноды: остальные сохраняют ссылку. */
export const withNodeData = <TNode extends { data: unknown; id: string }>(
  nodes: readonly TNode[],
  id: string,
  data: TNode['data'],
): TNode[] => nodes.map((node) => (node.id === id ? { ...node, data } : node));

/** Лимиты схемы: не больше maxNodes нод и maxEdges связей. */
export const getIsLimitReached = (count: number, max: number): boolean => count >= max;

/** Колонки под поток «текст → генератор → результат»: новые ноды сразу стоят по цепочке. */
const COLUMN_BY_KIND: Record<GraphNodeKind, number> = { generator: 1, prompt: 0, result: 2 };
const COLUMN_WIDTH = 320;
const ROW_HEIGHT = 260;

/**
 * Место для новой ноды: своя колонка по типу и следующая строка среди нод того же типа.
 * Один проход по нодам без промежуточных массивов; вызывается только по нажатию кнопки.
 */
export const getNextNodePosition = (
  kind: GraphNodeKind,
  nodes: readonly GraphNode[],
  origin: GraphNode['position'],
): GraphNode['position'] => {
  let row = 0;

  for (let index = 0; index < nodes.length; index += 1) {
    if (nodes[index].type === kind) {
      row += 1;
    }
  }

  return { x: origin.x + COLUMN_BY_KIND[kind] * COLUMN_WIDTH, y: origin.y + row * ROW_HEIGHT };
};
