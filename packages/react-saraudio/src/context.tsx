import type { PipelineDependencies } from '@saraudio/core';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export interface SaraudioProviderValue {
  now?: PipelineDependencies['now'];
  createId?: PipelineDependencies['createId'];
}

const SaraudioContext = createContext<SaraudioProviderValue | null>(null);

export interface SaraudioProviderProps {
  value?: SaraudioProviderValue;
  children: ReactNode;
}

export const SaraudioProvider = ({ value, children }: SaraudioProviderProps) => (
  <SaraudioContext.Provider value={value ?? null}>{children}</SaraudioContext.Provider>
);

export const useSaraudioContext = (): SaraudioProviderValue => {
  const value = useContext(SaraudioContext);
  return value ?? {};
};
