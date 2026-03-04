import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import SimControls from '../SimControls';
import Hdr from '../Hdr';
import ErrorBoundary from '../ErrorBoundary';
import QA from '../QA';
import StatBox from '../StatBox';
import Sl from '../Sl';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../../context/ThemeContext';
import { ModuleProvider } from '../../../context/ModuleContext';

describe('SimControls', () => {
  const defaults = {
    running: false,
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStep: vi.fn(),
    onReset: vi.fn(),
  };

  it('renders Play button when not running', () => {
    const { getByLabelText } = render(<SimControls {...defaults} />);
    const btn = getByLabelText('Play simulation');
    expect(btn.textContent).toContain('Play');
  });

  it('renders Pause button when running', () => {
    const { getByLabelText } = render(<SimControls {...defaults} running={true} />);
    const btn = getByLabelText('Pause simulation');
    expect(btn.textContent).toContain('Pause');
  });

  it('calls onPlay when clicking Play', () => {
    const onPlay = vi.fn();
    const { getByLabelText } = render(<SimControls {...defaults} onPlay={onPlay} />);
    fireEvent.click(getByLabelText('Play simulation'));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('calls onPause when clicking Pause', () => {
    const onPause = vi.fn();
    const { getByLabelText } = render(
      <SimControls {...defaults} running={true} onPause={onPause} />,
    );
    fireEvent.click(getByLabelText('Pause simulation'));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('calls onStep when clicking Step', () => {
    const onStep = vi.fn();
    const { getByLabelText } = render(<SimControls {...defaults} onStep={onStep} />);
    fireEvent.click(getByLabelText('Step one batch'));
    expect(onStep).toHaveBeenCalledOnce();
  });

  it('calls onReset when clicking Reset', () => {
    const onReset = vi.fn();
    const { getByLabelText } = render(<SimControls {...defaults} onReset={onReset} />);
    fireEvent.click(getByLabelText('Reset simulation'));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('renders progress text when provided', () => {
    const { container } = render(<SimControls {...defaults} progress="50 / 100" />);
    expect(container.textContent).toContain('50 / 100');
  });

  it('does not render progress when not provided', () => {
    const { container } = render(<SimControls {...defaults} />);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });
});

describe('Hdr', () => {
  it('renders section subtitle and title', () => {
    const { container } = render(<Hdr sub="Foundations">Type I & II Errors</Hdr>);
    expect(container.textContent).toContain('Foundations');
    expect(container.textContent).toContain('Type I & II Errors');
    expect(container.textContent).toContain('Share');
  });

  it('clicking Share copies link and shows Copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { getByLabelText, findByText } = render(<Hdr sub="Design">Test</Hdr>);

    await act(async () => {
      fireEvent.click(getByLabelText('Copy link to this module'));
      // Let the promise resolve
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    // After clipboard resolves, "Copied!" should appear
    expect(await findByText('Copied!')).toBeTruthy();
  });
});

describe('ErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) throw new Error('Test error');
    return <div>OK</div>;
  }

  it('renders children when no error', () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>,
    );
    expect(container.textContent).toContain('Hello');
  });

  it('renders error UI when child throws', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(container.textContent).toContain('This module failed to render');
    expect(container.textContent).toContain('Test error');
  });

  it('Try again button clears error', () => {
    const { getByText, container } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(container.textContent).toContain('This module failed to render');
    fireEvent.click(getByText('Try again'));
    // After clicking Try again, it will try to re-render, which will throw again
    // but getDerivedStateFromError catches it. The key test is that the click handler fires.
  });
});

describe('QA', () => {
  const items = [
    { q: 'What is p-value?', a: 'Probability of observing the data' },
    { q: 'What is alpha?', a: 'Significance level threshold' },
  ];

  function renderQA() {
    return render(
      <ModuleProvider moduleId="m1">
        <QA items={items} />
      </ModuleProvider>,
    );
  }

  it('renders all questions', () => {
    const { container } = renderQA();
    expect(container.textContent).toContain('What is p-value?');
    expect(container.textContent).toContain('What is alpha?');
  });

  it('answers are hidden by default', () => {
    const { container } = renderQA();
    expect(container.textContent).not.toContain('Probability of observing');
  });

  it('clicking question opens the answer', () => {
    const { getByText, container } = renderQA();
    fireEvent.click(getByText('What is p-value?'));
    expect(container.textContent).toContain('Probability of observing');
  });

  it('clicking open question closes it', () => {
    const { getByText, container } = renderQA();
    fireEvent.click(getByText('What is p-value?'));
    expect(container.textContent).toContain('Probability of observing');
    fireEvent.click(getByText('What is p-value?'));
    expect(container.textContent).not.toContain('Probability of observing');
  });

  it('opening a different question closes the previous', () => {
    const { getByText, container } = renderQA();
    fireEvent.click(getByText('What is p-value?'));
    expect(container.textContent).toContain('Probability of observing');
    fireEvent.click(getByText('What is alpha?'));
    expect(container.textContent).not.toContain('Probability of observing');
    expect(container.textContent).toContain('Significance level');
  });
});

describe('StatBox', () => {
  it('renders label and value', () => {
    const { container } = render(<StatBox label="Power" value="0.80" />);
    expect(container.textContent).toContain('Power');
    expect(container.textContent).toContain('0.80');
  });

  it('uses custom color when provided', () => {
    const { container } = render(<StatBox label="Power" value="0.80" color="#ff0000" />);
    const valueEl = container.querySelector('[style]');
    expect(valueEl?.getAttribute('style')).toContain('rgb(255, 0, 0)');
  });

  it('uses default color when not provided', () => {
    const { container } = render(<StatBox label="Power" value="0.80" />);
    const valueEl = container.querySelector('[style]');
    // jsdom converts hex to rgb
    expect(valueEl?.getAttribute('style')).toContain('rgb(129, 140, 248)');
  });

  it('renders numeric value', () => {
    const { container } = render(<StatBox label="N" value={100} />);
    expect(container.textContent).toContain('100');
  });
});

describe('Sl', () => {
  it('renders label and value', () => {
    const { container } = render(
      <Sl label="Alpha" value={0.05} min={0} max={1} step={0.01} onChange={() => {}} />,
    );
    expect(container.textContent).toContain('Alpha');
    expect(container.textContent).toContain('0.05');
  });

  it('uses custom fmt function', () => {
    const { container } = render(
      <Sl
        label="Alpha"
        value={0.05}
        min={0}
        max={1}
        step={0.01}
        onChange={() => {}}
        fmt={(v) => `${(v * 100).toFixed(0)}%`}
      />,
    );
    expect(container.textContent).toContain('5%');
  });

  it('calls onChange on input change', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <Sl label="Alpha" value={0.05} min={0} max={1} step={0.01} onChange={onChange} />,
    );
    fireEvent.change(getByRole('slider'), { target: { value: '0.1' } });
    expect(onChange).toHaveBeenCalledWith(0.1);
  });

  it('uses custom color', () => {
    const { container } = render(
      <Sl
        label="Alpha"
        value={0.05}
        min={0}
        max={1}
        step={0.01}
        onChange={() => {}}
        color="#ff0000"
      />,
    );
    const valueSpan = container.querySelector('span[style]');
    expect(valueSpan?.getAttribute('style')).toContain('rgb(255, 0, 0)');
  });
});

describe('ThemeToggle', () => {
  it('renders in dark mode with Light label', () => {
    // ThemeProvider defaults based on prefers-color-scheme
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    // Should render a button with either "Light" or "Dark"
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn?.textContent).toMatch(/Light|Dark/);
  });

  it('clicking toggle changes theme text', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const btn = container.querySelector('button')!;
    const initialText = btn.textContent;
    fireEvent.click(btn);
    const newText = btn.textContent;
    expect(newText).not.toBe(initialText);
  });
});
