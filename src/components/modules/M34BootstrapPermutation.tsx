import { useMemo, useCallback } from 'react';
import { sR, sRNormal, bootstrapSample, permutationTest, zInv } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const dists: Record<string, { label: string; gen: (seed: number, n: number) => number[] }> = {
  normal: {
    label: 'Normal',
    gen: (seed, n) => Array.from({ length: n }, (_, i) => sRNormal(seed + i) * 10 + 50),
  },
  skewed: {
    label: 'Right-skewed',
    gen: (seed, n) => Array.from({ length: n }, (_, i) => Math.exp(sRNormal(seed + i) * 0.5 + 2)),
  },
  bimodal: {
    label: 'Bimodal',
    gen: (seed, n) =>
      Array.from(
        { length: n },
        (_, i) => sRNormal(seed + i) * 5 + (sR(seed + i * 3) > 0.5 ? 60 : 40),
      ),
  },
  heavy: {
    label: 'Heavy-tailed',
    gen: (seed, n) =>
      Array.from(
        { length: n },
        (_, i) => (sRNormal(seed + i) * 10) / (0.3 + sR(seed + i * 5)) + 50,
      ),
  },
};

const distKeys = Object.keys(dists) as (keyof typeof dists)[];

const defaults = { distKey: 'skewed', sampleSize: 50, nResamples: 500 };

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

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

