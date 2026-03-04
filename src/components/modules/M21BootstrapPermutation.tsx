import { useMemo, useCallback } from 'react';
import { buildHistogramFixed } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import {
  Hdr,
  Desc,
  ChartBox,
  Sl,
  PillBtn,
  StatBox,
  QA,
  TechNote,
  Insight,
  SimControls,
} from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';
import useBootstrapSim from '../../hooks/useBootstrapSim';

const distLabels: Record<string, string> = {
  normal: 'Normal',
  skewed: 'Right-skewed',
  bimodal: 'Bimodal',
  heavy: 'Heavy-tailed',
};
const distKeys = Object.keys(distLabels);

const defaults = { distKey: 'skewed', sampleSize: 50, nResamples: 500, speed: 50 };

export default function M34BootstrapPermutation() {
  const [p, set] = useAnimatedParams(defaults);
  const { distKey, sampleSize, nResamples, speed } = p;
  const dk = distKey as string;

  const n = Math.round(sampleSize as number);
  const nBoot = Math.round(nResamples as number);
  const spd = Math.round(speed as number);

  const sim = useBootstrapSim(dk, n, nBoot, spd);
  const s = sim.state;

  // ── Build histograms from sim state ──
  const bootHist = useMemo(
    () =>
      s.bootDist.length > 0
        ? buildHistogramFixed(s.bootDist, 30, s.bootBinRange[0], s.bootBinRange[1])
        : {
            bins: [],
            mn: s.bootBinRange[0],
            mx: s.bootBinRange[1],
            binW: (s.bootBinRange[1] - s.bootBinRange[0]) / 30,
          },
    [s.bootDist, s.bootBinRange],
  );

  const permHist = useMemo(
    () =>
      s.permDist.length > 0
        ? buildHistogramFixed(s.permDist, 30, s.permBinRange[0], s.permBinRange[1])
        : {
            bins: [],
            mn: s.permBinRange[0],
            mx: s.permBinRange[1],
            binW: (s.permBinRange[1] - s.permBinRange[0]) / 30,
          },
    [s.permDist, s.permBinRange],
  );

  // ── Chart 1: Bootstrap Distribution ──
  const W = 600,
    H1 = 200,
    pl = 48,
    pr = 20,
    pt = 24,
    pb = 32;

  const bH = bootHist;
  const bMaxCount = Math.max(...(bH.bins.length > 0 ? bH.bins.map((b) => b.count) : [1]), 1);
  const bToX = useCallback(
    (v: number) => pl + ((v - bH.mn) / (bH.mx - bH.mn || 1)) * (W - pl - pr),
    [bH.mn, bH.mx],
  );
  const bToY = useCallback((v: number) => H1 - pb - (v / bMaxCount) * (H1 - pt - pb), [bMaxCount]);
  const bBarW = (bH.binW / (bH.mx - bH.mn || 1)) * (W - pl - pr);

  const bootTooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < pl || vbX > W - pr || bH.bins.length === 0) return null;
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
            value:
              s.bootDist.length > 0
                ? '[' + s.bootLo.toFixed(2) + ', ' + s.bootHi.toFixed(2) + ']'
                : '\u2014',
            color: colors.emerald,
          },
        ],
        markers: [{ y: bToY(bin.count), color: colors.indigo }],
      };
    },
    [s.bootDist.length, s.bootLo, s.bootHi, bH, bToX, bToY],
  );

  // ── Chart 2: Permutation Null Distribution ──
  const H2 = 200;
  const pH = permHist;
  const pMaxCount = Math.max(...(pH.bins.length > 0 ? pH.bins.map((b) => b.count) : [1]), 1);
  const pToX = useCallback(
    (v: number) => pl + ((v - pH.mn) / (pH.mx - pH.mn || 1)) * (W - pl - pr),
    [pH.mn, pH.mx],
  );
  const pToY = useCallback((v: number) => H2 - pb - (v / pMaxCount) * (H2 - pt - pb), [pMaxCount]);
  const pBarW = (pH.binW / (pH.mx - pH.mn || 1)) * (W - pl - pr);

  const permTooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < pl || vbX > W - pr || pH.bins.length === 0) return null;
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
            value: s.permDist.length > 0 ? s.permPValue.toFixed(3) : '\u2014',
            color: s.permPValue < 0.05 ? colors.emerald : colors.red,
          },
        ],
        markers: [{ y: pToY(bin.count), color: sv.text }],
      };
    },
    [s.permPValue, s.permDist.length, pH, pToX, pToY],
  );

  // ── Chart 3: CI Comparison ──
  const H3 = 100,
    ciPt = 16,
    ciPb = 16;
  const hasBoot = s.bootDist.length > 0;
  const allCIVals = [
    s.paramLo,
    s.paramHi,
    ...(hasBoot ? [s.bootLo, s.bootHi] : [s.paramLo, s.paramHi]),
  ];
  const ciMin = Math.min(...allCIVals) - 1;
  const ciMax = Math.max(...allCIVals) + 1;
  const ciToX = useCallback(
    (v: number) => pl + ((v - ciMin) / (ciMax - ciMin || 1)) * (W - pl - pr),
    [ciMin, ciMax],
  );

  const ciRows = useMemo(
    () => [
      { label: 'Parametric', lo: s.paramLo, hi: s.paramHi, mean: s.diffMean, color: colors.amber },
      {
        label: 'Bootstrap',
        lo: hasBoot ? s.bootLo : s.diffMean,
        hi: hasBoot ? s.bootHi : s.diffMean,
        mean: s.diffMean,
        color: colors.emerald,
      },
    ],
    [s.paramLo, s.paramHi, s.bootLo, s.bootHi, s.diffMean, hasBoot],
  );
  const ciRowH = useMemo(() => (H3 - ciPt - ciPb) / ciRows.length, [ciRows.length]);

  const ciTooltipLookup = useCallback(
    (vbX: number, vbY: number) => {
      if (vbX < pl || vbX > W - pr) return null;
      const rowIdx = Math.max(0, Math.min(ciRows.length - 1, Math.floor((vbY - ciPt) / ciRowH)));
      const row = ciRows[rowIdx];
      const y = ciPt + rowIdx * ciRowH + ciRowH / 2;
      return {
        x: vbX,
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
    [ciRows, ciRowH],
  );

  // ── Format helpers ──
  const pColor = s.permPValue < 0.05 ? colors.emerald : colors.red;
  const bootWidth = hasBoot ? s.bootHi - s.bootLo : 0;
  const paramWidth = s.paramHi - s.paramLo;

  const progress = s.bootStep + ' / ' + nBoot;

  return (
    <div>
      <Hdr sub="Analyze">Bootstrap &amp; Permutation Tests</Hdr>
      <Desc>
        When your data is skewed, heavy-tailed, or breaks the assumptions of parametric tests,
        resampling methods let the data speak for itself. Bootstrap builds a sampling distribution
        by resampling your data with replacement. Permutation tests build a null distribution by
        shuffling group labels. Neither requires normality assumptions.
      </Desc>

      {/* Distribution PillBtns */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {distKeys.map((k) => (
          <PillBtn key={k} on={dk === k} onClick={() => set('distKey', k)}>
            {distLabels[k]}
          </PillBtn>
        ))}
      </div>

      {/* Simulation Controls */}
      <SimControls
        running={s.running}
        onPlay={sim.start}
        onPause={sim.pause}
        onStep={sim.stepOnce}
        onReset={sim.reset}
        progress={progress}
      />

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
          <linearGradient id="bootGrad-21" x1="0" y1="0" x2="0" y2="1">
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
            fill="url(#bootGrad-21)"
            rx={1}
          />
        ))}

        {/* Bootstrap CI bounds */}
        {hasBoot && (
          <>
            <line
              x1={bToX(s.bootLo)}
              y1={pt}
              x2={bToX(s.bootLo)}
              y2={H1 - pb}
              stroke={colors.emerald}
              strokeWidth={2}
            />
            <line
              x1={bToX(s.bootHi)}
              y1={pt}
              x2={bToX(s.bootHi)}
              y2={H1 - pb}
              stroke={colors.emerald}
              strokeWidth={2}
            />
            <text
              x={bToX(s.bootLo)}
              y={pt - 4}
              fill={colors.emerald}
              fontSize={8}
              textAnchor="middle"
            >
              {s.bootLo.toFixed(2)}
            </text>
            <text
              x={bToX(s.bootHi)}
              y={pt - 4}
              fill={colors.emerald}
              fontSize={8}
              textAnchor="middle"
            >
              {s.bootHi.toFixed(2)}
            </text>
          </>
        )}

        {/* Observed statistic */}
        <line
          x1={bToX(s.diffMean)}
          y1={pt}
          x2={bToX(s.diffMean)}
          y2={H1 - pb}
          stroke={colors.indigo}
          strokeWidth={2}
          strokeDasharray="6,3"
        />
        <text
          x={bToX(s.diffMean) + 4}
          y={pt + 10}
          fill={colors.indigo}
          fontSize={9}
          fontWeight="700"
        >
          {'Observed = ' + s.diffMean.toFixed(2)}
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
          <linearGradient id="permGrad-21" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.slate400} stopOpacity={0.6} />
            <stop offset="100%" stopColor={colors.slate400} stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="permTailGrad-21" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.red} stopOpacity={0.7} />
            <stop offset="100%" stopColor={colors.red} stopOpacity={0.3} />
          </linearGradient>
        </defs>

        {/* Histogram bars with tail shading */}
        {pH.bins.map((bin, i) => {
          const midpoint = bin.lo + pH.binW / 2;
          const inTail = Math.abs(midpoint) >= Math.abs(s.observedDiff);
          return (
            <rect
              key={i}
              x={pToX(bin.lo)}
              y={pToY(bin.count)}
              width={Math.max(1, pBarW - 1)}
              height={H2 - pb - pToY(bin.count)}
              fill={inTail ? 'url(#permTailGrad-21)' : 'url(#permGrad-21)'}
              rx={1}
            />
          );
        })}

        {/* Observed test statistic */}
        <line
          x1={pToX(s.observedDiff)}
          y1={pt}
          x2={pToX(s.observedDiff)}
          y2={H2 - pb}
          stroke={colors.red}
          strokeWidth={2}
        />
        <text
          x={pToX(s.observedDiff) + 4}
          y={pt + 10}
          fill={colors.red}
          fontSize={9}
          fontWeight="700"
        >
          {'Observed = ' + s.observedDiff.toFixed(2)}
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
          {s.permDist.length > 0 ? 'p = ' + s.permPValue.toFixed(3) : ''}
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
              <circle cx={ciToX(row.mean)} cy={y} r={4} fill={row.color} />
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
          value={hasBoot ? '[' + s.bootLo.toFixed(2) + ', ' + s.bootHi.toFixed(2) + ']' : '\u2014'}
          color={colors.emerald}
        />
        <StatBox
          label="Permutation p"
          value={s.permDist.length > 0 ? s.permPValue.toFixed(3) : '\u2014'}
          color={pColor}
        />
        <StatBox
          label="Parametric CI"
          value={'[' + s.paramLo.toFixed(2) + ', ' + s.paramHi.toFixed(2) + ']'}
          color={colors.amber}
        />
        <StatBox
          label="CI Width"
          value={
            hasBoot
              ? 'P: ' + paramWidth.toFixed(2) + ' | B: ' + bootWidth.toFixed(2)
              : 'P: ' + paramWidth.toFixed(2)
          }
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
        onChange={(v) => set('sampleSize', v)}
        fmt={(v) => String(Math.round(v))}
        color={colors.indigo}
      />
      <Sl
        label="Number of Resamples"
        value={nResamples as number}
        min={100}
        max={2000}
        step={100}
        onChange={(v) => set('nResamples', v)}
        fmt={(v) => String(Math.round(v))}
        color={colors.emerald}
      />
      <Sl
        label="Simulation Speed"
        value={speed as number}
        min={10}
        max={100}
        step={10}
        onChange={(v) => set('speed', v)}
        color={colors.amber}
      />

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
