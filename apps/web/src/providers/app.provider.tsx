'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';

import { createQueryClient } from 'query/query-client';

import { createServices } from './services';
import { ServicesContext } from './services.context';

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [services] = useState(createServices);
  const [queryClient] = useState(createQueryClient);

  return (
    <ServicesContext.Provider value={services}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ServicesContext.Provider>
  );
};
