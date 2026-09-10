'use client';

import { useContext } from 'react';

import { ConfigRepo, SpacesRepo } from 'data/repositories';
import { GenerationService } from 'domain/generation';
import { GraphService } from 'domain/graph';

import { AppServices } from './services';
import { ServicesContext } from './services.context';

export const useServices = (): AppServices => {
  const services = useContext(ServicesContext);

  if (!services) {
    throw new Error('AppProvider не найден: оберните дерево компонентов в <AppProvider>.');
  }

  return services;
};

export const useConfigRepo = (): ConfigRepo => useServices().config;
export const useGenerationService = (): GenerationService => useServices().generation;
export const useGraphService = (): GraphService => useServices().graph;
export const useSpacesRepo = (): SpacesRepo => useServices().spaces;
