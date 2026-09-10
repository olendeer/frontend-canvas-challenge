'use client';

import { createContext, useContext } from 'react';

import { GenerationScenario } from 'domain/contracts';
import { GenerationIndex } from 'domain/generation';
import { GraphIndex } from 'domain/graph';

/** Действия нод. Ссылки стабильны, поэтому изменение состояния их не пересоздаёт. */
export interface CanvasActions {
  onRemoveNode: (id: string) => void;
  onStartGeneration: (nodeId: string, scenario: GenerationScenario) => void;
  onTextChange: (id: string, text: string) => void;
}

/**
 * Состояние, которое нужно нодам: индекс графа и индекс генераций. Отделено от действий,
 * чтобы перетаскивание нод (оно не меняет ни то, ни другое) не перерисовывало ноды.
 */
export interface CanvasStatus {
  generations: GenerationIndex;
  index: GraphIndex;
  /** Ошибка последнего запуска и нода, к которой она относится. */
  startError: unknown;
  startErrorNodeId: string | null;
  /** Нода, для которой запуск отправляется прямо сейчас. */
  startingNodeId: string | null;
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null);
export const CanvasStatusContext = createContext<CanvasStatus | null>(null);

const NO_PROVIDER = 'Компонент ноды использован вне канваса: обёртка CanvasModule не найдена.';

export const useCanvasActions = (): CanvasActions => {
  const actions = useContext(CanvasActionsContext);

  if (!actions) {
    throw new Error(NO_PROVIDER);
  }

  return actions;
};

export const useCanvasStatus = (): CanvasStatus => {
  const status = useContext(CanvasStatusContext);

  if (!status) {
    throw new Error(NO_PROVIDER);
  }

  return status;
};
