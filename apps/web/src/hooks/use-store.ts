'use client';

import { useSyncExternalStore } from 'react';

import { ObservableStore } from 'core/store';

/** Единственный мост между внешними хранилищами (граф, очередь записи) и React. */
export const useStore = <TSnapshot>(store: ObservableStore<TSnapshot>): TSnapshot =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
