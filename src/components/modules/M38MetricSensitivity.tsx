import { useMemo, useCallback } from 'react';
import { sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const defaults = { outlierFrac: 0.05, skewness: 0.5, trimPct: 0.1 };

export default function M38MetricSensitivity() {
  const [p, set] = useAnimatedParams(defaults);
  const { outlierFrac, skewness, trimPct } = p;
  const setOutlierFrac = (v: number) => set('outlierFrac', v);
  const setSkewness = (v: number) => set('skewness', v);
  const setTrimPct = (v: number) => set('trimPct', v);

  const d = useMemo(() => {
    const N = 500;
    const W = 600;
    const H = 280;
    const pl = 48;
    const pr = 36;
    const pt = 24;
    const pb = 44;

    // Generate data
    const values: number[] = [];
    const cleanValues: number[] = [];
    for (let i = 0; i < N; i++) {
      const r = sR(i * 17 + 3);
      // Base value centered around 55
      let base = r * 10 + 50;
      // Apply skewness via exponential transform
      if (skewness > 0) {
        const offset = base - 50;
        base = 50 + offset * (1 + (skewness * offset) / 20);
      }
      // Check if this point becomes an outlier
      const isOutlier = sR(i * 41 + 7) < outlierFrac;
      if (isOutlier) {
        const outlierVal = 50 + (sR(i * 31 + 99) - 0.5) * 200;
        values.push(outlierVal);
      } else {
        values.push(base);
      }
      cleanValues.push(base);
    }

    // Compute mean
    const mean = values.reduce((a, b) => a + b, 0) / N;
    const cleanMean = cleanValues.reduce((a, b) => a + b, 0) / N;

    // Compute median
    const sorted = [...values].slice().sort((a, b) => a - b);
    const median =
      N % 2 === 0 ? (sorted[N / 2 - 1] + sorted[N / 2]) / 2 : sorted[Math.floor(N / 2)];
    const cleanSorted = [...cleanValues].sort((a, b) => a - b);
    const cleanMedian =
      N % 2 === 0
        ? (cleanSorted[N / 2 - 1] + cleanSorted[N / 2]) / 2
        : cleanSorted[Math.floor(N / 2)];

    // Compute trimmed mean
    const trimCount = Math.floor(trimPct * N);
    const trimmedSlice = sorted.slice(trimCount, N - trimCount);
    const trimmedMean =
      trimmedSlice.length > 0
        ? trimmedSlice.reduce((a, b) => a + b, 0) / trimmedSlice.length
        : mean;
    const cleanTrimmedSlice = cleanSorted.slice(trimCount, N - trimCount);
    const cleanTrimmedMean =
      cleanTrimmedSlice.length > 0
        ? cleanTrimmedSlice.reduce((a, b) => a + b, 0) / cleanTrimmedSlice.length
        : cleanMean;

    // Outlier impact: percentage difference between mean and trimmed mean
    const outlierImpact =
      trimmedMean !== 0 ? (Math.abs(mean - trimmedMean) / Math.abs(trimmedMean)) * 100 : 0;

    // Histogram bins
    const nBins = 40;
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const range = dataMax - dataMin || 1;
    const binW = range / nBins;
    const bins: { lo: number; hi: number; count: number }[] = [];
    for (let b = 0; b < nBins; b++) {
      bins.push({ lo: dataMin + b * binW, hi: dataMin + (b + 1) * binW, count: 0 });
    }
    for (const v of values) {
      let idx = Math.floor((v - dataMin) / binW);
      if (idx >= nBins) idx = nBins - 1;
      if (idx < 0) idx = 0;
      bins[idx].count++;
    }
    const maxCount = Math.max(...bins.map((b) => b.count), 1);

    // Coordinate transforms
    const xMin = dataMin - range * 0.05;
    const xMax = dataMax + range * 0.05;
    const tX = (v: number) => pl + ((v - xMin) / (xMax - xMin)) * (W - pl - pr);
    const tY = (v: number) => H - pb - (v / maxCount) * (H - pt - pb);
    const baseY = H - pb;

    // Build histogram bar data for SVG
    const barData = bins.map((bin) => ({
      x: tX(bin.lo),
      w: tX(bin.hi) - tX(bin.lo),
      y: tY(bin.count),
      h: baseY - tY(bin.count),
      lo: bin.lo,
      hi: bin.hi,
      count: bin.count,
    }));

    // Metric line positions
    const meanX = tX(mean);
    const medianX = tX(median);
    const trimmedMeanX = tX(trimmedMean);

    // Axis ticks
    const tickCount = 6;
    const tickStep = (xMax - xMin) / tickCount;
    const ticks: { x: number; label: string }[] = [];
    for (let i = 0; i <= tickCount; i++) {
      const val = xMin + i * tickStep;
      ticks.push({ x: tX(val), label: val.toFixed(0) });
    }

    // Y-axis ticks
    const yTickCount = 4;
    const yStep = maxCount / yTickCount;
    const yTicks: { y: number; label: string }[] = [];
    for (let i = 0; i <= yTickCount; i++) {
      const val = i * yStep;
      yTicks.push({ y: tY(val), label: Math.round(val).toString() });
    }

    return {
      W,
      H,
      pl,
      pr,
      pt,
      pb,
      xMin,
      xMax,
      maxCount,
      barData,
      meanX,
      medianX,
      trimmedMeanX,
      mean,
      median,
      trimmedMean,
      cleanMean,
      cleanMedian,
      cleanTrimmedMean,
      outlierImpact,
      baseY,
      ticks,
      yTicks,
    };
  }, [outlierFrac, skewness, trimPct]);

  const tooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < d.pl || vbX > d.W - d.pr) return null;

      // Find which bin the cursor is over
      const hoveredBar = d.barData.find((b) => vbX >= b.x && vbX < b.x + b.w);
      if (!hoveredBar) return null;

      const lines = [
        {
          label: 'Bin',
          value: hoveredBar.lo.toFixed(1) + ' – ' + hoveredBar.hi.toFixed(1),
          color: colors.indigo,
        },
        { label: 'Count', value: String(hoveredBar.count), color: colors.indigo },
        { label: 'Mean', value: d.mean.toFixed(2), color: colors.red },
        { label: 'Median', value: d.median.toFixed(2), color: colors.emerald },
        { label: 'Trimmed', value: d.trimmedMean.toFixed(2), color: colors.amber },
      ];

      return {
        x: hoveredBar.x + hoveredBar.w / 2,
        y: hoveredBar.y,
        lines,
        markers: [{ y: d.baseY, color: colors.indigo }],
      };
    },
    [d],
  );

  return (
    <div>
      <Hdr sub="Design">Metric Sensitivity Analysis</Hdr>
      <Desc>
        Not all metrics respond equally to the same underlying change. Mean is sensitive to
        outliers, median is robust but less powerful, and trimmed mean offers a middle ground.
        Choose the right metric for your data shape.
      </Desc>

      <ChartBox
        h={d.H}
        tooltipLookup={tooltipLookup}
        label="Distribution histogram with mean, median, and trimmed mean markers"
      >
        <defs>
          <linearGradient id="grad-hist-m38" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.45" />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="grad-mean-m38" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.red} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.red} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="grad-median-m38" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="grad-trimmed-m38" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.amber} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.amber} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {d.yTicks.map((tick, i) => (
          <line
            key={'yg' + i}
            x1={d.pl}
            y1={tick.y}
            x2={d.W - d.pr}
            y2={tick.y}
            stroke={sv.grid}
            strokeWidth={0.5}
          />
        ))}

        {/* Histogram bars */}
        {d.barData.map((bar, i) => (
          <rect
            key={'bar' + i}
            x={bar.x + 0.5}
            y={bar.y}
            width={Math.max(0, bar.w - 1)}
            height={bar.h}
            fill="url(#grad-hist-m38)"
            stroke={colors.indigo}
            strokeWidth={0.5}
            strokeOpacity={0.4}
            rx={1}
          />
        ))}

        {/* Mean line */}
        <line
          x1={d.meanX}
          y1={d.pt}
          x2={d.meanX}
          y2={d.baseY}
          stroke={colors.red}
          strokeWidth={2.5}
        />
        <text
          x={d.meanX}
          y={d.pt - 4}
          fill={colors.red}
          fontSize={10}
          fontWeight="700"
          textAnchor="middle"
        >
          Mean: {d.mean.toFixed(1)}
        </text>

        {/* Median line */}
        <line
          x1={d.medianX}
          y1={d.pt}
          x2={d.medianX}
          y2={d.baseY}
          stroke={colors.emerald}
          strokeWidth={2.5}
        />
        <text
          x={d.medianX}
          y={d.pt + 10}
          fill={colors.emerald}
          fontSize={10}
          fontWeight="700"
          textAnchor={d.medianX < d.meanX ? 'end' : 'start'}
          dx={d.medianX < d.meanX ? -4 : 4}
        >
          Median: {d.median.toFixed(1)}
        </text>

        {/* Trimmed Mean line */}
        <line
          x1={d.trimmedMeanX}
          y1={d.pt}
          x2={d.trimmedMeanX}
          y2={d.baseY}
          stroke={colors.amber}
          strokeWidth={2.5}
          strokeDasharray="6,3"
        />
        <text
          x={d.trimmedMeanX}
          y={d.pt + 22}
          fill={colors.amber}
          fontSize={10}
          fontWeight="700"
          textAnchor={d.trimmedMeanX < d.medianX ? 'end' : 'start'}
          dx={d.trimmedMeanX < d.medianX ? -4 : 4}
        >
          Trimmed: {d.trimmedMean.toFixed(1)}
        </text>

        {/* X axis */}
        <line x1={d.pl} y1={d.baseY} x2={d.W - d.pr} y2={d.baseY} stroke={sv.axis} />
        {d.ticks.map((tick, i) => (
          <g key={'xt' + i}>
            <line x1={tick.x} y1={d.baseY} x2={tick.x} y2={d.baseY + 5} stroke={sv.axis} />
            <text x={tick.x} y={d.baseY + 16} fill={sv.text} fontSize={9} textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}
        <text x={d.W / 2} y={d.H - 2} fill={sv.textFaint} fontSize={10} textAnchor="middle">
          Value
        </text>

        {/* Y axis */}
        <line x1={d.pl} y1={d.pt} x2={d.pl} y2={d.baseY} stroke={sv.axis} />
        {d.yTicks.map((tick, i) => (
          <g key={'yt' + i}>
            <line x1={d.pl - 4} y1={tick.y} x2={d.pl} y2={tick.y} stroke={sv.axis} />
            <text x={d.pl - 7} y={tick.y + 3} fill={sv.text} fontSize={9} textAnchor="end">
              {tick.label}
            </text>
          </g>
        ))}
        <text
          x={12}
          y={(d.pt + d.baseY) / 2}
          fill={sv.textFaint}
          fontSize={10}
          textAnchor="middle"
          transform={'rotate(-90,12,' + (d.pt + d.baseY) / 2 + ')'}
        >
          Count
        </text>
      </ChartBox>

      <div className="flex gap-3 flex-wrap mb-5">
        <StatBox label="Mean" value={d.mean.toFixed(2)} color={colors.red} />
        <StatBox label="Median" value={d.median.toFixed(2)} color={colors.emerald} />
        <StatBox label="Trimmed Mean" value={d.trimmedMean.toFixed(2)} color={colors.amber} />
        <StatBox
          label="Outlier Impact"
          value={d.outlierImpact.toFixed(1) + '%'}
          color={d.outlierImpact > 2 ? colors.red : colors.indigo}
        />
      </div>

      <Sl
        label="Outlier Fraction"
        value={outlierFrac}
        min={0}
        max={0.2}
        step={0.01}
        onChange={setOutlierFrac}
        fmt={(v: number) => (v * 100).toFixed(0) + '%'}
        color={colors.red}
      />
      <Sl
        label="Distribution Skewness"
        value={skewness}
        min={0}
        max={3}
        step={0.1}
        onChange={setSkewness}
        fmt={(v: number) => v.toFixed(1)}
        color={colors.indigo}
      />
      <Sl
        label="Trimming Percentage"
        value={trimPct}
        min={0}
        max={0.25}
        step={0.01}
        onChange={setTrimPct}
        fmt={(v: number) => (v * 100).toFixed(0) + '%'}
        color={colors.amber}
      />

      <QA
        items={[
          {
            q: 'Which metric should I use for my A/B test?',
            a: 'If your metric has heavy tails (e.g., revenue), use trimmed mean or winsorized mean \u2014 they\u2019re more robust to outliers while retaining more statistical power than the median. For well-behaved metrics (e.g., click-through rate), the mean works fine.',
          },
          {
            q: 'What about winsorization?',
            a: 'Winsorizing caps extreme values at the trim percentile rather than removing them. It\u2019s often preferred over trimming because it retains all data points and has slightly more power. A 5% winsorized mean caps the top and bottom 5% at those percentile values.',
          },
        ]}
      />
      <TechNote>
        The trimmed mean removes the top and bottom k% of observations before computing the mean.
        The breakdown point (fraction of outliers that can corrupt the estimator) is 0% for the
        mean, 50% for the median, and k% for the k%-trimmed mean. The median has optimal breakdown
        but loses ~36% efficiency relative to the mean for normal data.
      </TechNote>
      <Insight>
        The choice of metric is an experiment design decision, not an analysis decision. Pick your
        primary metric before seeing results. For revenue-like metrics, a 5-10% trimmed mean
        typically offers the best tradeoff between robustness and statistical power.
      </Insight>
    </div>
  );
}
