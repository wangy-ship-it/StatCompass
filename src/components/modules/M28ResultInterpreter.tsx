import { useMemo, useCallback } from 'react';
import { nPDF, nCDF, zInv, sePropDiff } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const presets = [
  { label: 'Significant +', controlRate: 5.0, treatmentRate: 5.8, sampleSize: 50000 },
  { label: 'Significant \u2212', controlRate: 5.0, treatmentRate: 4.2, sampleSize: 50000 },
  { label: 'Inconclusive', controlRate: 5.0, treatmentRate: 5.3, sampleSize: 8000 },
  { label: 'Flat', controlRate: 5.0, treatmentRate: 5.02, sampleSize: 100000 },
];

const paramDefaults = { controlRate: 5.0, treatmentRate: 5.8, sampleSize: 50000 };

export default function M19ResultInterpreter() {
  const [p, set] = useAnimatedParams(paramDefaults);
  const { controlRate, treatmentRate, sampleSize } = p;
  const setControlRate = (v: number) => set('controlRate', v);
  const setTreatmentRate = (v: number) => set('treatmentRate', v);
  const setSampleSize = (v: number) => set('sampleSize', v);

  // ── Derived statistics ──
  const stats = useMemo(() => {
    const pC = controlRate / 100;
    const pT = treatmentRate / 100;
    const n = sampleSize;

    // Standard error of difference in proportions
    const se = sePropDiff(pC, pT, n);

    // Z-statistic and two-sided p-value
    const zStat = se > 0 ? (pT - pC) / se : 0;
    const pValue = 2 * (1 - nCDF(Math.abs(zStat), 0, 1));

    // Direction and relative lift
    const absLift = treatmentRate - controlRate;
    const relLift = controlRate > 0 ? ((treatmentRate - controlRate) / controlRate) * 100 : 0;

    const direction = Math.abs(relLift) < 0.5 ? 'Flat' : absLift > 0 ? 'Positive' : 'Negative';

    // Power: probability of detecting the observed effect at alpha=0.05
    const zAlpha = zInv(0.05);
    const power = se > 0 ? 1 - nCDF(zAlpha - Math.abs(pT - pC) / se, 0, 1) : 0;

    // Recommendation logic
    let recText: string, recColor: string, recBorderVar: string, recBgVar: string;
    if (pValue < 0.05 && treatmentRate > controlRate) {
      recText =
        'Ship it \u2014 statistically significant improvement. Monitor guardrail metrics post-launch.';
      recColor = colors.emerald;
      recBorderVar = sv.borderEmerald;
      recBgVar = sv.fillEmeraldSubtle;
    } else if (pValue < 0.05 && treatmentRate < controlRate) {
      recText = 'Revert \u2014 statistically significant regression. Investigate root cause.';
      recColor = colors.red;
      recBorderVar = sv.borderRed;
      recBgVar = sv.fillRedSubtle;
    } else if (pValue >= 0.05 && Math.abs(relLift) < 1) {
      recText =
        'No meaningful difference \u2014 decide based on other factors like simplicity or maintenance cost.';
      recColor = sv.textFaint;
      recBorderVar = 'var(--color-border-subtle)';
      recBgVar = 'var(--color-app-glass)';
    } else {
      recText =
        'Inconclusive \u2014 extend the test or accept uncertainty. The sample may be too small to detect this effect size.';
      recColor = colors.amber;
      recBorderVar = sv.borderAmber;
      recBgVar = sv.fillAmberSubtle;
    }

    return {
      se,
      zStat,
      pValue,
      absLift,
      relLift,
      direction,
      power,
      recText,
      recColor,
      recBorderVar,
      recBgVar,
    };
  }, [controlRate, treatmentRate, sampleSize]);

  // ── Chart geometry ──
  const chart = useMemo(() => {
    const se = stats.se;

    // Std in percentage space for drawing curves centered at controlRate / treatmentRate
    const std = se * 100;
    const safeStd = Math.max(std, 0.01);

    const W = 600,
      H = 240,
      pl = 36,
      pr = 36,
      pt = 16,
      pb = 34;
    const xMin = Math.min(controlRate, treatmentRate) - 4 * safeStd;
    const xMax = Math.max(controlRate, treatmentRate) + 4 * safeStd;
    const toX = (v: number) => pl + ((v - xMin) / (xMax - xMin)) * (W - pl - pr);

    const steps = 220;
    const dx = (xMax - xMin) / steps;

    // Find max Y for scaling
    let mxY = 0;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      mxY = Math.max(mxY, nPDF(x, controlRate, safeStd), nPDF(x, treatmentRate, safeStd));
    }
    const toY = (v: number) => H - pb - (v / mxY) * (H - pt - pb);

    // Build curve paths and shaded overlap area
    let pathC = '',
      pathT = '';
    let areaC = '',
      areaT = '';
    let overlapPath = '';
    const overlapPts = [];

    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      const sx = toX(x);
      const yC = nPDF(x, controlRate, safeStd);
      const yT = nPDF(x, treatmentRate, safeStd);
      const cmd = i === 0 ? 'M' : 'L';

      pathC += cmd + sx + ',' + toY(yC);
      pathT += cmd + sx + ',' + toY(yT);

      if (i === 0) {
        areaC = 'M' + sx + ',' + toY(0);
        areaT = 'M' + sx + ',' + toY(0);
      }
      areaC += 'L' + sx + ',' + toY(yC);
      areaT += 'L' + sx + ',' + toY(yT);

      // Overlap = min of both densities
      const oY = Math.min(yC, yT);
      overlapPts.push({ x: sx, y: toY(oY), b: toY(0) });
    }
    areaC += 'L' + toX(xMax) + ',' + toY(0) + 'Z';
    areaT += 'L' + toX(xMax) + ',' + toY(0) + 'Z';

    // Build overlap fill path
    if (overlapPts.length > 1) {
      overlapPath = 'M' + overlapPts[0].x + ',' + overlapPts[0].b;
      overlapPts.forEach((op) => (overlapPath += 'L' + op.x + ',' + op.y));
      overlapPath +=
        'L' + overlapPts[overlapPts.length - 1].x + ',' + overlapPts[overlapPts.length - 1].b + 'Z';
    }

    // Axis tick marks (nice round numbers)
    const ticks = [];
    const range = xMax - xMin;
    // Choose tick interval: aim for ~5-8 ticks
    let interval = 0.1;
    if (range > 2) interval = 0.5;
    if (range > 5) interval = 1;
    if (range > 10) interval = 2;
    if (range > 20) interval = 5;
    const firstTick = Math.ceil(xMin / interval) * interval;
    for (let t = firstTick; t <= xMax; t += interval) {
      ticks.push({ x: toX(t), label: t.toFixed(interval < 1 ? 1 : 0) });
    }

    return {
      pathC,
      pathT,
      areaC,
      areaT,
      overlapPath,
      toX,
      toY,
      W,
      H,
      pl,
      pr,
      pt,
      pb,
      ticks,
    };
  }, [controlRate, treatmentRate, stats.se]);

  const tooltipLookup = useCallback(
    (vbX: number) => {
      const W = 600,
        pl = 36,
        pr = 36,
        pt = 16,
        pb = 34,
        H = 240;
      if (vbX < pl || vbX > W - pr) return null;
      const se = sePropDiff(controlRate / 100, treatmentRate / 100, sampleSize) * 100;
      const safeStd = Math.max(se, 0.01);
      const xMin = Math.min(controlRate, treatmentRate) - 4 * safeStd;
      const xMax = Math.max(controlRate, treatmentRate) + 4 * safeStd;
      const xVal = xMin + ((vbX - pl) / (W - pl - pr)) * (xMax - xMin);
      const yC = nPDF(xVal, controlRate, safeStd);
      const yT = nPDF(xVal, treatmentRate, safeStd);
      let mxY = 0;
      for (let i = 0; i <= 220; i++) {
        const x = xMin + i * ((xMax - xMin) / 220);
        mxY = Math.max(mxY, nPDF(x, controlRate, safeStd), nPDF(x, treatmentRate, safeStd));
      }
      const toSvgX = (v: number) => pl + ((v - xMin) / (xMax - xMin)) * (W - pl - pr);
      const toSvgY = (v: number) => H - pb - (v / mxY) * (H - pt - pb);
      return {
        x: toSvgX(xVal),
        y: Math.min(toSvgY(yC), toSvgY(yT)),
        lines: [
          { label: 'Rate', value: xVal.toFixed(2) + '%', color: colors.amber },
          { label: 'Control', value: yC.toFixed(4), color: colors.indigo },
          { label: 'Treatment', value: yT.toFixed(4), color: colors.emerald },
        ],
        markers: [
          { y: toSvgY(yC), color: colors.indigo },
          { y: toSvgY(yT), color: colors.emerald },
        ],
      };
    },
    [controlRate, treatmentRate, sampleSize],
  );

  // ── Active preset detection ──
  const activePreset = presets.findIndex(
    (pr) =>
      pr.controlRate === controlRate &&
      pr.treatmentRate === treatmentRate &&
      pr.sampleSize === sampleSize,
  );

  const applyPreset = (pr: { controlRate: number; treatmentRate: number; sampleSize: number }) => {
    setControlRate(pr.controlRate);
    setTreatmentRate(pr.treatmentRate);
    setSampleSize(pr.sampleSize);
  };

  return (
    <div>
      <Hdr sub="Interpret & Decide">Result Interpreter & Recommendations</Hdr>
      <Desc>
        After running an experiment, you need to interpret the results and decide what to do. Drag
        the sliders to explore how control rate, treatment rate, and sample size interact to shape
        your conclusion — or pick a preset scenario to jump to a classic outcome.
      </Desc>

      {/* ── Preset pills ── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {presets.map((pr, i) => (
          <PillBtn key={pr.label} on={activePreset === i} onClick={() => applyPreset(pr)}>
            {pr.label}
          </PillBtn>
        ))}
      </div>

      {/* ── Sliders ── */}
      <Sl
        label="Control Conversion Rate"
        value={controlRate}
        min={1}
        max={20}
        step={0.1}
        onChange={setControlRate}
        fmt={(v) => v.toFixed(1) + '%'}
        color={colors.indigo}
      />
      <Sl
        label="Treatment Conversion Rate"
        value={treatmentRate}
        min={1}
        max={20}
        step={0.1}
        onChange={setTreatmentRate}
        fmt={(v) => v.toFixed(1) + '%'}
        color={colors.emerald}
      />
      <Sl
        label="Sample Size (per group)"
        value={sampleSize}
        min={1000}
        max={200000}
        step={1000}
        onChange={setSampleSize}
        fmt={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : String(v))}
        color={sv.textFaint}
      />

      {/* ── Overlapping distributions chart ── */}
      <ChartBox
        h={chart.H}
        tooltipLookup={tooltipLookup}
        label="Experiment result visualization showing confidence interval, point estimate, and significance assessment"
      >
        <defs>
          <linearGradient id="grad-ctrl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.28" />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="grad-treat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.03" />
          </linearGradient>
          <pattern
            id="hatch-overlap"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={colors.indigo}
              strokeWidth="1.2"
              opacity="0.25"
            />
          </pattern>
        </defs>
        {/* Shaded fills */}
        <path d={chart.areaC} fill="url(#grad-ctrl)" />
        <path d={chart.areaT} fill="url(#grad-treat)" />
        <path d={chart.overlapPath} fill={sv.fillOverlap} />
        <path d={chart.overlapPath} fill="url(#hatch-overlap)" />

        {/* Curve strokes */}
        <path d={chart.pathC} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
        <path d={chart.pathT} fill="none" stroke={colors.emerald} strokeWidth={2.5} />

        {/* Mean dashed lines */}
        <line
          x1={chart.toX(controlRate)}
          y1={chart.pt}
          x2={chart.toX(controlRate)}
          y2={chart.H - chart.pb}
          stroke={colors.indigo}
          strokeWidth={1.5}
          strokeDasharray="5,3"
        />
        <line
          x1={chart.toX(treatmentRate)}
          y1={chart.pt}
          x2={chart.toX(treatmentRate)}
          y2={chart.H - chart.pb}
          stroke={colors.emerald}
          strokeWidth={1.5}
          strokeDasharray="5,3"
        />

        {/* Mean labels */}
        <text
          x={chart.toX(controlRate)}
          y={12}
          fill={colors.indigo}
          fontSize={9}
          textAnchor="middle"
          fontWeight="600"
        >
          {'Control: ' + controlRate.toFixed(1) + '%'}
        </text>
        <text
          x={chart.toX(treatmentRate)}
          y={12}
          fill={colors.emerald}
          fontSize={9}
          textAnchor="middle"
          fontWeight="600"
        >
          {'Treatment: ' + treatmentRate.toFixed(1) + '%'}
        </text>

        {/* X-axis */}
        <line
          x1={chart.pl}
          y1={chart.H - chart.pb}
          x2={chart.W - chart.pr}
          y2={chart.H - chart.pb}
          stroke={sv.axis}
        />

        {/* Tick marks */}
        {chart.ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.x}
              y1={chart.H - chart.pb}
              x2={t.x}
              y2={chart.H - chart.pb + 4}
              stroke={sv.axis}
            />
            <text
              x={t.x}
              y={chart.H - chart.pb + 14}
              fill={sv.text}
              fontSize={8}
              textAnchor="middle"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Axis label */}
        <text x={chart.W / 2} y={chart.H - 2} fill={sv.text} fontSize={9} textAnchor="middle">
          Conversion Rate (%)
        </text>
      </ChartBox>

      {/* ── Stat boxes ── */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="Direction"
          value={stats.direction}
          color={
            stats.direction === 'Positive'
              ? colors.emerald
              : stats.direction === 'Negative'
                ? colors.red
                : sv.textFaint
          }
        />
        <StatBox
          label="Relative Lift"
          value={(stats.relLift >= 0 ? '+' : '') + stats.relLift.toFixed(1) + '%'}
          color={
            stats.pValue < 0.05 && stats.relLift > 0
              ? colors.emerald
              : stats.pValue < 0.05 && stats.relLift < 0
                ? colors.red
                : sv.textFaint
          }
        />
        <StatBox
          label="P-value"
          value={stats.pValue < 0.001 ? '<0.001' : stats.pValue.toFixed(3)}
          color={stats.pValue < 0.05 ? colors.emerald : sv.textFaint}
        />
        <StatBox
          label="Power"
          value={(stats.power * 100).toFixed(0) + '%'}
          color={
            stats.power >= 0.8 ? colors.emerald : stats.power >= 0.5 ? colors.amber : sv.textFaint
          }
        />
      </div>

      {/* ── Recommendation ── */}
      <div
        className="rounded-xl p-5 mb-5 transition-all duration-300"
        style={{ background: stats.recBgVar, border: '1px solid ' + stats.recBorderVar }}
      >
        <div
          className="text-[11px] uppercase tracking-widest mb-2 font-bold transition-colors duration-300"
          style={{ color: stats.recColor }}
        >
          Recommendation
        </div>
        <div className="text-sm text-[var(--color-text-primary)] leading-relaxed">
          {stats.recText}
        </div>
      </div>

      {/* ── Q&A ── */}
      <QA
        items={[
          {
            q: "It's positive but not significant \u2014 can we ship anyway?",
            a: "You can, but know the risk. A non-significant positive result means the data is consistent with both 'real improvement' and 'no effect.' If the downside is low and you have other supporting evidence, a judgment call is reasonable. But don't claim the data proved it works.",
          },
          {
            q: 'We got inconclusive results \u2014 was the test a waste?',
            a: "No. An inconclusive result is still informative \u2014 it tells you the effect (if any) is smaller than your test could detect. This is useful for prioritization: maybe this change isn't worth optimizing further, or maybe you need a bigger test.",
          },
        ]}
      />
      <TechNote>
        Always pair statistical significance with practical significance. A p-value of 0.001 on a
        0.01pp lift is statistically significant but practically meaningless. Consider the minimum
        effect size that would justify the cost of implementation.
      </TechNote>
      <Insight>
        The goal of an experiment isn't just to get a p-value — it's to make a better decision. Even
        "failed" experiments are valuable because they reduce uncertainty and prevent bad launches.
        The best teams learn as much from inconclusive results as from clear wins.
      </Insight>
    </div>
  );
}
