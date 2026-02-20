import { createContext, useContext, type ReactNode } from 'react';

const ModuleContext = createContext<string | null>(null);

export function ModuleProvider({ moduleId, children }: { moduleId: string; children: ReactNode }) {
  return <ModuleContext.Provider value={moduleId}>{children}</ModuleContext.Provider>;
}

export function useCurrentModule(): string | null {
  return useContext(ModuleContext);
}
