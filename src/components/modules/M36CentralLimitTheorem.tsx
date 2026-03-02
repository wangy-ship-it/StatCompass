import { useMemo, useCallback } from 'react';
import { nPDF, sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const popShapes = ['uniform', 'exponential', 'bimodal'] as const;
const popLabels: Record<string, string> = {
  uniform: 'Uniform',
  exponential: 'Exponential',
  bimodal: 'Bimodal',
};

// Population statistics for each shape
const popStats: Record<string, { mean: number; sd: number }> = {
  uniform: { mean: 0.5, sd: 0.289 },
  exponential: { mean: 0.5, sd: 0.5 },
  bimodal: { mean: 0.5, sd: 0.21 },
};

const defaults = { sampleSize: 30, popShape: 'uniform' };

// Box-Muller transform using seeded random
function sRNormalPair(seed: number): number {
  const u1 = Math.max(sR(seed), 1e-15);
  const u2 = sR(seed + 1);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Generate a single sample value from the chosen population
function sampleValue(shape: string, seed: number): number {
  if (shape === 'exponential') {
    // Inverse CDF of Exp(lambda=2): -ln(U)/2
    const u = Math.max(sR(seed), 1e-15);
    return -Math.log(u) / 2;
  }
  if (shape === 'bimodal') {
    // 50% N(0.3, 0.08) + 50% N(0.7, 0.08)
    const pick = sR(seed);
    const z = sRNormalPair(seed + 2);
    return pick < 0.5 ? 0.3 + 0.08 * z : 0.7 + 0.08 * z;
  }
  // uniform [0,1]
  return sR(seed);
}

function buildHistogram(values: number[], nBins: number) {
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const range = mx - mn || 1;
  const binW = range / nBins;
  const bins = Array.from({ length: nBins }, (_, i) => ({
    lo: mn + i * binW,
    hi: mn + (i + 1) * binW,
    count: 0,
  }));
  for (const v of values) {
    const idx = Math.min(Math.floor((v - mn) / binW), nBins - 1);
    bins[idx].count++;
  }
  return { bins, mn, mx, binW };
}

export default function M36CentralLimitTheorem() {
  const [p, set] = useAnimatedParams(defaults);
  const sampleSize = Math.round(p.sampleSize as number);
  const popShape = p.popShape as string;
  const setSampleSize = (v: number) => set('sampleSize', v);
  const setPopShape = (v: string) => set('popShape', v);

  // ── Chart 1: Population distribution data ──
  const popData = useMemo(() => {
    const W = 600,
      H = 160,
      pl = 36,
      pr = 36,
      pt = 16,
      pb = 28;
    const steps = 200;

    // Define x range and PDF for each shape
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
      // uniform
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
    mxY = mxY * 1.1; // 10% padding

    const tX = (v: number) => pl + ((v - xMn) / (xMx - xMn)) * (W - pl - pr);
    const tY = (v: number) => H - pb - (v / mxY) * (H - pt - pb);

    // Build path and fill area
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
    // Close fill path
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

    // Axis tick marks
    const nTicks = 5;
    const ticks: { x: number; label: string }[] = [];
    for (let i = 0; i <= nTicks; i++) {
      const v = xMn + (i / nTicks) * (xMx - xMn);
      ticks.push({ x: tX(v), label: v.toFixed(1) });
    }

    // Mean line
    const mu = popStats[popShape]?.mean ?? 0.5;
    const meanX = tX(mu);

    return { W, H, pl, pr, pt, pb, curvePath, fillPath, ticks, meanX, by: tY(0) };
  }, [popShape]);

  // ── Chart 2: Sampling distribution data ──
  const samplingData = useMemo(() => {
    const W = 600,
      H = 200,
      pl = 36,
      pr = 36,
      pt = 16,
      pb = 34;
    const nSamples = 500;
    const nBins = 30;

    // Generate 500 sample means
    const means: number[] = [];
    for (let i = 0; i < nSamples; i++) {
      let sum = 0;
      for (let j = 0; j < sampleSize; j++) {
        const seed = i * 1000 + j * 7 + 42;
        sum += sampleValue(popShape, seed);
      }
      means.push(sum / sampleSize);
    }

    const hist = buildHistogram(means, nBins);
    const maxCount = Math.max(...hist.bins.map((b) => b.count), 1);

    const tX = (v: number) => pl + ((v - hist.mn) / (hist.mx - hist.mn || 1)) * (W - pl - pr);
    const tY = (v: number) => H - pb - (v / maxCount) * (H - pt - pb);
    const barW = (hist.binW / (hist.mx - hist.mn || 1)) * (W - pl - pr);

    // Theoretical normal overlay
    const mu = popStats[popShape]?.mean ?? 0.5;
    const sigma = popStats[popShape]?.sd ?? 0.289;
    const seMean = sigma / Math.sqrt(sampleSize);

    // Scale theoretical density to match histogram counts
    // Histogram bar height = count; density * totalSamples * binWidth = expected count
    const scaleFactor = nSamples * hist.binW;

    const steps = 200;
    const theoryXMn = hist.mn;
    const theoryXMx = hist.mx;
    const theoryDx = (theoryXMx - theoryXMn) / steps;
    let theoryPath = '';
    for (let i = 0; i <= steps; i++) {
      const x = theoryXMn + i * theoryDx;
      const density = nPDF(x, mu, seMean) * scaleFactor;
      const sx = tX(x);
      const sy = tY(density);
      theoryPath += (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + sy.toFixed(1);
    }

    // Axis ticks
    const nTicks = 5;
    const ticks: { x: number; label: string }[] = [];
    for (let i = 0; i <= nTicks; i++) {
      const v = hist.mn + (i / nTicks) * (hist.mx - hist.mn);
      ticks.push({ x: tX(v), label: v.toFixed(2) });
    }

    // Mean line
    const meanX = tX(mu);

    return {
      W,
      H,
      pl,
      pr,
      pt,
      pb,
      hist,
      maxCount,
      tX,
      tY,
      barW,
      theoryPath,
      ticks,
      meanX,
      mu,
      seMean,
      scaleFactor,
      by: tY(0),
    };
  }, [sampleSize, popShape]);

  // ── Tooltip for chart 2 ──
  const tooltipLookup = useCallback(
    (vbX: number) => {
      const { pl, pr, W, hist, tX, tY, mu, seMean, scaleFactor } = samplingData;
      if (vbX < pl || vbX > W - pr) return null;

      const xVal = hist.mn + ((vbX - pl) / (W - pl - pr)) * (hist.mx - hist.mn);
      const idx = Math.max(
        0,
        Math.min(hist.bins.length - 1, Math.floor((xVal - hist.mn) / hist.binW)),
      );
      const bin = hist.bins[idx];
      const theoDensity = nPDF((bin.lo + bin.hi) / 2, mu, seMean) * scaleFactor;

      return {
        x: tX(bin.lo + hist.binW / 2),
        y: tY(bin.count),
        lines: [
          {
            label: 'Range',
            value: bin.lo.toFixed(3) + ' \u2013 ' + bin.hi.toFixed(3),
            color: colors.emerald,
          },
          { label: 'Frequency', value: String(bin.count), color: colors.emerald },
          {
            label: 'Theory',
            value: theoDensity.toFixed(1),
            color: colors.amber,
          },
        ],
        markers: [{ y: tY(bin.count), color: colors.emerald }],
      };
    },
    [samplingData],
  );

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
          <PillBtn key={k} on={popShape === k} onClick={() => setPopShape(k)}>
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
          <linearGradient id="grad-pop-m36" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity={0.5} />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity={0.08} />
          </linearGradient>
        </defs>

        {/* Filled area */}
        <path d={popData.fillPath} fill="url(#grad-pop-m36)" />
        {/* Curve */}
        <path d={popData.curvePath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />

        {/* Mean line */}
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

        {/* X axis */}
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

      {/* Chart 2: Sampling Distribution of the Mean */}
      <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
        Sampling Distribution of the Mean (n = {sampleSize})
      </div>
      <ChartBox
        h={samplingData.H}
        tooltipLookup={tooltipLookup}
        label="Histogram of 500 sample means with theoretical normal overlay"
      >
        <defs>
          <linearGradient id="grad-hist-m36" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity={0.7} />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* Histogram bars */}
        {samplingData.hist.bins.map((bin, i) => (
          <rect
            key={i}
            x={samplingData.tX(bin.lo)}
            y={samplingData.tY(bin.count)}
            width={Math.max(1, samplingData.barW - 1)}
            height={samplingData.H - samplingData.pb - samplingData.tY(bin.count)}
            fill="url(#grad-hist-m36)"
            rx={1}
          />
        ))}

        {/* Theoretical normal overlay */}
        <path
          d={samplingData.theoryPath}
          fill="none"
          stroke={colors.amber}
          strokeWidth={2.5}
          strokeDasharray="8,4"
        />

        {/* Mean line */}
        <line
          x1={samplingData.meanX}
          y1={samplingData.pt}
          x2={samplingData.meanX}
          y2={samplingData.by}
          stroke={colors.red}
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />
        <text
          x={samplingData.meanX + 4}
          y={samplingData.pt + 10}
          fill={colors.red}
          fontSize={9}
          fontWeight="700"
        >
          {'\u03BC = ' + samplingData.mu.toFixed(2)}
        </text>

        {/* SE annotation */}
        <text
          x={samplingData.W - samplingData.pr - 4}
          y={samplingData.pt + 10}
          fill={colors.amber}
          fontSize={9}
          textAnchor="end"
          fontWeight="600"
        >
          {'SE = \u03C3/\u221An = ' + samplingData.seMean.toFixed(4)}
        </text>

        {/* X axis */}
        <line
          x1={samplingData.pl}
          y1={samplingData.by}
          x2={samplingData.W - samplingData.pr}
          y2={samplingData.by}
          stroke={sv.axis}
        />
        {samplingData.ticks.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={samplingData.by + 14}
            fill={sv.textFaint}
            fontSize={8}
            textAnchor="middle"
          >
            {t.label}
          </text>
        ))}

        {/* Legend */}
        <rect
          x={samplingData.pl + 8}
          y={samplingData.pt - 2}
          width={10}
          height={10}
          fill={colors.emerald}
          opacity={0.5}
          rx={2}
        />
        <text x={samplingData.pl + 22} y={samplingData.pt + 7} fill={colors.emerald} fontSize={8}>
          Sample Means
        </text>
        <line
          x1={samplingData.pl + 120}
          y1={samplingData.pt + 3}
          x2={samplingData.pl + 140}
          y2={samplingData.pt + 3}
          stroke={colors.amber}
          strokeWidth={2}
          strokeDasharray="6,3"
        />
        <text x={samplingData.pl + 144} y={samplingData.pt + 7} fill={colors.amber} fontSize={8}>
          Theoretical Normal
        </text>
      </ChartBox>

      {/* Slider */}
      <Sl
        label="Sample Size (n)"
        value={p.sampleSize as number}
        min={1}
        max={200}
        step={1}
        onChange={setSampleSize}
        fmt={(v) => String(Math.round(v))}
        color={colors.indigo}
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
