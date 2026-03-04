import { useMemo, useCallback } from 'react';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const defaults = { slope: 1.0, effect: 3.0, treatTime: 5, groupGap: 2.0 };

export default function M37DifferenceInDifferences() {
  const [p, set] = useAnimatedParams(defaults);
  const setSlope = (v: number) => set('slope', v);
  const setEffect = (v: number) => set('effect', v);
  const setTreatTime = (v: number) => set('treatTime', v);
  const setGroupGap = (v: number) => set('groupGap', v);

  const d = useMemo(() => {
    const W = 600,
      H = 280,
      pl = 48,
      pr = 36,
      pt = 24,
      pb = 38;

    const nPeriods = 10;
    const treatStart = Math.round(p.treatTime);

    // Build data points for each group across 10 periods
    const controlPts: { t: number; y: number }[] = [];
    const treatPts: { t: number; y: number }[] = [];
    const cfPts: { t: number; y: number }[] = []; // counterfactual

    const controlBase = 10 + p.groupGap;
    const treatBase = 10;

    for (let t = 1; t <= nPeriods; t++) {
      const controlY = controlBase + p.slope * (t - 1);
      controlPts.push({ t, y: controlY });

      if (t < treatStart) {
        // Pre-treatment: both follow same slope
        const treatY = treatBase + p.slope * (t - 1);
        treatPts.push({ t, y: treatY });
        cfPts.push({ t, y: treatY });
      } else {
        // Post-treatment
        const cfY = treatBase + p.slope * (t - 1);
        const treatY = cfY + p.effect;
        treatPts.push({ t, y: treatY });
        cfPts.push({ t, y: cfY });
      }
    }

    // Compute y range with padding
    const allY = [
      ...controlPts.map((p) => p.y),
      ...treatPts.map((p) => p.y),
      ...cfPts.map((p) => p.y),
    ];
    const yMin = Math.min(...allY) - 2;
    const yMax = Math.max(...allY) + 2;

    const tX = (t: number) => pl + ((t - 1) / (nPeriods - 1)) * (W - pl - pr);
    const tY = (y: number) => H - pb - ((y - yMin) / (yMax - yMin)) * (H - pt - pb);

    // Build SVG paths
    const buildPath = (pts: { t: number; y: number }[]) =>
      pts
        .map((p, i) => (i === 0 ? 'M' : 'L') + tX(p.t).toFixed(1) + ',' + tY(p.y).toFixed(1))
        .join('');

    const controlPath = buildPath(controlPts);
    const treatPath = buildPath(treatPts);

    // Counterfactual: only draw from treatStart onward (dashed)
    const cfPostPts = cfPts.filter((p) => p.t >= treatStart);
    const cfPath = buildPath(cfPostPts);

    // Pre-treatment portion of treatment line (for connecting to counterfactual)
    const treatPrePts = treatPts.filter((p) => p.t < treatStart);
    const cfFullPath =
      treatPrePts.length > 0
        ? buildPath(treatPrePts) +
          cfPostPts.map((p) => 'L' + tX(p.t).toFixed(1) + ',' + tY(p.y).toFixed(1)).join('')
        : cfPath;
    // We only use cfPath for the dashed portion

    // Shaded area between actual treatment and counterfactual (post-treatment)
    const postTreatPts = treatPts.filter((p) => p.t >= treatStart);
    let shadePath = '';
    if (postTreatPts.length > 0 && cfPostPts.length > 0) {
      // Top edge: actual treatment line (left to right)
      shadePath = postTreatPts
        .map((p, i) => (i === 0 ? 'M' : 'L') + tX(p.t).toFixed(1) + ',' + tY(p.y).toFixed(1))
        .join('');
      // Bottom edge: counterfactual line (right to left)
      for (let i = cfPostPts.length - 1; i >= 0; i--) {
        shadePath += 'L' + tX(cfPostPts[i].t).toFixed(1) + ',' + tY(cfPostPts[i].y).toFixed(1);
      }
      shadePath += 'Z';
    }

    // Treatment vertical line x position
    const treatLineX = tX(treatStart);

    // Axis ticks
    const xTicks = Array.from({ length: nPeriods }, (_, i) => i + 1);
    const yRange = yMax - yMin;
    const yStep = yRange < 10 ? 2 : yRange < 20 ? 4 : 5;
    const yTickMin = Math.ceil(yMin / yStep) * yStep;
    const yTicks: number[] = [];
    for (let v = yTickMin; v <= yMax; v += yStep) {
      yTicks.push(v);
    }

    // DiD computation
    const preTreatControl = controlPts.filter((p) => p.t < treatStart);
    const postTreatControl = controlPts.filter((p) => p.t >= treatStart);
    const preTreatTreat = treatPts.filter((p) => p.t < treatStart);
    const postTreatTreat = treatPts.filter((p) => p.t >= treatStart);

    const avgPreControl =
      preTreatControl.length > 0
        ? preTreatControl.reduce((s, p) => s + p.y, 0) / preTreatControl.length
        : 0;
    const avgPostControl =
      postTreatControl.length > 0
        ? postTreatControl.reduce((s, p) => s + p.y, 0) / postTreatControl.length
        : 0;
    const avgPreTreat =
      preTreatTreat.length > 0
        ? preTreatTreat.reduce((s, p) => s + p.y, 0) / preTreatTreat.length
        : 0;
    const avgPostTreat =
      postTreatTreat.length > 0
        ? postTreatTreat.reduce((s, p) => s + p.y, 0) / postTreatTreat.length
        : 0;

    const didEstimate = avgPostTreat - avgPreTreat - (avgPostControl - avgPreControl);

    // Pre-trend difference: slope difference (should be ~0 for parallel trends)
    // Compute slope for each group pre-treatment
    const preTrendDiff = 0; // by construction, both groups have same slope pre-treatment
    // Post-trend difference: slope of treatment - slope of control after treatment
    const postTrendDiff = p.effect;

    return {
      W,
      H,
      pl,
      pr,
      pt,
      pb,
      controlPath,
      treatPath,
      cfPath,
      cfFullPath,
      shadePath,
      treatLineX,
      controlPts: controlPts.map((pt) => ({ ...pt, sx: tX(pt.t), sy: tY(pt.y) })),
      treatPts: treatPts.map((pt) => ({ ...pt, sx: tX(pt.t), sy: tY(pt.y) })),
      cfPostPts: cfPostPts.map((pt) => ({ ...pt, sx: tX(pt.t), sy: tY(pt.y) })),
      xTicks,
      yTicks,
      tX,
      tY,
      yMin,
      yMax,
      treatStart,
      didEstimate,
      preTrendDiff,
      postTrendDiff,
      nPeriods,
      controlBase,
      treatBase,
      baselineY: tY(0),
    };
  }, [p.slope, p.effect, p.treatTime, p.groupGap]);

  const tooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < d.pl || vbX > d.W - d.pr) return null;

      // Find nearest time period
      const tFrac = (vbX - d.pl) / (d.W - d.pl - d.pr);
      const tVal = 1 + tFrac * (d.nPeriods - 1);
      const tRound = Math.max(1, Math.min(d.nPeriods, Math.round(tVal)));

      const controlY = d.controlBase + p.slope * (tRound - 1);
      const treatStart = Math.round(p.treatTime);
      const cfY = d.treatBase + p.slope * (tRound - 1);
      const treatY = tRound >= treatStart ? cfY + p.effect : cfY;

      const lines: { label: string; value: string; color: string }[] = [
        { label: 'Period', value: String(tRound), color: sv.text },
        { label: 'Control', value: controlY.toFixed(1), color: colors.indigo },
        { label: 'Treatment', value: treatY.toFixed(1), color: colors.emerald },
      ];

      if (tRound >= treatStart) {
        lines.push({ label: 'Counterfactual', value: cfY.toFixed(1), color: colors.amber });
        lines.push({ label: 'DiD Gap', value: (treatY - cfY).toFixed(1), color: colors.emerald });
      }

      const sx = d.tX(tRound);
      const markers: { y: number; color: string }[] = [
        { y: d.tY(controlY), color: colors.indigo },
        { y: d.tY(treatY), color: colors.emerald },
      ];
      if (tRound >= treatStart) {
        markers.push({ y: d.tY(cfY), color: colors.amber });
      }

      return {
        x: sx,
        y: Math.min(...markers.map((m) => m.y)),
        lines,
        markers,
      };
    },
    [d, p.slope, p.effect, p.treatTime],
  );

  return (
    <div>
      <Hdr sub="Analyze">Difference-in-Differences</Hdr>
      <Desc>
        When you cannot randomize, DiD estimates causal effects by comparing the change over time
        between a treatment and control group. The key assumption: both groups would have followed
        parallel trends without the intervention.
      </Desc>

      <ChartBox
        h={d.H}
        tooltipLookup={tooltipLookup}
        label="Difference-in-differences: treatment vs control group trends with counterfactual"
      >
        <defs>
          <linearGradient id="grad-did-m27" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {d.yTicks.map((v) => (
          <line
            key={'yg' + v}
            x1={d.pl}
            y1={d.tY(v)}
            x2={d.W - d.pr}
            y2={d.tY(v)}
            stroke={sv.grid}
            strokeWidth={0.5}
          />
        ))}

        {/* Y-axis labels */}
        {d.yTicks.map((v) => (
          <text
            key={'yl' + v}
            x={d.pl - 6}
            y={d.tY(v) + 3.5}
            fill={sv.textFaint}
            fontSize={10}
            textAnchor="end"
          >
            {v}
          </text>
        ))}

        {/* X-axis labels */}
        {d.xTicks.map((t) => (
          <text
            key={'xl' + t}
            x={d.tX(t)}
            y={d.H - d.pb + 16}
            fill={sv.textFaint}
            fontSize={10}
            textAnchor="middle"
          >
            {t}
          </text>
        ))}

        {/* Axes */}
        <line x1={d.pl} y1={d.H - d.pb} x2={d.W - d.pr} y2={d.H - d.pb} stroke={sv.axis} />
        <line x1={d.pl} y1={d.pt} x2={d.pl} y2={d.H - d.pb} stroke={sv.axis} />

        {/* Treatment start vertical line */}
        <line
          x1={d.treatLineX}
          y1={d.pt}
          x2={d.treatLineX}
          y2={d.H - d.pb}
          stroke={colors.red}
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />
        <text
          x={d.treatLineX}
          y={d.pt - 6}
          fill={colors.red}
          fontSize={9}
          textAnchor="middle"
          fontWeight="600"
        >
          Treatment Start
        </text>

        {/* Shaded DiD area */}
        {d.shadePath && <path d={d.shadePath} fill="url(#grad-did-m27)" />}

        {/* Counterfactual line (dashed) */}
        <path
          d={d.cfPath}
          fill="none"
          stroke={colors.amber}
          strokeWidth={2}
          strokeDasharray="6,4"
        />

        {/* Control group line */}
        <path d={d.controlPath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />

        {/* Treatment group line */}
        <path d={d.treatPath} fill="none" stroke={colors.emerald} strokeWidth={2.5} />

        {/* Control data points */}
        {d.controlPts.map((pt, i) => (
          <circle
            key={'c' + i}
            cx={pt.sx}
            cy={pt.sy}
            r={3.5}
            fill={colors.indigo}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}

        {/* Treatment data points */}
        {d.treatPts.map((pt, i) => (
          <circle
            key={'t' + i}
            cx={pt.sx}
            cy={pt.sy}
            r={3.5}
            fill={colors.emerald}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}

        {/* Counterfactual data points (post-treatment only) */}
        {d.cfPostPts.map((pt, i) => (
          <circle
            key={'cf' + i}
            cx={pt.sx}
            cy={pt.sy}
            r={3}
            fill="none"
            stroke={colors.amber}
            strokeWidth={1.5}
          />
        ))}

        {/* Legend */}
        <line
          x1={d.W - d.pr - 160}
          y1={d.pt + 6}
          x2={d.W - d.pr - 140}
          y2={d.pt + 6}
          stroke={colors.indigo}
          strokeWidth={2.5}
        />
        <text x={d.W - d.pr - 136} y={d.pt + 10} fill={sv.text} fontSize={10}>
          Control
        </text>

        <line
          x1={d.W - d.pr - 160}
          y1={d.pt + 20}
          x2={d.W - d.pr - 140}
          y2={d.pt + 20}
          stroke={colors.emerald}
          strokeWidth={2.5}
        />
        <text x={d.W - d.pr - 136} y={d.pt + 24} fill={sv.text} fontSize={10}>
          Treatment
        </text>

        <line
          x1={d.W - d.pr - 160}
          y1={d.pt + 34}
          x2={d.W - d.pr - 140}
          y2={d.pt + 34}
          stroke={colors.amber}
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        <text x={d.W - d.pr - 136} y={d.pt + 38} fill={sv.text} fontSize={10}>
          Counterfactual
        </text>

        {/* Axis titles */}
        <text x={d.W / 2} y={d.H - 2} fill={sv.textFaint} fontSize={11} textAnchor="middle">
          Time Period
        </text>
        <text
          x={12}
          y={d.H / 2}
          fill={sv.textFaint}
          fontSize={11}
          textAnchor="middle"
          transform={`rotate(-90,12,${d.H / 2})`}
        >
          Outcome
        </text>
      </ChartBox>

      {/* StatBoxes */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox label="DiD Estimate" value={d.didEstimate.toFixed(2)} color={colors.emerald} />
        <StatBox label="Pre-trend Diff" value={d.preTrendDiff.toFixed(2)} color={colors.indigo} />
        <StatBox label="Post-trend Diff" value={d.postTrendDiff.toFixed(2)} color={colors.amber} />
      </div>

      <Sl
        label="Pre-treatment Trend Slope"
        value={p.slope}
        min={-2}
        max={2}
        step={0.1}
        onChange={setSlope}
        fmt={(v: number) => v.toFixed(1)}
        color={colors.indigo}
      />
      <Sl
        label="Treatment Effect"
        value={p.effect}
        min={-5}
        max={10}
        step={0.5}
        onChange={setEffect}
        fmt={(v: number) => v.toFixed(1)}
        color={colors.emerald}
      />
      <Sl
        label="Treatment Start Period"
        value={p.treatTime}
        min={2}
        max={8}
        step={1}
        onChange={setTreatTime}
        fmt={(v: number) => String(Math.round(v))}
        color={colors.red}
      />
      <Sl
        label="Initial Group Gap"
        value={p.groupGap}
        min={0}
        max={5}
        step={0.5}
        onChange={setGroupGap}
        fmt={(v: number) => v.toFixed(1)}
        color={colors.amber}
      />

      <QA
        items={[
          {
            q: 'What if the parallel trends assumption fails?',
            a: 'Then DiD gives a biased estimate. Always plot the pre-treatment trends for both groups \u2014 if they diverge before treatment, DiD is inappropriate. Consider alternatives like synthetic control or regression discontinuity.',
          },
          {
            q: 'When is DiD useful in tech?',
            a: 'Policy changes that affect entire markets (e.g., a new feature launches in one country), regulatory changes, or natural experiments where randomization was not possible. It is also used for measuring long-term effects after an A/B test ends.',
          },
        ]}
      />
      <TechNote>
        The DiD estimator is: {'\u03B4'} = ({'\u0232'}_treat,post {'\u2212'} {'\u0232'}_treat,pre){' '}
        {'\u2212'} ({'\u0232'}_control,post {'\u2212'} {'\u0232'}_control,pre). Under the parallel
        trends assumption, E[{'\u03B4'}] equals the average treatment effect on the treated (ATT).
        Standard errors should be clustered at the group level to account for serial correlation.
      </TechNote>
      <Insight>
        DiD is one of the most widely used causal inference tools outside of randomized experiments.
        The beauty is its simplicity — but the parallel trends assumption is untestable for the
        post-treatment period. Always validate it with pre-treatment data and consider placebo
        tests.
      </Insight>
    </div>
  );
}
