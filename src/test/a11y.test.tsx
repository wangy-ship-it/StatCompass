import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import QA from '../components/ui/QA';
import PillBtn from '../components/ui/PillBtn';
import { ThemeProvider } from '../context/ThemeContext';
import type { ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

async function checkA11y(container: HTMLElement) {
  const results = await axe.run(container);
  const violations = results.violations.map(
    (v) => `${v.id}: ${v.description} (${v.nodes.length} nodes)`,
  );
  expect(violations).toEqual([]);
}

describe('Accessibility (axe-core)', () => {
  it('QA component has no violations', async () => {
    const items = [
      { q: 'What is a p-value?', a: 'The probability of observing the result under the null.' },
      { q: 'What is alpha?', a: 'The significance threshold, commonly 0.05.' },
    ];
    const { container } = render(
      <Wrapper>
        <QA items={items} />
      </Wrapper>,
    );
    await checkA11y(container);
  });

  it('PillBtn component has no violations', async () => {
    const { container } = render(
      <Wrapper>
        <PillBtn on={true} onClick={() => {}}>
          Active Pill
        </PillBtn>
        <PillBtn on={false} onClick={() => {}}>
          Inactive Pill
        </PillBtn>
      </Wrapper>,
    );
    await checkA11y(container);
  });
});
