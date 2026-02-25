import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import ChartBox from '../ChartBox';
import Sl from '../Sl';
import StatBox from '../StatBox';
import Hdr from '../Hdr';
import Desc from '../Desc';
import Insight from '../Insight';
import TechNote from '../TechNote';
import { ThemeProvider } from '../../../context/ThemeContext';
import { ModuleProvider } from '../../../context/ModuleContext';
import type { ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ModuleProvider moduleId="m1">{children}</ModuleProvider>
    </ThemeProvider>
  );
}

async function checkA11y(container: HTMLElement) {
  const results = await axe.run(container);
  const violations = results.violations.map(
    (v) => `${v.id}: ${v.description} (${v.nodes.length} nodes)`,
  );
  expect(violations).toEqual([]);
}

describe('UI Component Accessibility (axe-core)', () => {
  it('ChartBox has no violations', async () => {
    const { container } = render(
      <Wrapper>
        <ChartBox h={200} label="Test chart">
          <rect x={0} y={0} width={100} height={100} fill="blue" />
        </ChartBox>
      </Wrapper>,
    );
    await checkA11y(container);
  });

  it('Sl has no violations', async () => {
    const { container } = render(
      <Wrapper>
        <Sl label="Test slider" value={50} min={0} max={100} step={1} onChange={() => {}} />
      </Wrapper>,
    );
    await checkA11y(container);
  });

  it('StatBox has no violations', async () => {
    const { container } = render(
      <Wrapper>
        <StatBox label="Metric" value="42.5" color="#818cf8" />
      </Wrapper>,
    );
    await checkA11y(container);
  });

  it('Hdr has no violations', async () => {
    const { container } = render(
      <Wrapper>
        <Hdr sub="Foundations">Test Header</Hdr>
      </Wrapper>,
    );
    await checkA11y(container);
  });

  it('Desc has no violations', async () => {
    const { container } = render(
      <Wrapper>
        <Desc>This is a description about statistical concepts.</Desc>
      </Wrapper>,
    );
    await checkA11y(container);
  });

  it('Insight has no violations', async () => {
    const { container } = render(
      <Wrapper>
        <Insight>Key insight about the data.</Insight>
      </Wrapper>,
    );
    await checkA11y(container);
  });

  it('TechNote has no violations', async () => {
    const { container } = render(
      <Wrapper>
        <TechNote>Technical note about the math behind this module.</TechNote>
      </Wrapper>,
    );
    await checkA11y(container);
  });
});
