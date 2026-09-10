import { describe, expect, it } from 'vitest';

import { Graph, GraphEdge, GraphNode } from 'domain/contracts';
import {
  buildGraphIndex,
  ChainIssue,
  dropEdgesTouching,
  getChainIssue,
  getIsValidConnection,
  getNextNodePosition,
  toGraphPayload,
  withNodeData,
} from 'domain/graph';

const position = { x: 0, y: 0 };

const prompt = (id: string, text = 'Горы'): GraphNode => ({
  data: { text },
  id,
  position,
  type: 'prompt',
});
const generator = (id: string): GraphNode => ({
  data: { label: 'Генератор' },
  id,
  position,
  type: 'generator',
});
const result = (id: string): GraphNode => ({
  data: { label: 'Результат' },
  id,
  position,
  type: 'result',
});
const edge = (id: string, source: string, target: string): GraphEdge => ({ id, source, target });

const chain = (): { edges: GraphEdge[]; nodes: GraphNode[] } => ({
  edges: [edge('e1', 'p1', 'g1'), edge('e2', 'g1', 'r1')],
  nodes: [prompt('p1'), generator('g1'), result('r1')],
});

describe('buildGraphIndex', () => {
  it('собирает типы, тексты и занятые порты', () => {
    const { edges, nodes } = chain();
    const index = buildGraphIndex(nodes, edges);

    expect(index.kindById.get('g1')).toBe('generator');
    expect(index.promptTextById.get('p1')).toBe('Горы');
    expect(index.promptTextById.has('g1')).toBe(false);
    expect(index.sourceByTarget.get('g1')).toBe('p1');
    expect(index.resultByGenerator.get('g1')).toBe('r1');
  });
});

describe('getIsValidConnection', () => {
  const empty = buildGraphIndex([prompt('p1'), prompt('p2'), generator('g1'), result('r1')], []);

  it('разрешает текст → генератор и генератор → результат', () => {
    expect(getIsValidConnection(empty, 'p1', 'g1')).toBe(true);
    expect(getIsValidConnection(empty, 'g1', 'r1')).toBe(true);
  });

  it('запрещает несовместимые типы, обратное направление и петлю', () => {
    expect(getIsValidConnection(empty, 'p1', 'r1')).toBe(false);
    expect(getIsValidConnection(empty, 'g1', 'p1')).toBe(false);
    expect(getIsValidConnection(empty, 'r1', 'g1')).toBe(false);
    expect(getIsValidConnection(empty, 'g1', 'g1')).toBe(false);
    expect(getIsValidConnection(empty, 'p1', 'unknown')).toBe(false);
    expect(getIsValidConnection(empty, null, 'g1')).toBe(false);
  });

  it('оставляет один вход у ноды и один результат у генератора', () => {
    const index = buildGraphIndex(
      [prompt('p1'), prompt('p2'), generator('g1'), result('r1'), result('r2')],
      [edge('e1', 'p1', 'g1'), edge('e2', 'g1', 'r1')],
    );

    expect(getIsValidConnection(index, 'p2', 'g1')).toBe(false);
    expect(getIsValidConnection(index, 'g1', 'r2')).toBe(false);
  });

  it('разрешает одному тексту питать несколько генераторов', () => {
    const index = buildGraphIndex(
      [prompt('p1'), generator('g1'), generator('g2')],
      [edge('e1', 'p1', 'g1')],
    );

    expect(getIsValidConnection(index, 'p1', 'g2')).toBe(true);
  });
});

describe('getChainIssue', () => {
  it('находит нехватку результата, текста и заполненного описания', () => {
    expect(getChainIssue(buildGraphIndex([generator('g1')], []), 'g1')).toBe(
      ChainIssue.resultMissing,
    );

    expect(
      getChainIssue(
        buildGraphIndex([generator('g1'), result('r1')], [edge('e2', 'g1', 'r1')]),
        'g1',
      ),
    ).toBe(ChainIssue.promptMissing);

    expect(
      getChainIssue(
        buildGraphIndex(
          [prompt('p1', '   '), generator('g1'), result('r1')],
          [edge('e1', 'p1', 'g1'), edge('e2', 'g1', 'r1')],
        ),
        'g1',
      ),
    ).toBe(ChainIssue.promptEmpty);
  });

  it('признаёт полную цепочку готовой', () => {
    const { edges, nodes } = chain();

    expect(getChainIssue(buildGraphIndex(nodes, edges), 'g1')).toBeNull();
  });
});

describe('toGraphPayload', () => {
  it('оставляет только поля схемы и ограничивает координаты и зум', () => {
    const nodes = [
      { ...prompt('p1'), dragging: true, measured: { height: 10, width: 20 }, selected: true },
      { ...generator('g1'), position: { x: 20_000, y: -20_000 } },
    ] as GraphNode[];
    // Object.assign, а не литерал: так лишние поля React Flow не отсекаются проверкой.
    const edges: GraphEdge[] = [Object.assign(edge('e1', 'p1', 'g1'), { selected: true })];

    const payload: Graph = toGraphPayload(nodes, edges, { x: 0, y: 0, zoom: 9 });

    expect(Object.keys(payload.nodes[0]).sort()).toEqual(['data', 'id', 'position', 'type']);
    expect(Object.keys(payload.edges[0]).sort()).toEqual(['id', 'source', 'target']);
    expect(payload.nodes[1].position).toEqual({ x: 10_000, y: -10_000 });
    expect(payload.viewport.zoom).toBe(4);
  });

  it('переиспользует объекты data без копирования', () => {
    const node = prompt('p1');
    const payload = toGraphPayload([node], [], { x: 0, y: 0, zoom: 1 });

    expect(payload.nodes[0].data).toBe(node.data);
  });
});

describe('dropEdgesTouching', () => {
  it('удаляет связи ноды и сохраняет ссылку, когда удалять нечего', () => {
    const { edges } = chain();

    expect(dropEdgesTouching(edges, new Set(['g1']))).toEqual([]);
    expect(dropEdgesTouching(edges, new Set(['r1']))).toEqual([edges[0]]);
    expect(dropEdgesTouching(edges, new Set(['unknown']))).toBe(edges);
  });
});

describe('withNodeData', () => {
  it('пересоздаёт только изменённую ноду', () => {
    const nodes = chain().nodes;
    const next = withNodeData(nodes, 'p1', { text: 'Море' });

    expect(next[0]).not.toBe(nodes[0]);
    expect(next[0].data).toEqual({ text: 'Море' });
    expect(next[1]).toBe(nodes[1]);
    expect(next[2]).toBe(nodes[2]);
  });
});

describe('getNextNodePosition', () => {
  it('раскладывает ноды по колонкам типа и строкам внутри колонки', () => {
    const origin = { x: 100, y: 50 };
    const nodes = [prompt('p1'), generator('g1')];

    expect(getNextNodePosition('prompt', nodes, origin)).toEqual({ x: 100, y: 310 });
    expect(getNextNodePosition('generator', nodes, origin)).toEqual({ x: 420, y: 310 });
    expect(getNextNodePosition('result', nodes, origin)).toEqual({ x: 740, y: 50 });
  });
});
