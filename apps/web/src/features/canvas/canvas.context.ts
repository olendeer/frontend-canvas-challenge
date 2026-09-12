'use client';

import { createContext, useContext } from 'react';

import { GenerationScenario } from 'domain/contracts';
import { GenerationsEntity } from 'domain/generation';
import { ChainIssue } from 'domain/graph';

/** Действия нод. Ссылки стабильны, поэтому изменение состояния их не пересоздаёт. */
export interface CanvasActions {
  onRemoveNode: (id: string) => void;
  onStartGeneration: (nodeId: string, scenario: GenerationScenario) => void;
  onTextChange: (id: string, text: string) => void;
}

/**
 * Состояние, которое нужно нодам. Сам граф сюда не попадает: он меняется на каждом кадре
 * перетаскивания, а нодам важна только структура. Поэтому здесь стабильная функция, которая
 * всегда читает свежий граф из хранилища, а ссылка на весь объект меняется только тогда,
 * когда меняется структура графа или состояние генераций.
 */
export interface CanvasStatus {
  chainIssueFor: (generatorId: string) => ChainIssue | null;
  generations: GenerationsEntity;
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
