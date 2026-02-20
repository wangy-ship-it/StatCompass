import { useState } from 'react';
import { processChildren } from '../../utils/conceptLinker';
import { useCurrentModule } from '../../context/ModuleContext';

export default function QA({ items }) {
  const [open, setOpen] = useState(null);
  const moduleId = useCurrentModule();
  return (
    <div className="mt-8">
      <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.15em] font-medium mb-3">
        Common Questions
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {items.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full text-left py-3.5 text-[14px] cursor-pointer transition-colors duration-100 flex justify-between items-start gap-3 text-[var(--svg-text)] hover:text-[var(--color-text-primary)]"
            >
              <span className="leading-snug">{item.q}</span>
              <span className="text-[var(--color-text-muted)] text-xs mt-0.5 flex-shrink-0">{open === i ? '\u2212' : '+'}</span>
            </button>
            {open === i && (
              <div className="pb-4 text-[14px] text-[var(--svg-text)] leading-[1.7] pl-0">
                {processChildren(item.a, moduleId)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
