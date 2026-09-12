'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfigEntity } from 'domain/config';
import { GenerationScenario } from 'domain/contracts';
import { GenerationsEntity } from 'domain/generation';
import { useStore } from 'hooks';
import { useGraphService } from 'providers/services.hooks';
import {
  useConfigQuery,
  useGenerationsQuery,
  useGraphQuery,
  useStartGenerationMutation,
} from 'query';

import { CanvasActions, CanvasStatus } from './canvas.context';
import { createCanvasController } from './canvas.controller';

export const useCanvas = (spaceId: string) => {
  const graphService = useGraphService();
  const configQuery = useConfigQuery();
  const config = ConfigEntity.resolve(configQuery.data);
  const configRef = useRef(config);

  const [controller] = useState(() =>
    createCanvasController({
      getDelayMs: () => configRef.current.debounceMs,
      save: async (graph) => {
        await graphService.save(spaceId, graph);
      },
    }),
  );

  const { store } = controller;
  const graphQuery = useGraphQuery(spaceId);
  const { refetch: refetchGraph } = graphQuery;
  const graph = useStore(store);
  const writeState = useStore(controller.queue);

  const startGeneration = useStartGenerationMutation(spaceId, controller.queue.flush);
  const {
    data: started,
    error: startError,
    isPending: isStarting,
    mutate: start,
  } = startGeneration;
  const startedNodeId = startGeneration.variables?.nodeId ?? null;

  const generationsQuery = useGenerationsQuery(spaceId, config, started?.retryAfterMs ?? null);
  const generations = generationsQuery.data ?? GenerationsEntity.empty();

  useEffect(() => {
    configRef.current = config;
    store.setConfig(config);
  }, [config, store]);

  // Серверный граф попадает в черновик один раз при открытии пространства; дальше правит
  // только пользователь, а перечитывание идёт по явной кнопке в reloadGraph. Канвас
  // монтируется только после этого: React Flow читает начальный viewport один раз.
  const isSeededRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isSeededRef.current || !graphQuery.data) {
      return;
    }

    isSeededRef.current = true;
    store.replace(graphQuery.data.graph);
    setIsReady(true);
  }, [graphQuery.data, store]);

  useEffect(() => controller.dispose, [controller]);

  const onStartGeneration = useCallback(
    (nodeId: string, scenario: GenerationScenario) => start({ nodeId, scenario }),
    [start],
  );

  const onRemoveNode = useCallback((id: string) => store.removeNodes([id]), [store]);

  const actions = useMemo<CanvasActions>(
    () => ({ onRemoveNode, onStartGeneration, onTextChange: store.setPromptText }),
    [onRemoveNode, onStartGeneration, store.setPromptText],
  );

  const status = useMemo<CanvasStatus>(
    () => ({
      chainIssueFor: (generatorId: string) => store.getSnapshot().chainIssueFor(generatorId),
      generations,
      startError,
      startErrorNodeId: startError ? startedNodeId : null,
      startingNodeId: isStarting ? startedNodeId : null,
    }),
    // graph.structure меняется только вместе со структурой и данными нод, поэтому
    // перетаскивание не пересоздаёт контекст и не перерисовывает ноды.
    [generations, graph.structure, isStarting, startedNodeId, startError, store],
  );

  /** Явное перечитывание серверного графа после конфликта версий. */
  const reloadGraph = useCallback(async () => {
    const result = await refetchGraph();

    if (result.data) {
      store.replace(result.data.graph);
    }

    controller.queue.reset();
  }, [controller.queue, refetchGraph, store]);

  /** Повтор сохранения после сетевой ошибки: то же тело, тот же If-Match. */
  const retrySave = useCallback(() => {
    controller.queue.flushInBackground();
  }, [controller.queue]);

  return {
    actions,
    config,
    generations,
    generationsQuery,
    graph,
    graphQuery,
    isReady,
    reloadGraph,
    retrySave,
    status,
    store,
    writeState,
  };
};
