'use client';

import { createContext } from 'react';

import { AppServices } from './services';

export const ServicesContext = createContext<AppServices | null>(null);
