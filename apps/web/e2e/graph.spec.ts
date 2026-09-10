import { expect, test } from '@playwright/test';

import {
  addNode,
  API_URL,
  buildChain,
  connect,
  createSpace,
  expectSaved,
  getGenerations,
  getGraph,
  node,
  nodeIds,
  saveStatus,
} from './helpers';

const SLOW_RESPONSE_MS = 1200;

test('пространство создаётся, ноды добавляются и правки видны сразу', async ({ page }) => {
  const spaceId = await createSpace(page, 'Основной сценарий');

  await addNode(page, 'Добавить текст');
  await addNode(page, 'Добавить генератор');
  await addNode(page, 'Добавить результат');

  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page.getByLabel('Описание изображения').fill('Горы на рассвете');
  await expect(page.getByLabel('Описание изображения')).toHaveValue('Горы на рассвете');
  await expectSaved(page);

  const { graph } = await getGraph(page, spaceId);
  const kinds = graph.nodes.map((item) => item.type).sort();

  expect(kinds).toEqual(['generator', 'prompt', 'result']);
  expect(new Set(graph.nodes.map((item) => item.id)).size).toBe(3);
});

test('связи создаются перетаскиванием, несовместимые запрещены, удаление ноды убирает связи', async ({
  page,
}) => {
  const spaceId = await createSpace(page, 'Правила связей');
  const [prompt, generator, result] = await buildChain(page, 'Река в тумане');

  await connect(page, prompt, result);
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);

  await addNode(page, 'Добавить текст');

  const second = (await nodeIds(page, 'prompt')).find((id) => id !== prompt) as string;

  await connect(page, second, generator);
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);

  await node(page, generator)
    .getByRole('button', { name: /Удалить/ })
    .click();
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  await expectSaved(page);

  const { graph } = await getGraph(page, spaceId);

  expect(graph.edges).toHaveLength(0);
  expect(graph.nodes).toHaveLength(3);
});

test('серия быстрых правок даёт одно сохранение, одиночная правка тоже сохраняется', async ({
  page,
}) => {
  await createSpace(page, 'Debounce');
  await addNode(page, 'Добавить текст');
  await expectSaved(page);

  let puts = 0;

  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().includes('/graph')) {
      puts += 1;
    }
  });

  await page.getByLabel('Описание изображения').pressSequentially('горы на рассвете', {
    delay: 25,
  });
  await expectSaved(page);

  expect(puts).toBe(1);
});

test('медленные сохранения одного графа не накладываются и не теряют правки', async ({ page }) => {
  const spaceId = await createSpace(page, 'Очередь записи');

  await addNode(page, 'Добавить текст');
  await expectSaved(page);

  let active = 0;
  let isOverlapped = false;
  let puts = 0;

  await page.route('**/graph', async (route) => {
    if (route.request().method() !== 'PUT') {
      return route.fallback();
    }

    puts += 1;
    active += 1;
    isOverlapped = isOverlapped || active > 1;

    // Медленный ответ сервера: правки продолжают приходить, пока запрос в полёте.
    await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS));

    const response = await route.fetch();

    active -= 1;

    await route.fulfill({ response });
  });

  const field = page.getByLabel('Описание изображения');

  await field.fill('первая правка');
  await expect(saveStatus(page)).toHaveText('Сохраняем…');
  await field.fill('вторая правка');
  await expectSaved(page);

  expect(isOverlapped).toBe(false);
  expect(puts).toBeGreaterThanOrEqual(2);

  const { graph } = await getGraph(page, spaceId);

  expect(graph.nodes[0].data.text).toBe('вторая правка');
});

test('конфликт версий сохраняет черновик, не запускает генерацию и даёт перечитать граф', async ({
  page,
}) => {
  const spaceId = await createSpace(page, 'Конфликт версий');
  const [, generator] = await buildChain(page, 'Текст до конфликта');
  const before = await getGraph(page, spaceId);

  await page.request.put(`${API_URL}/api/spaces/${spaceId}/graph`, {
    data: { ...before.graph, viewport: { x: 24, y: 24, zoom: 1 } },
    headers: { 'Content-Type': 'application/json', 'If-Match': before.etag },
  });

  await page.getByLabel('Описание изображения').fill('Текст после конфликта');
  await expect(saveStatus(page)).toHaveText('Конфликт версий');
  await expect(page.getByText('Граф на сервере изменился', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Описание изображения')).toHaveValue('Текст после конфликта');

  await node(page, generator).getByRole('button', { name: 'Сгенерировать' }).click();
  await expect(node(page, generator).getByText(/Граф на сервере изменился/)).toBeVisible();
  expect(await getGenerations(page, spaceId)).toHaveLength(0);

  await page.getByRole('button', { name: 'Перечитать граф' }).click();
  await expectSaved(page);
  await expect(page.getByLabel('Описание изображения')).toHaveValue('Текст до конфликта');
});

test('интерфейс работает с клавиатуры и не прокручивается по горизонтали при 1280', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Название пространства').focus();
  await page.keyboard.type('С клавиатуры');
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Добавить текст' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expectSaved(page);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
});

test('положение канваса сохраняется и восстанавливается после перезагрузки', async ({ page }) => {
  const spaceId = await createSpace(page, 'Положение канваса');

  await addNode(page, 'Добавить текст');
  await expectSaved(page);

  const pane = await page.locator('.react-flow__pane').boundingBox();

  if (!pane) {
    throw new Error('Канвас не найден.');
  }

  const saved = page.waitForResponse(
    (response) => response.request().method() === 'PUT' && response.url().includes('/graph'),
  );

  await page.mouse.move(pane.x + pane.width / 2, pane.y + pane.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(pane.x + pane.width / 2 - 200, pane.y + pane.height * 0.8 - 140, {
    steps: 10,
  });
  await page.mouse.up();
  await saved;
  await expectSaved(page);

  const { graph } = await getGraph(page, spaceId);

  expect(graph.viewport.x).toBeLessThan(0);
  expect(graph.viewport.y).toBeLessThan(0);

  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);

  const style = await page.locator('.react-flow__viewport').getAttribute('style');
  const restored = Number(/translate\((-?[\d.]+)px/.exec(style ?? '')?.[1]);

  expect(Math.abs(restored - graph.viewport.x)).toBeLessThan(1);
});

test('удаление ноды клавишей Delete убирает её связи', async ({ page }) => {
  const spaceId = await createSpace(page, 'Клавиша Delete');
  const [, generator] = await buildChain(page, 'Текст под удаление');

  await node(page, generator).getByText('Генератор', { exact: true }).click();
  await page.keyboard.press('Delete');

  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  await expectSaved(page);

  const { graph } = await getGraph(page, spaceId);

  expect(graph.edges).toHaveLength(0);
  expect(graph.nodes).toHaveLength(2);
});
