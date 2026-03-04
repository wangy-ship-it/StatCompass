import { useMemo, useCallback } from 'react';
import { nPDF } from '../../utils/math';
import { buildHistogramFixed } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, QA, TechNote, Insight, SimControls } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';
import useCLTSim, { popStats } from '../../hooks/useCLTSim';

const popShapes = ['uniform', 'exponential', 'bimodal'] as const;
const popLabels: Record<string, string> = {
  uniform: 'Uniform',
  exponential: 'Exponential',
  bimodal: 'Bimodal',
};

const defaults = { sampleSize: 30, popShape: 'uniform', speed: 50 };

export default function M36CentralLimitTheorem() {
  const [p, set] = useAnimatedParams(defaults);
  const sampleSize = Math.round(p.sampleSize as number);
  const popShape = p.popShape as string;
  const speed = Math.round(p.speed as number);

  const sim = useCLTSim(popShape, sampleSize, speed);
  const s = sim.state;

  // ── Chart 1: Population distribution data ──
  const popData = useMemo(() => {
    const W = 600,
      H = 160,
      pl = 36,
      pr = 36,
      pt = 16,
      pb = 28;
    const steps = 200;

    let xMn: number, xMx: number;
    let pdfFn: (x: number) => number;

    if (popShape === 'exponential') {
      xMn = 0;
      xMx = 3;
      pdfFn = (x: number) => (x >= 0 ? 2 * Math.exp(-2 * x) : 0);
    } else if (popShape === 'bimodal') {
      xMn = 0;
      xMx = 1;
      pdfFn = (x: number) => 0.5 * nPDF(x, 0.3, 0.08) + 0.5 * nPDF(x, 0.7, 0.08);
    } else {
      xMn = 0;
      xMx = 1;
      pdfFn = (x: number) => (x >= 0 && x <= 1 ? 1 : 0);
    }

    const dx = (xMx - xMn) / steps;
    let mxY = 0;
    for (let i = 0; i <= steps; i++) {
      const x = xMn + i * dx;
      mxY = Math.max(mxY, pdfFn(x));
    }
    mxY = mxY * 1.1;

    const tX = (v: number) => pl + ((v - xMn) / (xMx - xMn)) * (W - pl - pr);
    const tY = (v: number) => H - pb - (v / mxY) * (H - pt - pb);

    let curvePath = '';
    let fillPath = '';
    for (let i = 0; i <= steps; i++) {
      const x = xMn + i * dx;
      const y = pdfFn(x);
      const sx = tX(x);
      const sy = tY(y);
      curvePath += (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + sy.toFixed(1);
      fillPath += (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + sy.toFixed(1);
    }
    fillPath +=
      'L' +
      tX(xMn + steps * dx).toFixed(1) +
      ',' +
      tY(0).toFixed(1) +
      'L' +
      tX(xMn).toFixed(1) +
      ',' +
      tY(0).toFixed(1) +
      'Z';

    const nTicks = 5;
    const ticks: { x: number; label: string }[] = [];
    for (let i = 0; i <= nTicks; i++) {
      const v = xMn + (i / nTicks) * (xMx - xMn);
      ticks.push({ x: tX(v), label: v.toFixed(1) });
    }

    const mu = popStats[popShape]?.mean ?? 0.5;
    const meanX = tX(mu);

    return { W, H, pl, pr, pt, pb, curvePath, fillPath, ticks, meanX, by: tY(0) };
  }, [popShape]);

  // ── Chart 2: Sampling distribution data ──
  const nBins = 30;
  const W2 = 600,
    H2 = 200,
    pl2 = 36,
    pr2 = 36,
    pt2 = 16,
    pb2 = 34;

  const hist = useMemo(
    () =>
      s.means.length > 0
        ? buildHistogramFixed(s.means, nBins, s.binRange[0], s.binRange[1])
        : {
            bins: [],
            mn: s.binRange[0],
            mx: s.binRange[1],
            binW: (s.binRange[1] - s.binRange[0]) / nBins,
          },
    [s.means, s.binRange],
  );

  const maxCount = Math.max(...(hist.bins.length > 0 ? hist.bins.map((b) => b.count) : [1]), 1);

  const tX2 = useCallback(
    (v: number) => pl2 + ((v - hist.mn) / (hist.mx - hist.mn || 1)) * (W2 - pl2 - pr2),
    [hist.mn, hist.mx],
  );
  const tY2 = useCallback((v: number) => H2 - pb2 - (v / maxCount) * (H2 - pt2 - pb2), [maxCount]);
  const barW = (hist.binW / (hist.mx - hist.mn || 1)) * (W2 - pl2 - pr2);

  // Theoretical normal overlay (always visible as reference)
  const theoryPath = useMemo(() => {
    const scaleFactor = s.means.length > 0 ? s.means.length * hist.binW : 1;
    const steps = 200;
    const dx = (hist.mx - hist.mn) / steps;
    let path = '';
    for (let i = 0; i <= steps; i++) {
      const x = hist.mn + i * dx;
      const density = nPDF(x, s.mu, s.seMean) * scaleFactor;
      const sx = tX2(x);
      const sy = tY2(density);
      path += (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + sy.toFixed(1);
    }
    return path;
  }, [hist, s.means.length, s.mu, s.seMean, tX2, tY2]);

  // Axis ticks
  const ticks2 = useMemo(() => {
    const nT = 5;
    const result: { x: number; label: string }[] = [];
    for (let i = 0; i <= nT; i++) {
      const v = hist.mn + (i / nT) * (hist.mx - hist.mn);
      result.push({ x: tX2(v), label: v.toFixed(2) });
    }
    return result;
  }, [hist.mn, hist.mx, tX2]);

  const meanX2 = tX2(s.mu);
  const by2 = tY2(0);

  // ── Tooltip for chart 2 ──
  const tooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < pl2 || vbX > W2 - pr2 || hist.bins.length === 0) return null;
      const xVal = hist.mn + ((vbX - pl2) / (W2 - pl2 - pr2)) * (hist.mx - hist.mn);
      const idx = Math.max(
        0,
        Math.min(hist.bins.length - 1, Math.floor((xVal - hist.mn) / hist.binW)),
      );
      const bin = hist.bins[idx];
      const scaleFactor = s.means.length * hist.binW;
      const theoDensity = nPDF((bin.lo + bin.hi) / 2, s.mu, s.seMean) * scaleFactor;

      return {
        x: tX2(bin.lo + hist.binW / 2),
        y: tY2(bin.count),
        lines: [
          {
            label: 'Range',
            value: bin.lo.toFixed(3) + ' \u2013 ' + bin.hi.toFixed(3),
            color: colors.emerald,
          },
          { label: 'Frequency', value: String(bin.count), color: colors.emerald },
          { label: 'Theory', value: theoDensity.toFixed(1), color: colors.amber },
        ],
        markers: [{ y: tY2(bin.count), color: colors.emerald }],
      };
    },
    [hist, s.means.length, s.mu, s.seMean, tX2, tY2],
  );

  const progress = s.step + ' / 500';

  return (
    <div>
      <Hdr sub="Foundations">Central Limit Theorem</Hdr>
      <Desc>
        No matter what the population looks like {'\u2014'} skewed, bimodal, uniform {'\u2014'} the
        distribution of sample means converges to a normal distribution as sample size grows. This
        is why confidence intervals and hypothesis tests work.
      </Desc>

      {/* Population shape selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {popShapes.map((k) => (
          <PillBtn key={k} on={popShape === k} onClick={() => set('popShape', k)}>
            {popLabels[k]}
          </PillBtn>
        ))}
      </div>

      {/* Chart 1: Population Distribution */}
      <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
        Population Distribution
      </div>
      <ChartBox
        h={popData.H}
        label="Population distribution shape showing the selected distribution"
      >
        <defs>
          <linearGradient id="grad-pop-m3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity={0.5} />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity={0.08} />
          </linearGradient>
        </defs>

        <path d={popData.fillPath} fill="url(#grad-pop-m3)" />
        <path d={popData.curvePath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />

        <line
          x1={popData.meanX}
          y1={popData.pt}
          x2={popData.meanX}
          y2={popData.by}
          stroke={colors.indigo}
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />
        <text
          x={popData.meanX + 4}
          y={popData.pt + 10}
          fill={colors.indigo}
          fontSize={9}
          fontWeight="700"
        >
          {'\u03BC = ' + (popStats[popShape]?.mean ?? 0.5).toFixed(2)}
        </text>

        <line
          x1={popData.pl}
          y1={popData.by}
          x2={popData.W - popData.pr}
          y2={popData.by}
          stroke={sv.axis}
        />
        {popData.ticks.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={popData.by + 14}
            fill={sv.textFaint}
            fontSize={8}
            textAnchor="middle"
          >
            {t.label}
          </text>
        ))}
      </ChartBox>

      {/* Simulation Controls */}
      <SimControls
        running={s.running}
        onPlay={sim.start}
        onPause={sim.pause}
        onStep={sim.stepOnce}
        onReset={sim.reset}
        progress={progress}
      />

      {/* Chart 2: Sampling Distribution of the Mean */}
      <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
        Sampling Distribution of the Mean (n = {sampleSize})
      </div>
      <ChartBox
        h={H2}
        tooltipLookup={tooltipLookup}
        label="Histogram of sample means with theoretical normal overlay"
      >
        <defs>
          <linearGradient id="grad-hist-m3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity={0.7} />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* Histogram bars */}
        {hist.bins.map((bin, i) => (
          <rect
            key={i}
            x={tX2(bin.lo)}
            y={tY2(bin.count)}
            width={Math.max(1, barW - 1)}
            height={H2 - pb2 - tY2(bin.count)}
            fill="url(#grad-hist-m3)"
            rx={1}
          />
        ))}

        {/* Theoretical normal overlay */}
        {s.means.length > 0 && (
          <path
            d={theoryPath}
            fill="none"
            stroke={colors.amber}
            strokeWidth={2.5}
            strokeDasharray="8,4"
          />
        )}

        {/* Mean line */}
        <line
          x1={meanX2}
          y1={pt2}
          x2={meanX2}
          y2={by2}
          stroke={colors.red}
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />
        <text x={meanX2 + 4} y={pt2 + 10} fill={colors.red} fontSize={9} fontWeight="700">
          {'\u03BC = ' + s.mu.toFixed(2)}
        </text>

        {/* SE annotation */}
        <text
          x={W2 - pr2 - 4}
          y={pt2 + 10}
          fill={colors.amber}
          fontSize={9}
          textAnchor="end"
          fontWeight="600"
        >
          {'SE = \u03C3/\u221An = ' + s.seMean.toFixed(4)}
        </text>

        {/* X axis */}
        <line x1={pl2} y1={by2} x2={W2 - pr2} y2={by2} stroke={sv.axis} />
        {ticks2.map((t, i) => (
          <text key={i} x={t.x} y={by2 + 14} fill={sv.textFaint} fontSize={8} textAnchor="middle">
            {t.label}
          </text>
        ))}

        {/* Legend */}
        <rect
          x={pl2 + 8}
          y={pt2 - 2}
          width={10}
          height={10}
          fill={colors.emerald}
          opacity={0.5}
          rx={2}
        />
        <text x={pl2 + 22} y={pt2 + 7} fill={colors.emerald} fontSize={8}>
          Sample Means
        </text>
        <line
          x1={pl2 + 120}
          y1={pt2 + 3}
          x2={pl2 + 140}
          y2={pt2 + 3}
          stroke={colors.amber}
          strokeWidth={2}
          strokeDasharray="6,3"
        />
        <text x={pl2 + 144} y={pt2 + 7} fill={colors.amber} fontSize={8}>
          Theoretical Normal
        </text>
      </ChartBox>

      {/* Sliders */}
      <Sl
        label="Sample Size (n)"
        value={p.sampleSize as number}
        min={1}
        max={200}
        step={1}
        onChange={(v) => set('sampleSize', v)}
        fmt={(v) => String(Math.round(v))}
        color={colors.indigo}
      />
      <Sl
        label="Simulation Speed"
        value={p.speed as number}
        min={10}
        max={100}
        step={10}
        onChange={(v) => set('speed', v)}
        color={colors.amber}
      />

      <QA
        items={[
          {
            q: 'Why does this matter for A/B testing?',
            a: 'The CLT guarantees that the difference in sample means between groups is approximately normal, which is why z-tests and t-tests work even when the underlying metric (like revenue) is highly skewed.',
          },
          {
            q: 'How large does the sample need to be?',
            a: 'It depends on the population shape. Symmetric distributions converge quickly (n\u224815-20). Highly skewed distributions like exponential need n\u224830-50. The more skewed, the more data you need.',
          },
        ]}
      />
      <TechNote>
        For a population with mean {'\u03BC'} and variance {'\u03C3\u00B2'}, the sampling
        distribution of X{'\u0304'} from samples of size n has mean {'\u03BC'} and variance{' '}
        {'\u03C3\u00B2'}/n. The CLT states X{'\u0304'} {'\u2192'} N({'\u03BC'}, {'\u03C3\u00B2'}
        /n) as n {'\u2192'} {'\u221E'}. Convergence rate depends on skewness and kurtosis.
      </TechNote>
      <Insight>
        The CLT is the foundation of statistical inference. It explains why normal-based confidence
        intervals work for means of any metric {'\u2014'} clicks, revenue, time-on-site {'\u2014'}{' '}
        as long as the sample is large enough. When n is small, use bootstrap methods instead.
      </Insight>
    </div>
  );
}
