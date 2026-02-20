import { createContext, useContext } from 'react';

const ModuleContext = createContext(null);

export function ModuleProvider({ moduleId, children }) {
  return <ModuleContext.Provider value={moduleId}>{children}</ModuleContext.Provider>;
}

export function useCurrentModule() {
  return useContext(ModuleContext);
}
