import type { ReactNode } from 'react';
import { processChildren } from '../../utils/conceptLinker';
import { useCurrentModule } from '../../context/ModuleContext';

export default function Desc({ children }: { children: ReactNode }) {
  const moduleId = useCurrentModule();
  return (
    <p className="text-[15px] text-[var(--svg-text)] leading-[1.7] mb-7">
      {processChildren(children, moduleId)}
    </p>
  );
}
