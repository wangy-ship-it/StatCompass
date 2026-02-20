import { processChildren } from '../../utils/conceptLinker';
import { useCurrentModule } from '../../context/ModuleContext';

export default function Insight({ emoji, children }) {
  const moduleId = useCurrentModule();
  return (
    <div className="bg-[var(--color-accent-bg)] rounded-xl px-5 py-4 mt-5 text-[14px] text-[var(--color-accent)] leading-[1.7] ring-1 ring-[var(--color-accent-ring)]">
      <span className="font-medium text-[var(--color-accent-faint)] mr-1">{emoji || '\uD83D\uDCA1'}</span>{' '}
      {processChildren(children, moduleId)}
    </div>
  );
}
