'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { resolveConfig } from 'domain/config';
import { GenerationScenario } from 'domain/contracts';
import { buildGenerationIndex, EMPTY_GENERATION_INDEX } from 'domain/generation';
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
  const config = resolveConfig(configQuery.data);
  const configRef = useRef(config);

  const [controller] = useState(() =>
    createCanvasController({
      getDelayMs: () => configRef.current.debounceMs,
      save: async (graph) => {
        await graphService.save(spaceId, graph);
      },
    }),
  );

  const graphQuery = useGraphQuery(spaceId);
  const { refetch: refetchGraph } = graphQuery;
  const snapshot = useStore(controller.store);
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
  const generations = useMemo(
    () =>
      generationsQuery.data ? buildGenerationIndex(generationsQuery.data) : EMPTY_GENERATION_INDEX,
    [generationsQuery.data],
  );

  useEffect(() => {
    configRef.current = config;
    controller.store.setConfig(config);
  }, [config, controller.store]);

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
    controller.store.replace(graphQuery.data.graph);
    setIsReady(true);
  }, [controller.store, graphQuery.data]);

  useEffect(() => controller.dispose, [controller]);

  const onStartGeneration = useCallback(
    (nodeId: string, scenario: GenerationScenario) => start({ nodeId, scenario }),
    [start],
  );

  const onRemoveNode = useCallback(
    (id: string) => controller.store.removeNodes([id]),
    [controller.store],
  );

  const actions = useMemo<CanvasActions>(
    () => ({ onRemoveNode, onStartGeneration, onTextChange: controller.store.setPromptText }),
    [controller.store.setPromptText, onRemoveNode, onStartGeneration],
  );

  const status = useMemo<CanvasStatus>(
    () => ({
      generations,
      index: snapshot.index,
      startError,
      startErrorNodeId: startError ? startedNodeId : null,
      startingNodeId: isStarting ? startedNodeId : null,
    }),
    [generations, isStarting, snapshot.index, startedNodeId, startError],
  );

  /** Явное перечитывание серверного графа после конфликта версий. */
  const reloadGraph = useCallback(async () => {
    const result = await refetchGraph();

    if (result.data) {
      controller.store.replace(result.data.graph);
    }

    controller.queue.reset();
  }, [controller, refetchGraph]);

  /** Повтор сохранения после сетевой ошибки: то же тело, тот же If-Match. */
  const retrySave = useCallback(() => {
    controller.queue.flushInBackground();
  }, [controller.queue]);

  return {
    actions,
    config,
    generationsQuery,
    graphQuery,
    isReady,
    reloadGraph,
    retrySave,
    snapshot,
    status,
    store: controller.store,
    writeState,
  };
};
