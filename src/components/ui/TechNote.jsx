import { processChildren } from '../../utils/conceptLinker';
import { useCurrentModule } from '../../context/ModuleContext';

export default function TechNote({ children }) {
  const moduleId = useCurrentModule();
  return (
    <div className="bg-app-glass rounded-xl px-5 py-4 mt-6 text-[13px] text-[var(--svg-text-faint)] leading-[1.7] ring-1 ring-[var(--color-border-subtle)]">
      <span className="text-[var(--color-text-muted)] font-medium">Technical note</span>
      <span className="text-[var(--color-text-muted)] mx-2">&mdash;</span>
      {processChildren(children, moduleId)}
    </div>
  );
}