export default function M34BootstrapPermutation() {
  const [p, set] = useAnimatedParams(defaults);
  const { distKey, sampleSize, nResamples } = p;
  const setDistKey = (v: string) => set('distKey', v);
  const setSampleSize = (v: number) => set('sampleSize', v);
  const setNResamples = (v: number) => set('nResamples', v);

  const n = Math.round(sampleSize as number);
  const nBoot = Math.round(nResamples as number);
  const dk = distKey as string;
  const gen = useMemo(() => dists[dk]?.gen || dists.skewed.gen, [dk]);

  const data = useMemo(() => {
    const groupA = gen(1000, n);
    const groupB = gen(2000, n).map((v) => v + 5);

    // Parametric CI of mean difference
    const meanA = mean(groupA);
    const meanB = mean(groupB);
    const diffMean = meanB - meanA;
    const sdA = std(groupA);
    const sdB = std(groupB);
    const seDiff = Math.sqrt(sdA ** 2 / n + sdB ** 2 / n);
    const z = zInv(0.05);
    const paramLo = diffMean - z * seDiff;
    const paramHi = diffMean + z * seDiff;

    // Bootstrap CI for mean difference (resample each group independently)
    const bootDist: number[] = [];
    for (let b = 0; b < nBoot; b++) {
      const sA = bootstrapSample(groupA, 42 + b * 13);
      const sB = bootstrapSample(groupB, 42 + b * 13 + 7);
      bootDist.push(mean(sB) - mean(sA));
    }
    bootDist.sort((a, b) => a - b);
    const loIdx = Math.floor(0.025 * nBoot);
    const hiIdx = Math.min(Math.floor(0.975 * nBoot), nBoot - 1);
    const bootResult = { lo: bootDist[loIdx], hi: bootDist[hiIdx], dist: bootDist };

    // Permutation test for mean difference
    const permResult = permutationTest(groupA, groupB, (a, b) => mean(b) - mean(a), nBoot, 99);

    // Histograms
    const bootHist = buildHistogram(bootResult.dist, 30);
    const permHist = buildHistogram(permResult.nullDist, 30);

    // Observed statistic for permutation chart
    const observedDiff = diffMean;

    return {
      groupA,
      groupB,
      meanA,
      meanB,
      diffMean,
      sdA,
      sdB,
      paramLo,
      paramHi,
      bootResult,
      permResult,
      bootHist,
      permHist,
      observedDiff,
    };
  }, [n, nBoot, gen]);

  // ── Chart 1: Bootstrap Distribution ──
  const W = 600,
    H1 = 200,
    pl = 48,
    pr = 20,
    pt = 24,
    pb = 32;

  const bH = data.bootHist;
  const bMaxCount = Math.max(...bH.bins.map((b) => b.count), 1);
  const bToX = useCallback(
    (v: number) => pl + ((v - bH.mn) / (bH.mx - bH.mn || 1)) * (W - pl - pr),
    [bH.mn, bH.mx],
  );
  const bToY = useCallback((v: number) => H1 - pb - (v / bMaxCount) * (H1 - pt - pb), [bMaxCount]);
  const bBarW = (bH.binW / (bH.mx - bH.mn || 1)) * (W - pl - pr);

  const bootTooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < pl || vbX > W - pr) return null;
      const xVal = bH.mn + ((vbX - pl) / (W - pl - pr)) * (bH.mx - bH.mn);
      const idx = Math.max(0, Math.min(bH.bins.length - 1, Math.floor((xVal - bH.mn) / bH.binW)));
      const bin = bH.bins[idx];
      return {
        x: bToX(bin.lo + bH.binW / 2),
        y: bToY(bin.count),
        lines: [
          {
            label: 'Range',
            value: bin.lo.toFixed(2) + ' - ' + bin.hi.toFixed(2),
            color: colors.indigo,
          },
          { label: 'Count', value: String(bin.count), color: colors.indigo },
          {
            label: 'Boot CI',
            value: '[' + data.bootResult.lo.toFixed(2) + ', ' + data.bootResult.hi.toFixed(2) + ']',
            color: colors.emerald,
          },
        ],
        markers: [{ y: bToY(bin.count), color: colors.indigo }],
      };
    },
    [data.bootResult, bH, bToX, bToY],
  );

  // ── Chart 2: Permutation Null Distribution ──
  const H2 = 200;
  const pH = data.permHist;
  const pMaxCount = Math.max(...pH.bins.map((b) => b.count), 1);
  const pToX = useCallback(
    (v: number) => pl + ((v - pH.mn) / (pH.mx - pH.mn || 1)) * (W - pl - pr),
    [pH.mn, pH.mx],
  );
  const pToY = useCallback((v: number) => H2 - pb - (v / pMaxCount) * (H2 - pt - pb), [pMaxCount]);
  const pBarW = (pH.binW / (pH.mx - pH.mn || 1)) * (W - pl - pr);

  const permTooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < pl || vbX > W - pr) return null;
      const xVal = pH.mn + ((vbX - pl) / (W - pl - pr)) * (pH.mx - pH.mn);
      const idx = Math.max(0, Math.min(pH.bins.length - 1, Math.floor((xVal - pH.mn) / pH.binW)));
      const bin = pH.bins[idx];
      return {
        x: pToX(bin.lo + pH.binW / 2),
        y: pToY(bin.count),
        lines: [
          { label: 'Range', value: bin.lo.toFixed(2) + ' - ' + bin.hi.toFixed(2), color: sv.text },
          { label: 'Count', value: String(bin.count), color: sv.text },
          {
            label: 'p-value',
            value: data.permResult.pValue.toFixed(3),
            color: data.permResult.pValue < 0.05 ? colors.emerald : colors.red,
          },
        ],
        markers: [{ y: pToY(bin.count), color: sv.text }],
      };
    },
    [data.permResult, pH, pToX, pToY],
  );

  // ── Chart 3: CI Comparison ──
  const H3 = 100,
    ciPt = 16,
    ciPb = 16;
  const allCIVals = [data.paramLo, data.paramHi, data.bootResult.lo, data.bootResult.hi];
  const ciMin = Math.min(...allCIVals) - 1;
  const ciMax = Math.max(...allCIVals) + 1;
  const ciToX = useCallback(
    (v: number) => pl + ((v - ciMin) / (ciMax - ciMin || 1)) * (W - pl - pr),
    [ciMin, ciMax],
  );

  const ciRows = useMemo(
    () => [
      {
        label: 'Parametric',
        lo: data.paramLo,
        hi: data.paramHi,
        mean: data.diffMean,
        color: colors.amber,
      },
      {
        label: 'Bootstrap',
        lo: data.bootResult.lo,
        hi: data.bootResult.hi,
        mean: data.diffMean,
        color: colors.emerald,
      },
    ],
    [data.paramLo, data.paramHi, data.bootResult.lo, data.bootResult.hi, data.diffMean],
  );
  const ciRowH = useMemo(() => (H3 - ciPt - ciPb) / ciRows.length, [ciRows.length]);

  const ciTooltipLookup = useCallback(
    (vbX: number, vbY: number) => {
      if (vbX < pl || vbX > W - pr) return null;
      const xVal = ciMin + ((vbX - pl) / (W - pl - pr)) * (ciMax - ciMin);
      const rowIdx = Math.max(0, Math.min(ciRows.length - 1, Math.floor((vbY - ciPt) / ciRowH)));
      const row = ciRows[rowIdx];
      const y = ciPt + rowIdx * ciRowH + ciRowH / 2;
      return {
        x: ciToX(xVal),
        y,
        lines: [
          {
            label: row.label,
            value: '[' + row.lo.toFixed(2) + ', ' + row.hi.toFixed(2) + ']',
            color: row.color,
          },
          { label: 'Width', value: (row.hi - row.lo).toFixed(2), color: row.color },
          { label: 'Point Est.', value: row.mean.toFixed(2), color: row.color },
        ],
        markers: [{ y, color: row.color }],
      };
    },
    [ciRows, ciMin, ciMax, ciRowH, ciToX],
  );

  // ── Format helpers ──
  const pColor = data.permResult.pValue < 0.05 ? colors.emerald : colors.red;
  const bootWidth = data.bootResult.hi - data.bootResult.lo;
  const paramWidth = data.paramHi - data.paramLo;

  return (
    <div>
      <Hdr sub="Analyze">Bootstrap &amp; Permutation Tests</Hdr>
      <Desc>
        When your data is skewed, heavy-tailed, or breaks the assumptions of parametric tests,
        resampling methods let the data speak for itself. Bootstrap builds a sampling distribution
        by resampling your data with replacement. Permutation tests build a null distribution by
        shuffling group labels. Neither requires normality assumptions.
      </Desc>

      {/* Chart 1: Bootstrap Sampling Distribution */}
      <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
        Bootstrap Distribution of Mean Difference
      </div>
      <ChartBox
        h={H1}
        tooltipLookup={bootTooltipLookup}
        label="Bootstrap sampling distribution showing resampled mean differences with confidence interval bounds"
      >
        <defs>
          <linearGradient id="bootGrad-34" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity={0.7} />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity={0.25} />
          </linearGradient>
        </defs>

        {/* Histogram bars */}
        {bH.bins.map((bin, i) => (
          <rect
            key={i}
            x={bToX(bin.lo)}
            y={bToY(bin.count)}
            width={Math.max(1, bBarW - 1)}
            height={H1 - pb - bToY(bin.count)}
            fill="url(#bootGrad-34)"
            rx={1}
          />
        ))}

        {/* Bootstrap CI bounds */}
        <line
          x1={bToX(data.bootResult.lo)}
          y1={pt}
          x2={bToX(data.bootResult.lo)}
          y2={H1 - pb}
          stroke={colors.emerald}
          strokeWidth={2}
        />
        <line
          x1={bToX(data.bootResult.hi)}
          y1={pt}
          x2={bToX(data.bootResult.hi)}
          y2={H1 - pb}
          stroke={colors.emerald}
          strokeWidth={2}
        />
        <text
          x={bToX(data.bootResult.lo)}
          y={pt - 4}
          fill={colors.emerald}
          fontSize={8}
          textAnchor="middle"
        >
          {data.bootResult.lo.toFixed(2)}
        </text>
        <text
          x={bToX(data.bootResult.hi)}
          y={pt - 4}
          fill={colors.emerald}
          fontSize={8}
          textAnchor="middle"
        >
          {data.bootResult.hi.toFixed(2)}
        </text>

        {/* Observed statistic */}
        <line
          x1={bToX(data.diffMean)}
          y1={pt}
          x2={bToX(data.diffMean)}
          y2={H1 - pb}
          stroke={colors.indigo}
          strokeWidth={2}
          strokeDasharray="6,3"
        />
        <text
          x={bToX(data.diffMean) + 4}
          y={pt + 10}
          fill={colors.indigo}
          fontSize={9}
          fontWeight="700"
        >
          {'Observed = ' + data.diffMean.toFixed(2)}
        </text>

        {/* Axes */}
        <line x1={pl} y1={H1 - pb} x2={W - pr} y2={H1 - pb} stroke={sv.axis} />
        <line x1={pl} y1={pt} x2={pl} y2={H1 - pb} stroke={sv.axis} />
        <text x={W / 2} y={H1 - 4} fill={sv.textFaint} fontSize={9} textAnchor="middle">
          Mean Difference (Bootstrap Resamples)
        </text>
      </ChartBox>

      {/* Chart 2: Permutation Null Distribution */}
      <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
        Permutation Null Distribution
      </div>
      <ChartBox
        h={H2}
        tooltipLookup={permTooltipLookup}
        label="Permutation null distribution showing shuffled group differences with observed test statistic"
      >
        <defs>
          <linearGradient id="permGrad-34" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.slate400} stopOpacity={0.6} />
            <stop offset="100%" stopColor={colors.slate400} stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="permTailGrad-34" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.red} stopOpacity={0.7} />
            <stop offset="100%" stopColor={colors.red} stopOpacity={0.3} />
          </linearGradient>
        </defs>

        {/* Histogram bars with tail shading */}
        {pH.bins.map((bin, i) => {
          const midpoint = bin.lo + pH.binW / 2;
          const inTail = Math.abs(midpoint) >= Math.abs(data.observedDiff);
          return (
            <rect
              key={i}
              x={pToX(bin.lo)}
              y={pToY(bin.count)}
              width={Math.max(1, pBarW - 1)}
              height={H2 - pb - pToY(bin.count)}
              fill={inTail ? 'url(#permTailGrad-34)' : 'url(#permGrad-34)'}
              rx={1}
            />
          );
        })}

        {/* Observed test statistic */}
        <line
          x1={pToX(data.observedDiff)}
          y1={pt}
          x2={pToX(data.observedDiff)}
          y2={H2 - pb}
          stroke={colors.red}
          strokeWidth={2}
        />
        <text
          x={pToX(data.observedDiff) + 4}
          y={pt + 10}
          fill={colors.red}
          fontSize={9}
          fontWeight="700"
        >
          {'Observed = ' + data.observedDiff.toFixed(2)}
        </text>

        {/* p-value annotation */}
        <text
          x={W - pr - 4}
          y={pt + 10}
          fill={pColor}
          fontSize={10}
          textAnchor="end"
          fontWeight="700"
        >
          {'p = ' + data.permResult.pValue.toFixed(3)}
        </text>

        {/* Axes */}
        <line x1={pl} y1={H2 - pb} x2={W - pr} y2={H2 - pb} stroke={sv.axis} />
        <line x1={pl} y1={pt} x2={pl} y2={H2 - pb} stroke={sv.axis} />
        <text x={W / 2} y={H2 - 4} fill={sv.textFaint} fontSize={9} textAnchor="middle">
          Mean Difference (Permutation Null)
        </text>

        {/* Legend */}
        <rect x={pl + 8} y={pt - 2} width={10} height={10} fill={colors.red} opacity={0.5} rx={2} />
        <text x={pl + 22} y={pt + 7} fill={colors.red} fontSize={8}>
          Tail (p-value region)
        </text>
      </ChartBox>

      {/* Chart 3: CI Comparison */}
      <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
        Confidence Interval Comparison
      </div>
      <ChartBox
        h={H3}
        tooltipLookup={ciTooltipLookup}
        label="Side-by-side comparison of parametric and bootstrap confidence intervals"
      >
        {/* Zero line */}
        {ciMin < 0 && ciMax > 0 && (
          <line
            x1={ciToX(0)}
            y1={ciPt}
            x2={ciToX(0)}
            y2={H3 - ciPb}
            stroke={sv.axis}
            strokeWidth={1}
            strokeDasharray="4,3"
            opacity={0.5}
          />
        )}

        {ciRows.map((row, i) => {
          const y = ciPt + i * ciRowH + ciRowH / 2;
          return (
            <g key={row.label}>
              {/* CI bar */}
              <line
                x1={ciToX(row.lo)}
                y1={y}
                x2={ciToX(row.hi)}
                y2={y}
                stroke={row.color}
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.7}
              />
              {/* Point estimate */}
              <circle cx={ciToX(row.mean)} cy={y} r={4} fill={row.color} />
              {/* Label */}
              <text
                x={pl - 6}
                y={y + 4}
                fill={row.color}
                fontSize={9}
                textAnchor="end"
                fontWeight="600"
              >
                {row.label}
              </text>
            </g>
          );
        })}

        {/* Axis */}
        <line x1={pl} y1={H3 - ciPb} x2={W - pr} y2={H3 - ciPb} stroke={sv.axis} />
      </ChartBox>

      {/* StatBoxes */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="Bootstrap CI"
          value={'[' + data.bootResult.lo.toFixed(2) + ', ' + data.bootResult.hi.toFixed(2) + ']'}
          color={colors.emerald}
        />
        <StatBox label="Permutation p" value={data.permResult.pValue.toFixed(3)} color={pColor} />
        <StatBox
          label="Parametric CI"
          value={'[' + data.paramLo.toFixed(2) + ', ' + data.paramHi.toFixed(2) + ']'}
          color={colors.amber}
        />
        <StatBox
          label="CI Width"
          value={'P: ' + paramWidth.toFixed(2) + ' | B: ' + bootWidth.toFixed(2)}
          color={colors.indigo}
        />
      </div>

      {/* Sliders */}
      <Sl
        label="Sample Size"
        value={sampleSize as number}
        min={10}
        max={200}
        step={5}
        onChange={setSampleSize}
        fmt={(v) => String(Math.round(v))}
        color={colors.indigo}
      />
      <Sl
        label="Number of Resamples"
        value={nResamples as number}
        min={100}
        max={2000}
        step={100}
        onChange={setNResamples}
        fmt={(v) => String(Math.round(v))}
        color={colors.emerald}
      />

      {/* Distribution PillBtns */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {distKeys.map((k) => (
          <PillBtn key={k} on={dk === k} onClick={() => setDistKey(k)}>
            {dists[k].label}
          </PillBtn>
        ))}
      </div>

      <QA
        items={[
          {
            q: 'When should I use bootstrap vs permutation tests?',
            a: 'Use bootstrap when you want a confidence interval for any statistic (mean, median, ratio, custom metric). Use permutation tests when you want a p-value for a hypothesis test comparing two groups. Bootstrap makes no assumption about the null hypothesis; permutation tests require exchangeability under the null.',
          },
          {
            q: 'How many resamples do I need?',
            a: 'For bootstrap CIs, 1,000-10,000 resamples is standard. For permutation p-values, you need enough to estimate the tail probability \u2014 if you want p = 0.001 precision, you need at least 10,000 permutations. More resamples reduce Monte Carlo error but increase computation time.',
          },
        ]}
      />
      <TechNote>
        The percentile bootstrap CI takes the {'\u03B1'}/2 and 1{'\u2212'}
        {'\u03B1'}/2 quantiles of the bootstrap distribution. This is the simplest method; BCa
        (bias-corrected and accelerated) bootstrap provides better coverage for skewed
        distributions. The permutation test is exact under exchangeability {'\u2014'} it controls
        Type I error at exactly {'\u03B1'} regardless of the data distribution.
      </TechNote>
      <Insight>
        Notice how the bootstrap CI and parametric CI differ most for skewed and heavy-tailed
        distributions. When the central limit theorem has not yet kicked in (small n, non-normal
        data), the parametric CI can be misleadingly narrow. The bootstrap adapts to the actual
        shape of your data.
      </Insight>
    </div>
  );
}
