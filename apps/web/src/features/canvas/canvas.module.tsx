'use client';

import {
  Background,
  Connection,
  Controls,
  Edge,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import { useCallback, useRef } from 'react';

import { GraphNodeKind } from 'domain/contracts';
import { ErrorAlert } from 'features/error-alert';
import { useSpaceQuery } from 'query';
import { Alert, Button, LinkButton, LoadingCard } from 'ui-kit';

import { CanvasActionsContext, CanvasStatusContext } from './canvas.context';
import { useCanvas } from './canvas.hooks';
import { nodeTypes } from './canvas.node-types';
import { CanvasToolbar } from './canvas-toolbar';
import { SaveStatus } from './save-status';
import '@xyflow/react/dist/style.css';
import styles from './canvas.module.scss';

interface CanvasModuleProps {
  spaceId: string;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const DELETE_KEYS = ['Delete', 'Backspace'];
const PANE_MARGIN = 32;

const CanvasBoard = ({ spaceId }: CanvasModuleProps) => {
  const space = useSpaceQuery(spaceId);
  const {
    actions,
    config,
    generationsQuery,
    graph,
    graphQuery,
    isReady,
    reloadGraph,
    retrySave,
    status,
    store,
    writeState,
  } = useCanvas(spaceId);
  const { screenToFlowPosition } = useReactFlow();
  const paneRef = useRef<HTMLDivElement>(null);

  const onAddNode = useCallback(
    (kind: GraphNodeKind) => {
      const rect = paneRef.current?.getBoundingClientRect();

      store.addNode(
        kind,
        rect
          ? screenToFlowPosition({ x: rect.left + PANE_MARGIN, y: rect.top + PANE_MARGIN })
          : { x: 0, y: 0 },
      );
    },
    [screenToFlowPosition, store],
  );

  // Читает граф из хранилища, поэтому ссылка стабильна: React Flow зовёт эту проверку
  // на каждом кадре перетаскивания связи.
  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      store.getSnapshot().canConnect(connection.source, connection.target),
    [store],
  );

  if (space.isError || graphQuery.isError) {
    return (
      <ErrorAlert
        error={space.error ?? graphQuery.error}
        onAction={() => (space.isError ? space.refetch() : graphQuery.refetch())}
        title="Пространство не открылось"
      />
    );
  }

  if (!space.data || !isReady) {
    return <LoadingCard label="Загружаем пространство" />;
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.caption}>Рабочее пространство</p>
          <h1 className={styles.heading}>{space.data.title}</h1>
        </div>
        <div className={styles.aside}>
          <SaveStatus state={writeState} />
          <LinkButton href="/" size="sm" variant="secondary">
            Все пространства
          </LinkButton>
        </div>
      </header>

      {writeState.isBlocked ? (
        <ErrorAlert
          actionLabel="Перечитать граф"
          error={writeState.error}
          onAction={() => reloadGraph()}
          title="Граф на сервере изменился"
        >
          Правки остались на канвасе: перечитывание заменит их серверной версией.
        </ErrorAlert>
      ) : null}

      {!writeState.isBlocked && writeState.error !== null ? (
        <ErrorAlert
          actionLabel="Повторить сохранение"
          error={writeState.error}
          onAction={retrySave}
          title="Правки не сохранены"
        />
      ) : null}

      {generationsQuery.isError ? (
        <ErrorAlert
          error={generationsQuery.error}
          onAction={() => generationsQuery.refetch()}
          title="Не удалось прочитать генерации"
        />
      ) : null}

      {graph.nodes.length === 0 ? (
        <Alert title="Канвас пуст" tone="info">
          Добавьте текстовую ноду, генератор и результат, затем соедините их порты.
        </Alert>
      ) : null}

      <CanvasToolbar config={config} graph={graph} onAddNode={onAddNode} />

      <div className={styles.pane} data-testid="canvas" ref={paneRef}>
        <CanvasActionsContext.Provider value={actions}>
          <CanvasStatusContext.Provider value={status}>
            <ReactFlow
              defaultViewport={graph.viewport}
              deleteKeyCode={DELETE_KEYS}
              edges={graph.edges}
              isValidConnection={isValidConnection}
              maxZoom={MAX_ZOOM}
              minZoom={MIN_ZOOM}
              nodeTypes={nodeTypes}
              nodes={graph.nodes}
              onConnect={store.connect}
              onEdgesChange={store.applyEdgeChanges}
              onMoveEnd={(_event, viewport) => store.setViewport(viewport)}
              onNodesChange={store.applyNodeChanges}
            >
              <Background />
              <Controls />
            </ReactFlow>
          </CanvasStatusContext.Provider>
        </CanvasActionsContext.Provider>
      </div>

      <p className={styles.hint}>
        Соедините порты перетаскиванием: текст → генератор → результат. Ноду можно удалить кнопкой в
        её заголовке или клавишей Delete. Правки сохраняются автоматически через {config.debounceMs}{' '}
        мс после последнего изменения.
      </p>
    </section>
  );
};

export const CanvasModule = ({ spaceId }: CanvasModuleProps) => (
  <ReactFlowProvider>
    <CanvasBoard spaceId={spaceId} />
  </ReactFlowProvider>
);
