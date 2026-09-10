import type { Metadata } from 'next';
import { ReactNode } from 'react';

import { AppProvider } from 'providers';

import './globals.scss';
import styles from './layout.module.scss';

export const metadata: Metadata = {
  description: 'Рабочее пространство с нодами: текст, генератор и результат.',
  title: 'Канвас генераций',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ru">
    <body>
      <AppProvider>
        <a className={styles.skipLink} href="#main">
          Перейти к содержимому
        </a>
        <main className={styles.main} id="main">
          {children}
        </main>
      </AppProvider>
    </body>
  </html>
);

export default RootLayout;
