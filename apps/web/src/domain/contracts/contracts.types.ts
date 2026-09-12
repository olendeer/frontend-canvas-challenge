import type { Static } from '@sinclair/typebox';
import type { Config } from '@canvas/contracts';
import type {
  GenerationData,
  GenerationRequest,
  GraphData,
  NodeData,
  SpaceData,
} from '@canvas/contracts';

/**
 * Типы предметной области берутся из пакета схем API: второй набор тех же интерфейсов
 * пришлось бы править дважды при каждом изменении контракта.
 */
export type AppConfig = Static<typeof Config>;
export type Generation = GenerationData;
export type GenerationScenario = GenerationRequest['scenario'];
export type GenerationStatus = Generation['status'];
export type Graph = GraphData;
export type GraphEdge = Graph['edges'][number];
export type GraphNode = NodeData;
export type GraphNodeKind = GraphNode['type'];
export type GraphNodeData<TKind extends GraphNodeKind> = Extract<
  GraphNode,
  { type: TKind }
>['data'];
export type Space = SpaceData;
export type Viewport = Graph['viewport'];
