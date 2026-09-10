import { expect, test } from '@playwright/test';

import {
  addNode,
  buildChain,
  connect,
  createSpace,
  expectSaved,
  getGenerations,
  node,
  nodeIds,
} from './helpers';

const RESULT_TIMEOUT = 20_000;

test('генерация сразу после правки уходит с сохранённой версией графа', async ({ page }) => {
  const spaceId = await createSpace(page, 'Сохранение перед запуском');
  const [, generator, result] = await buildChain(page, 'Первый текст');

  await page.getByLabel('Описание изображения').fill('Свежий текст перед запуском');
  await node(page, generator).getByRole('button', { name: 'Сгенерировать' }).click();

  await expect(node(page, result).getByRole('img')).toBeVisible({ timeout: RESULT_TIMEOUT });

  const generations = await getGenerations(page, spaceId);

  expect(generations).toHaveLength(1);
  expect(generations[0].status).toBe('succeeded');
  expect(generations[0].prompt).toBe('Свежий текст перед запуском');
});

test('перезагрузка восстанавливает граф и результат, незавершённая генерация отслеживается', async ({
  page,
}) => {
  const spaceId = await createSpace(page, 'Перезагрузка');
  const [, generator, result] = await buildChain(page, 'Лес после дождя');

  await node(page, generator).getByRole('button', { name: 'Сгенерировать' }).click();
  await page.reload();

  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);
  await expect(node(page, result).getByRole('img')).toBeVisible({ timeout: RESULT_TIMEOUT });

  await page.reload();
  await expect(node(page, result).getByRole('img')).toBeVisible();
  expect(await getGenerations(page, spaceId)).toHaveLength(1);
});

test('тестовый отказ показывает ошибку и допускает новый запуск с новым ключом', async ({
  page,
}) => {
  const spaceId = await createSpace(page, 'Отказ генерации');
  const [, generator, result] = await buildChain(page, 'Город в дождь');

  await node(page, generator).getByLabel('Сценарий генерации').selectOption('failure');
  await node(page, generator).getByRole('button', { name: 'Сгенерировать' }).click();
  await expect(node(page, generator).getByText('Отказ', { exact: true })).toBeVisible({
    timeout: RESULT_TIMEOUT,
  });
  await expect(node(page, result).getByText(/Тестовый отказ/)).toBeVisible();

  // Повтор с тем же телом получает новый ключ: ключ освобождается после принятого запуска.
  await node(page, generator).getByRole('button', { name: 'Запустить снова' }).click();
  await expect
    .poll(async () => (await getGenerations(page, spaceId)).length, { timeout: RESULT_TIMEOUT })
    .toBe(2);

  await node(page, generator).getByLabel('Сценарий генерации').selectOption('success');
  await node(page, generator).getByRole('button', { name: 'Запустить снова' }).click();
  await expect(node(page, result).getByRole('img')).toBeVisible({ timeout: RESULT_TIMEOUT });
  await expect
    .poll(async () => (await getGenerations(page, spaceId)).length, { timeout: RESULT_TIMEOUT })
    .toBe(3);
});

test('двойное нажатие не создаёт вторую генерацию', async ({ page }) => {
  const spaceId = await createSpace(page, 'Двойное нажатие');
  const [, generator, result] = await buildChain(page, 'Мост через реку');

  await node(page, generator).getByRole('button', { name: 'Сгенерировать' }).dblclick();
  await expect(node(page, result).getByRole('img')).toBeVisible({ timeout: RESULT_TIMEOUT });

  expect(await getGenerations(page, spaceId)).toHaveLength(1);
});

test('повтор после потерянного ответа использует прежний ключ идемпотентности', async ({
  page,
}) => {
  const spaceId = await createSpace(page, 'Потерянный ответ');
  const [, generator, result] = await buildChain(page, 'Маяк на скале');

  let isDropped = false;

  await page.route('**/generations', async (route) => {
    if (route.request().method() !== 'POST' || isDropped) {
      return route.fallback();
    }

    isDropped = true;

    // Запрос доходит до сервера, а ответ теряется: генерация создана, клиент об этом не знает.
    await route.fetch();
    await route.abort('failed');
  });

  await node(page, generator).getByRole('button', { name: 'Сгенерировать' }).click();
  await expect(node(page, generator).getByText(/Не удалось связаться с сервером/)).toBeVisible();

  await node(page, generator)
    .getByRole('button', { name: /Сгенерировать|Запустить снова/ })
    .click();
  await expect(node(page, result).getByRole('img')).toBeVisible({ timeout: RESULT_TIMEOUT });

  expect(await getGenerations(page, spaceId)).toHaveLength(1);
});

test('опрос останавливается после завершения генерации', async ({ page }) => {
  await createSpace(page, 'Остановка опроса');

  const [, generator, result] = await buildChain(page, 'Поле под снегом');

  await node(page, generator).getByRole('button', { name: 'Сгенерировать' }).click();
  await expect(node(page, result).getByRole('img')).toBeVisible({ timeout: RESULT_TIMEOUT });

  let polls = 0;

  page.on('request', (request) => {
    if (request.method() === 'GET' && request.url().endsWith('/generations')) {
      polls += 1;
    }
  });

  await page.waitForTimeout(2500);

  expect(polls).toBe(0);
});

test('результат не подставляется в другую ноду после перецепления генератора', async ({ page }) => {
  await createSpace(page, 'Перецепление');

  const [, generator, result] = await buildChain(page, 'Озеро в горах');

  await node(page, generator).getByRole('button', { name: 'Сгенерировать' }).click();
  await expect(node(page, result).getByRole('img')).toBeVisible({ timeout: RESULT_TIMEOUT });

  await node(page, result)
    .getByRole('button', { name: /Удалить/ })
    .click();
  await addNode(page, 'Добавить результат');

  const fresh = (await nodeIds(page, 'result')).find((id) => id !== result) as string;

  await connect(page, generator, fresh);
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);
  await expectSaved(page);

  await expect(node(page, fresh).getByRole('img')).toHaveCount(0);
  await expect(node(page, fresh).getByText('Не запускалась')).toBeVisible();
});
