import { describe, expect, it } from 'vitest';

import { GraphEdge, GraphNode } from 'domain/contracts';
import { ChainIssue, GraphEntity } from 'domain/graph';

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

const graph = (nodes: GraphNode[], edges: GraphEdge[] = []): GraphEntity =>
  new GraphEntity(nodes, edges, { x: 0, y: 0, zoom: 1 });

const chain = (): GraphEntity =>
  graph(
    [prompt('p1'), generator('g1'), result('r1')],
    [edge('e1', 'p1', 'g1'), edge('e2', 'g1', 'r1')],
  );

describe('GraphEntity.canConnect', () => {
  const free = graph([prompt('p1'), prompt('p2'), generator('g1'), result('r1')]);

  it('разрешает текст → генератор и генератор → результат', () => {
    expect(free.canConnect('p1', 'g1')).toBe(true);
    expect(free.canConnect('g1', 'r1')).toBe(true);
  });

  it('запрещает несовместимые типы, обратное направление и петлю', () => {
    expect(free.canConnect('p1', 'r1')).toBe(false);
    expect(free.canConnect('g1', 'p1')).toBe(false);
    expect(free.canConnect('r1', 'g1')).toBe(false);
    expect(free.canConnect('g1', 'g1')).toBe(false);
    expect(free.canConnect('p1', 'unknown')).toBe(false);
    expect(free.canConnect(null, 'g1')).toBe(false);
  });

  it('оставляет один вход у ноды и один результат у генератора', () => {
    const busy = graph(
      [prompt('p1'), prompt('p2'), generator('g1'), result('r1'), result('r2')],
      [edge('e1', 'p1', 'g1'), edge('e2', 'g1', 'r1')],
    );

    expect(busy.canConnect('p2', 'g1')).toBe(false);
    expect(busy.canConnect('g1', 'r2')).toBe(false);
  });

  it('разрешает одному тексту питать несколько генераторов', () => {
    const shared = graph(
      [prompt('p1'), generator('g1'), generator('g2')],
      [edge('e1', 'p1', 'g1')],
    );

    expect(shared.canConnect('p1', 'g2')).toBe(true);
  });
});

describe('GraphEntity.chainIssueFor', () => {
  it('находит нехватку результата, текста и заполненного описания', () => {
    expect(graph([generator('g1')]).chainIssueFor('g1')).toBe(ChainIssue.resultMissing);

    expect(
      graph([generator('g1'), result('r1')], [edge('e2', 'g1', 'r1')]).chainIssueFor('g1'),
    ).toBe(ChainIssue.promptMissing);

    expect(
      graph(
        [prompt('p1', '   '), generator('g1'), result('r1')],
        [edge('e1', 'p1', 'g1'), edge('e2', 'g1', 'r1')],
      ).chainIssueFor('g1'),
    ).toBe(ChainIssue.promptEmpty);
  });

  it('признаёт полную цепочку готовой', () => {
    expect(chain().chainIssueFor('g1')).toBeNull();
  });
});

describe('GraphEntity.toPayload', () => {
  it('оставляет только поля схемы и ограничивает координаты и зум', () => {
    const nodes = [
      { ...prompt('p1'), dragging: true, measured: { height: 10, width: 20 }, selected: true },
      { ...generator('g1'), position: { x: 20_000, y: -20_000 } },
    ] as GraphNode[];
    // Object.assign, а не литерал: так лишние поля React Flow не отсекаются проверкой.
    const edges: GraphEdge[] = [Object.assign(edge('e1', 'p1', 'g1'), { selected: true })];

    const payload = new GraphEntity(nodes, edges, { x: 0, y: 0, zoom: 9 }).toPayload();

    expect(Object.keys(payload.nodes[0]).sort()).toEqual(['data', 'id', 'position', 'type']);
    expect(Object.keys(payload.edges[0]).sort()).toEqual(['id', 'source', 'target']);
    expect(payload.nodes[1].position).toEqual({ x: 10_000, y: -10_000 });
    expect(payload.viewport.zoom).toBe(4);
  });

  it('переиспользует объекты data без копирования', () => {
    const node = prompt('p1');

    expect(graph([node]).toPayload().nodes[0].data).toBe(node.data);
  });
});

describe('GraphEntity: производные графы', () => {
  it('удаляет ноды вместе с их связями и сохраняет ссылку, когда удалять нечего', () => {
    const source = chain();

    expect(source.withoutNodes(new Set(['g1'])).edges).toEqual([]);
    expect(source.withoutNodes(new Set(['r1'])).edges).toEqual([source.edges[0]]);
    expect(source.withoutNodes(new Set(['unknown']))).toBe(source);
  });

  it('пересоздаёт только изменённую ноду при правке текста', () => {
    const source = chain();
    const next = source.withNodeData('p1', { text: 'Море' });

    expect(next.nodes[0]).not.toBe(source.nodes[0]);
    expect(next.nodes[0].data).toEqual({ text: 'Море' });
    expect(next.nodes[1]).toBe(source.nodes[1]);
    expect(next.nodes[2]).toBe(source.nodes[2]);
  });

  it('сохраняет структуру при перемещении и меняет её при правке данных', () => {
    const source = chain();
    const moved = source.withMovedNodes(
      source.nodes.map((node) => ({ ...node, position: { x: 10, y: 10 } })),
    );

    // Перетаскивание не пересобирает индекс: подписчики структуры не перерисовываются.
    expect(moved.structure).toBe(source.structure);
    expect(source.withNodeData('p1', { text: 'Море' }).structure).not.toBe(source.structure);
    expect(source.withViewport({ x: 5, y: 5, zoom: 2 }).structure).toBe(source.structure);
  });

  it('раскладывает новые ноды по колонкам типа и строкам внутри колонки', () => {
    const origin = { x: 100, y: 50 };
    const source = graph([prompt('p1'), generator('g1')]);

    expect(source.withNewNode('prompt', origin).nodes[2].position).toEqual({ x: 100, y: 310 });
    expect(source.withNewNode('generator', origin).nodes[2].position).toEqual({ x: 420, y: 310 });
    expect(source.withNewNode('result', origin).nodes[2].position).toEqual({ x: 740, y: 50 });
  });

  it('считает лимиты нод и связей', () => {
    const source = chain();

    expect(source.isNodeLimitReached(3)).toBe(true);
    expect(source.isNodeLimitReached(20)).toBe(false);
    expect(source.isEdgeLimitReached(2)).toBe(true);
  });
});
