import { useState, useMemo } from 'react';
import { nCDF, zInv, mdeFromN, nFromMDE, cohensD } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, StatBox, QA, TechNote, Insight } from '../ui';

const fmtN = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return n.toString();
};

export default function M16EffectSizeMDE() {
  const [baseline, setBaseline] = useState(10);
  const [sampleSize, setSampleSize] = useState(10000);
  const [power, setPower] = useState(80);

  const computed = useMemo(() => {
    const p = baseline / 100;
    const pw = power / 100;
    const mde = mdeFromN(sampleSize, 0.05, pw, p);
    const reqN = nFromMDE(mde, 0.05, pw, p);
    const d = cohensD(p, p + mde);
    return { mde, reqN, d, p, pw };
  }, [baseline, sampleSize, power]);

  // Power curve data points
  const curvePoints = useMemo(() => {
    const p = computed.p;
    const n = sampleSize;
    const se = Math.sqrt((2 * p * (1 - p)) / n);
    const za = zInv(0.05);
    const maxDelta = p * 0.5;
    const steps = 100;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const delta = (i / steps) * maxDelta;
      const pw = se > 0 ? 1 - nCDF(za - delta / se, 0, 1) : 0;
      pts.push({ delta, pw: Math.min(pw, 1) });
    }
    return pts;
  }, [computed.p, sampleSize]);

  // ── Visual 1: Effect size spectrum bar ──
  const V1W = 600, V1H = 80;
  const v1pl = 40, v1pr = 20, v1pt = 20, v1pb = 26;
  const barY = v1pt + 8;
  const barH = 18;
  const scaleMax = Math.max(computed.d * 2.5, 0.15);
  const v1toX = (d) => v1pl + (d / scaleMax) * (V1W - v1pl - v1pr);

  const allBenchmarks = [
    { d: 0.2, label: 'Small' },
    { d: 0.5, label: 'Medium' },
    { d: 0.8, label: 'Large' },
  ];
  const benchmarks = allBenchmarks.filter((b) => b.d <= scaleMax);

  // ── Visual 2: Power curve ──
  const V2W = 600, V2H = 200;
  const v2pl = 48, v2pr = 20, v2pt = 16, v2pb = 38;
  const maxDelta = computed.p * 0.5;
  const v2toX = (delta) => v2pl + (delta / maxDelta) * (V2W - v2pl - v2pr);
  const v2toY = (pw) => V2H - v2pb - pw * (V2H - v2pt - v2pb);

  const curveLine = curvePoints
    .map((pt, i) => (i === 0 ? 'M' : 'L') + v2toX(pt.delta) + ',' + v2toY(pt.pw))
    .join('');

  // Find MDE position on curve
  const mdeX = v2toX(computed.mde);
  const mdeY = v2toY(computed.pw);

  // Shaded regions: underpowered (below MDE, red) and adequately powered (above MDE, emerald)
  const mdeIdx = curvePoints.findIndex((pt) => pt.delta >= computed.mde);
  const safeIdx = Math.max(0, Math.min(mdeIdx, curvePoints.length - 1));

  const underpoweredPath =
    curvePoints
      .slice(0, safeIdx + 1)
      .map((pt, i) => (i === 0 ? 'M' : 'L') + v2toX(pt.delta) + ',' + v2toY(pt.pw))
      .join('') +
    'L' + v2toX(curvePoints[safeIdx]?.delta ?? 0) + ',' + v2toY(0) +
    'L' + v2toX(0) + ',' + v2toY(0) + 'Z';

  const poweredPath =
    curvePoints
      .slice(safeIdx)
      .map((pt, i) => (i === 0 ? 'M' : 'L') + v2toX(pt.delta) + ',' + v2toY(pt.pw))
      .join('') +
    'L' + v2toX(maxDelta) + ',' + v2toY(0) +
    'L' + v2toX(curvePoints[safeIdx]?.delta ?? 0) + ',' + v2toY(0) + 'Z';

  // Axis ticks for power curve
  const xTicks = [];
  const xTickStep = maxDelta > 0.02 ? 0.01 : maxDelta > 0.005 ? 0.002 : 0.001;
  for (let v = 0; v <= maxDelta + xTickStep * 0.1; v += xTickStep) {
    if (v <= maxDelta) xTicks.push(v);
  }
  // Limit ticks to avoid overcrowding
  const displayXTicks = xTicks.length > 8
    ? xTicks.filter((_, i) => i % Math.ceil(xTicks.length / 7) === 0 || i === xTicks.length - 1)
    : xTicks;

  return (
    <div>
      <Hdr sub="Design">Effect Size &amp; MDE</Hdr>
      <Desc>
        The Minimum Detectable Effect (MDE) is the smallest real improvement your experiment can
        reliably pick up. It depends on your sample size, baseline rate, and desired power. If the
        true effect is smaller than the MDE, your test is essentially blind to it.
      </Desc>

      {/* Visual 1: Effect size spectrum bar */}
      <ChartBox h={V1H}>
        {/* Background bar */}
        <defs>
          <linearGradient id="spectrumGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={sv.axis} stopOpacity="0.4" />
            <stop offset="100%" stopColor={sv.axis} stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <rect x={v1pl} y={barY} width={V1W - v1pl - v1pr} height={barH} rx={4} fill="url(#spectrumGrad)" />

        {/* Scale labels */}
        <text x={v1pl} y={V1H - v1pb + 16} fill={sv.text} fontSize={9} textAnchor="middle">0</text>
        <text x={v1toX(scaleMax / 2)} y={V1H - v1pb + 16} fill={sv.text} fontSize={9} textAnchor="middle">{(scaleMax / 2).toFixed(2)}</text>
        <text x={v1toX(scaleMax)} y={V1H - v1pb + 16} fill={sv.text} fontSize={9} textAnchor="end">{scaleMax.toFixed(2)}</text>
        <text x={V1W / 2} y={v1pt - 6} fill={sv.text} fontSize={9} textAnchor="middle">
          {"Cohen's d"}
        </text>
        {/* Off-screen benchmark indicator */}
        {allBenchmarks.filter((b) => b.d > scaleMax).length > 0 && (
          <text x={V1W - v1pr} y={barY + barH + 14} fill={sv.textFaint} fontSize={8} textAnchor="end">
            {allBenchmarks.filter((b) => b.d > scaleMax).map((b) => b.label + '(' + b.d + ')').join(' · ') + ' →'}
          </text>
        )}

        {/* Benchmark lines */}
        {benchmarks.map((b) => (
          <g key={b.d}>
            <line x1={v1toX(b.d)} y1={barY - 2} x2={v1toX(b.d)} y2={barY + barH + 2} stroke={sv.text} strokeWidth={1.5} />
            <text x={v1toX(b.d)} y={barY + barH + 14} fill={sv.text} fontSize={9} textAnchor="middle">
              {b.label} ({b.d})
            </text>
          </g>
        ))}

        {/* User's MDE pointer (triangle) */}
        <polygon
          points={[
            v1toX(Math.min(computed.d, scaleMax)) + ',' + (barY - 3),
            (v1toX(Math.min(computed.d, scaleMax)) - 6) + ',' + (barY - 13),
            (v1toX(Math.min(computed.d, scaleMax)) + 6) + ',' + (barY - 13),
          ].join(' ')}
          fill={colors.indigo}
        />
        <text x={v1toX(Math.min(computed.d, scaleMax))} y={barY - 16} fill={colors.indigo} fontSize={9} textAnchor="middle" fontWeight="600">
          {'Your MDE: d = ' + computed.d.toFixed(3)}
        </text>
      </ChartBox>

      {/* Visual 2: Power curve */}
      <ChartBox h={V2H}>
        <defs>
          <linearGradient id="underGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.red} stopOpacity="0.18" />
            <stop offset="100%" stopColor={colors.red} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="overGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.18" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
          <g key={v}>
            <line x1={v2pl} y1={v2toY(v)} x2={V2W - v2pr} y2={v2toY(v)} stroke={sv.grid} />
            <text x={v2pl - 5} y={v2toY(v) + 3} fill={sv.text} fontSize={9} textAnchor="end">
              {(v * 100).toFixed(0) + '%'}
            </text>
          </g>
        ))}

        {/* X-axis ticks */}
        {displayXTicks.map((v) => (
          <text key={v} x={v2toX(v)} y={V2H - v2pb + 14} fill={sv.text} fontSize={9} textAnchor="middle">
            {(v * 100).toFixed(1) + '%'}
          </text>
        ))}

        {/* Shaded regions */}
        <path d={underpoweredPath} fill="url(#underGrad)" />
        <path d={poweredPath} fill="url(#overGrad)" />

        {/* Power curve line */}
        <path d={curveLine} fill="none" stroke={colors.indigo} strokeWidth={2.5} />

        {/* Desired power dashed line */}
        <line
          x1={v2pl}
          y1={v2toY(computed.pw)}
          x2={V2W - v2pr}
          y2={v2toY(computed.pw)}
          stroke={colors.amber}
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />
        <text x={V2W - v2pr} y={v2toY(computed.pw) - 4} fill={colors.amber} fontSize={9} textAnchor="end" fontWeight="600">
          {power + '% power'}
        </text>

        {/* MDE vertical dashed line */}
        {computed.mde <= maxDelta && (
          <>
            <line
              x1={mdeX}
              y1={v2toY(0)}
              x2={mdeX}
              y2={mdeY}
              stroke={colors.amber}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            <circle cx={mdeX} cy={mdeY} r={5} fill={colors.amber} />
            <text x={mdeX} y={v2toY(0) + 14} fill={colors.amber} fontSize={10} textAnchor="middle" fontWeight="700">
              {'MDE = ' + (computed.mde * 100).toFixed(2) + '%'}
            </text>
          </>
        )}

        {/* Region labels */}
        {computed.mde <= maxDelta && safeIdx > 10 && (
          <text
            x={v2toX(computed.mde / 2)}
            y={v2toY(0.15)}
            fill={colors.red}
            fontSize={9}
            textAnchor="middle"
            opacity={0.7}
          >
            Underpowered
          </text>
        )}
        {computed.mde <= maxDelta && (
          <text
            x={v2toX(Math.min(computed.mde + (maxDelta - computed.mde) / 2, maxDelta * 0.85))}
            y={v2toY(0.15)}
            fill={colors.emerald}
            fontSize={9}
            textAnchor="middle"
            opacity={0.7}
          >
            Adequately Powered
          </text>
        )}

        {/* Axes */}
        <line x1={v2pl} y1={v2toY(0)} x2={V2W - v2pr} y2={v2toY(0)} stroke={sv.axis} />
        <text x={V2W / 2} y={V2H - 4} fill={sv.text} fontSize={9} textAnchor="middle">
          Effect Size (absolute)
        </text>
        <text x={v2pl - 5} y={v2toY(0) + 3} fill={sv.text} fontSize={9} textAnchor="end">
          0%
        </text>
      </ChartBox>

      {/* Sliders */}
      <Sl
        label="Baseline Rate"
        value={baseline}
        min={1}
        max={30}
        step={0.5}
        onChange={setBaseline}
        fmt={(v) => v.toFixed(1) + '%'}
        color={colors.indigo}
      />
      <Sl
        label="Sample Size per Group"
        value={sampleSize}
        min={500}
        max={500000}
        step={500}
        onChange={setSampleSize}
        fmt={(v) => fmtN(v)}
        color={colors.emerald}
      />
      <Sl
        label="Desired Power"
        value={power}
        min={60}
        max={99}
        step={1}
        onChange={setPower}
        fmt={(v) => v + '%'}
        color={colors.amber}
      />

      {/* StatBoxes */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="MDE (absolute)"
          value={(computed.mde * 100).toFixed(2) + 'pp'}
          color={colors.indigo}
        />
        <StatBox
          label="MDE (relative %)"
          value={((computed.mde / (baseline / 100)) * 100).toFixed(1) + '%'}
          color={colors.emerald}
        />
        <StatBox
          label="Cohen's d"
          value={computed.d.toFixed(3)}
          color={colors.amber}
        />
        <StatBox
          label="Required n"
          value={fmtN(computed.reqN)}
          color={sv.text}
        />
      </div>

      <QA
        items={[
          {
            q: 'Our MDE is 2pp but we want to detect a 0.5pp change. What do we do?',
            a: 'You need a much larger sample size. The relationship is quadratic: detecting an effect 4x smaller requires roughly 16x more users. Use the slider to see how much traffic you actually need, then decide if the business impact of 0.5pp justifies the cost.',
          },
          {
            q: "What's a 'good' MDE for our experiment?",
            a: "There is no universal answer. A good MDE is one that is smaller than the minimum business-relevant effect. If a 1pp lift is worth shipping and your MDE is 0.8pp, you are well powered. If your MDE is 3pp, you could miss real improvements that matter to the business.",
          },
          {
            q: 'Why does Cohen\'s d matter?',
            a: "Cohen's d standardizes the effect size so you can compare across experiments with different metrics and baselines. A d of 0.2 is conventionally 'small', 0.5 is 'medium', and 0.8 is 'large'. Most A/B tests deal in small effects (d < 0.2), which is why they need large sample sizes.",
          },
        ]}
      />
      <TechNote>
        MDE is derived from the two-sample z-test for proportions: MDE = (z_alpha + z_beta) *
        sqrt(2p(1-p)/n), where z_alpha and z_beta are the critical values for significance and
        power respectively. The formula assumes equal group sizes, two-sided testing, and a pooled
        variance estimate. Cohen's d normalizes the raw difference by the pooled standard deviation.
      </TechNote>
      <Insight>
        Small effects need enormous sample sizes. Halving your MDE quadruples the required sample
        size. Drag the sample size slider down and watch the MDE pointer jump — that is the gap
        between what you want to detect and what you can actually detect with limited traffic.
      </Insight>
    </div>
  );
}
