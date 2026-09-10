/**
 * Корни ключей не пересекаются: сброс списка пространств не задевает граф и генерации
 * открытого пространства.
 */
export const queryKeys = {
  config: () => ['config'] as const,
  generations: (spaceId: string) => ['space', spaceId, 'generations'] as const,
  graph: (spaceId: string) => ['space', spaceId, 'graph'] as const,
  space: (spaceId: string) => ['space', spaceId, 'self'] as const,
  spaces: () => ['spaces'] as const,
};
