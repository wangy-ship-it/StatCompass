import { useState } from 'react';
import { processChildren } from '../../utils/conceptLinker';
import { useCurrentModule } from '../../context/ModuleContext';

interface QAItem {
  q: string;
  a: string;
}

interface QAProps {
  items: QAItem[];
}

export default function QA({ items }: QAProps) {
  const [open, setOpen] = useState<number | null>(null);
  const moduleId = useCurrentModule();
  return (
    <div className="mt-8">
      <h3 className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.15em] font-medium mb-3">
        Common Questions
      </h3>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {items.map((item, i) => {
          const panelId = `qa-panel-${i}`;
          const isOpen = open === i;
          return (
            <div key={i}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="w-full text-left py-3.5 text-[14px] cursor-pointer transition-colors duration-100 flex justify-between items-start gap-3 text-[var(--svg-text)] hover:text-[var(--color-text-primary)]"
              >
                <span className="leading-snug">{item.q}</span>
                <span
                  className="text-[var(--color-text-muted)] text-xs mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                >
                  {isOpen ? '\u2212' : '+'}
                </span>
              </button>
              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-label={item.q}
                  className="pb-4 text-[14px] text-[var(--svg-text)] leading-[1.7] pl-0"
                >
                  {processChildren(item.a, moduleId)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
