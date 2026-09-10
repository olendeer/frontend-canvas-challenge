import { expect, Locator, Page } from '@playwright/test';

export const API_URL = 'http://localhost:4001';

interface GraphNodeJson {
  data: { label?: string; text?: string };
  id: string;
  position: { x: number; y: number };
  type: string;
}

interface GraphJson {
  edges: { id: string; source: string; target: string }[];
  nodes: GraphNodeJson[];
  viewport: { x: number; y: number; zoom: number };
}

interface GenerationJson {
  id: string;
  nodeId: string;
  prompt: string;
  resultNodeId: string;
  status: string;
}

export const node = (page: Page, id: string): Locator =>
  page.locator(`.react-flow__node[data-id="${id}"]`);

export const saveStatus = (page: Page): Locator => page.getByTestId('save-status');

export const expectSaved = async (page: Page): Promise<void> => {
  await expect(saveStatus(page)).toHaveText('Сохранено', { timeout: 15_000 });
};

/** Создаёт пространство через интерфейс и возвращает его идентификатор из адреса. */
export const createSpace = async (page: Page, title: string): Promise<string> => {
  await page.goto('/');
  await page.getByLabel('Название пространства').fill(title);
  await page.getByRole('button', { name: 'Создать и открыть' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByTestId('canvas')).toBeVisible();

  const spaceId = new URL(page.url()).pathname.split('/').pop();

  if (!spaceId) {
    throw new Error('Адрес пространства не содержит идентификатор.');
  }

  return spaceId;
};

export const addNode = async (page: Page, label: string): Promise<void> => {
  await page.getByRole('button', { name: label }).click();
};

export const nodeIds = async (page: Page, kind: string): Promise<string[]> => {
  const ids = await page
    .locator(`.react-flow__node-${kind}`)
    .evaluateAll((items) => items.map((item) => item.getAttribute('data-id') ?? ''));

  return ids.filter(Boolean);
};

const handle = (page: Page, id: string, side: 'right' | 'left'): Locator =>
  page.locator(`.react-flow__node[data-id="${id}"] .react-flow__handle-${side}`);

/** Перетаскивает связь от выхода одной ноды ко входу другой. */
export const connect = async (page: Page, sourceId: string, targetId: string): Promise<void> => {
  const source = await handle(page, sourceId, 'right').boundingBox();
  const target = await handle(page, targetId, 'left').boundingBox();

  if (!source || !target) {
    throw new Error('Порты нод не найдены на канвасе.');
  }

  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
  await page.mouse.up();
};

/** Полная цепочка «текст → генератор → результат» с заполненным описанием. */
export const buildChain = async (page: Page, text: string): Promise<string[]> => {
  await addNode(page, 'Добавить текст');
  await addNode(page, 'Добавить генератор');
  await addNode(page, 'Добавить результат');

  const [prompt] = await nodeIds(page, 'prompt');
  const [generator] = await nodeIds(page, 'generator');
  const [result] = await nodeIds(page, 'result');

  await page.getByLabel('Описание изображения').fill(text);
  await connect(page, prompt, generator);
  await connect(page, generator, result);
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);
  await expectSaved(page);

  return [prompt, generator, result];
};

export const getGraph = async (
  page: Page,
  spaceId: string,
): Promise<{ etag: string; graph: GraphJson }> => {
  const response = await page.request.get(`${API_URL}/api/spaces/${spaceId}/graph`);

  return { etag: response.headers().etag, graph: (await response.json()) as GraphJson };
};

export const getGenerations = async (page: Page, spaceId: string): Promise<GenerationJson[]> => {
  const response = await page.request.get(`${API_URL}/api/spaces/${spaceId}/generations`);

  return (await response.json()) as GenerationJson[];
};
