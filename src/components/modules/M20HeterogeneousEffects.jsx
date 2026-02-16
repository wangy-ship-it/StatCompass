import { useState, useMemo } from 'react';
import { sR, nCDF } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';

export default function M20HeterogeneousEffects() {
  const [overallATE, setOverallATE] = useState(0.8);
  const [heterogeneity, setHeterogeneity] = useState(0.3);
  const [nGroups, setNGroups] = useState(5);

  const data = useMemo(() => {
    const subgroups = [];
    for (let i = 0; i < nGroups; i++) {
      const effect = overallATE + heterogeneity * ((sR(i * 47 + 123) - 0.5) * 4);
      const se = 0.3 + sR(i * 31 + 456) * 0.2;
      const ciLo = effect - 1.96 * se;
      const ciHi = effect + 1.96 * se;
      subgroups.push({ effect, se, ciLo, ciHi });
    }

    // Cochran's Q statistic
    const Q = subgroups.reduce((sum, sg) => {
      return sum + Math.pow(sg.effect - overallATE, 2) / Math.pow(sg.se, 2);
    }, 0);

    const df = nGroups - 1;

    // I-squared
    const iSquared = df > 0 && Q > 0 ? Math.max(0, (Q - df) / Q * 100) : 0;

    // Q-test p-value approximation
    let qPValue = 1;
    if (Q > df && df > 0) {
      qPValue = 2 * (1 - nCDF(Math.sqrt(2 * Q) - Math.sqrt(2 * df - 1), 0, 1));
    }
    qPValue = Math.min(1, Math.max(0, qPValue));

    // Overall pooled SE (inverse-variance weighted)
    const pooledW = subgroups.reduce((sum, sg) => sum + 1 / (sg.se * sg.se), 0);
    const pooledSE = Math.sqrt(1 / pooledW);
    const pooledCILo = overallATE - 1.96 * pooledSE;
    const pooledCIHi = overallATE + 1.96 * pooledSE;

    // Largest subgroup effect
    const largestEffect = subgroups.reduce((max, sg) => Math.abs(sg.effect) > Math.abs(max) ? sg.effect : max, subgroups[0].effect);

    return { subgroups, Q, iSquared, qPValue, pooledSE, pooledCILo, pooledCIHi, largestEffect };
  }, [overallATE, heterogeneity, nGroups]);

  // Chart dimensions
  const W = 600, H = 320;
  const pl = 100, pr = 70, pt = 20, pb = 36;
  const cw = W - pl - pr;
  const ch = H - pt - pb;

  // Determine x-axis range from all CIs and pooled
  const allValues = [
    ...data.subgroups.flatMap((sg) => [sg.ciLo, sg.ciHi]),
    data.pooledCILo, data.pooledCIHi, overallATE, 0,
  ];
  const xDataMin = Math.min(...allValues);
  const xDataMax = Math.max(...allValues);
  const xPad = (xDataMax - xDataMin) * 0.15 || 0.5;
  const xMin = xDataMin - xPad;
  const xMax = xDataMax + xPad;

  const toX = (v) => pl + ((v - xMin) / (xMax - xMin)) * cw;

  // Row layout: subgroups + 1 gap + diamond row
  const totalRows = nGroups + 1;
  const rowH = ch / (totalRows + 0.5);
  const toY = (row) => pt + (row + 0.5) * rowH;

  // Alternating colors for subgroups
  const subColor = (i) => (i % 2 === 0 ? colors.indigo : colors.emerald);

  return (
    <div>
      <Hdr sub="Interpret & Decide">Heterogeneous Treatment Effects</Hdr>
      <Desc>
        A single overall average treatment effect can be misleading when the treatment works
        differently across subgroups. Heterogeneous treatment effect analysis breaks the overall
        estimate into subgroup-level effects, revealing who benefits most (or is harmed) by the
        intervention. The I² statistic quantifies how much of the variation across subgroups is
        real rather than due to chance.
      </Desc>

      <ChartBox h={H} label="Heterogeneous treatment effects showing how the experiment impact varies across different user segments">
        {/* Zero reference line */}
        <line
          x1={toX(0)}
          y1={pt}
          x2={toX(0)}
          y2={pt + ch}
          stroke={sv.axis}
          strokeWidth={0.8}
          strokeDasharray="3,3"
          opacity={0.5}
        />

        {/* Overall ATE vertical dashed line */}
        <line
          x1={toX(overallATE)}
          y1={pt}
          x2={toX(overallATE)}
          y2={pt + ch}
          stroke={colors.indigo}
          strokeWidth={1.5}
          strokeDasharray="6,4"
          opacity={0.7}
        />

        {/* Label for overall ATE line */}
        <text
          x={toX(overallATE)}
          y={pt - 4}
          fill={colors.indigo}
          fontSize={9}
          textAnchor="middle"
          opacity={0.8}
        >
          ATE = {overallATE.toFixed(1)}
        </text>

        {/* Subgroup rows */}
        {data.subgroups.map((sg, i) => {
          const y = toY(i);
          const col = subColor(i);
          const xLo = toX(sg.ciLo);
          const xHi = toX(sg.ciHi);
          const xPt = toX(sg.effect);

          return (
            <g key={'sg-' + i}>
              {/* Horizontal grid line */}
              <line
                x1={pl}
                y1={y}
                x2={pl + cw}
                y2={y}
                stroke={sv.axis}
                strokeWidth={0.3}
                opacity={0.3}
              />

              {/* Label on left */}
              <text
                x={pl - 8}
                y={y + 4}
                fill={sv.text}
                fontSize={11}
                textAnchor="end"
              >
                Subgroup {i + 1}
              </text>

              {/* CI horizontal bar */}
              <line
                x1={xLo}
                y1={y}
                x2={xHi}
                y2={y}
                stroke={col}
                strokeWidth={2}
                opacity={0.7}
              />

              {/* CI end caps */}
              <line x1={xLo} y1={y - 4} x2={xLo} y2={y + 4} stroke={col} strokeWidth={1.5} opacity={0.7} />
              <line x1={xHi} y1={y - 4} x2={xHi} y2={y + 4} stroke={col} strokeWidth={1.5} opacity={0.7} />

              {/* Point estimate dot */}
              <circle cx={xPt} cy={y} r={4.5} fill={col} />

              {/* Numeric value on right */}
              <text
                x={pl + cw + 8}
                y={y + 4}
                fill={col}
                fontSize={10}
                fontFamily="monospace"
                textAnchor="start"
              >
                {sg.effect.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Separator line before pooled estimate */}
        <line
          x1={pl}
          y1={toY(nGroups - 1) + rowH * 0.5}
          x2={pl + cw}
          y2={toY(nGroups - 1) + rowH * 0.5}
          stroke={sv.axis}
          strokeWidth={0.8}
          strokeDasharray="2,2"
          opacity={0.4}
        />

        {/* Pooled overall diamond */}
        {(() => {
          const dY = toY(nGroups);
          const dXCenter = toX(overallATE);
          const dXLo = toX(data.pooledCILo);
          const dXHi = toX(data.pooledCIHi);
          const dHalf = 7;

          return (
            <g>
              {/* Label */}
              <text
                x={pl - 8}
                y={dY + 4}
                fill={sv.text}
                fontSize={11}
                fontWeight="bold"
                textAnchor="end"
              >
                Overall
              </text>

              {/* CI line for diamond */}
              <line
                x1={dXLo}
                y1={dY}
                x2={dXHi}
                y2={dY}
                stroke={colors.amber}
                strokeWidth={1.5}
                opacity={0.5}
              />

              {/* Diamond shape */}
              <polygon
                points={
                  dXCenter + ',' + (dY - dHalf) + ' ' +
                  (dXCenter + dHalf * 1.5) + ',' + dY + ' ' +
                  dXCenter + ',' + (dY + dHalf) + ' ' +
                  (dXCenter - dHalf * 1.5) + ',' + dY
                }
                fill={colors.amber}
                opacity={0.85}
              />

              {/* Numeric value on right */}
              <text
                x={pl + cw + 8}
                y={dY + 4}
                fill={colors.amber}
                fontSize={10}
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="start"
              >
                {overallATE.toFixed(2)}
              </text>
            </g>
          );
        })()}

        {/* X-axis line */}
        <line x1={pl} y1={pt + ch} x2={pl + cw} y2={pt + ch} stroke={sv.axis} />

        {/* X-axis ticks */}
        {(() => {
          const range = xMax - xMin;
          const rawStep = range / 6;
          const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
          const candidates = [1, 2, 5, 10];
          const niceStep = candidates.map((c) => c * mag).find((s) => s >= rawStep) || rawStep;
          const ticks = [];
          const start = Math.ceil(xMin / niceStep) * niceStep;
          for (let v = start; v <= xMax; v += niceStep) {
            ticks.push(v);
          }
          return ticks.map((v) => (
            <g key={'xt-' + v}>
              <line
                x1={toX(v)}
                y1={pt + ch}
                x2={toX(v)}
                y2={pt + ch + 5}
                stroke={sv.axis}
              />
              <text
                x={toX(v)}
                y={pt + ch + 16}
                fill={sv.text}
                fontSize={9}
                textAnchor="middle"
              >
                {Math.abs(v) < 1e-9 ? '0' : v.toFixed(1)}
              </text>
            </g>
          ));
        })()}

        {/* X-axis title */}
        <text
          x={pl + cw / 2}
          y={H - 2}
          fill={sv.text}
          fontSize={9}
          textAnchor="middle"
        >
          Treatment Effect
        </text>
      </ChartBox>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="Overall ATE"
          value={overallATE.toFixed(2)}
          color={colors.amber}
        />
        <StatBox
          label="I² (Heterogeneity)"
          value={data.iSquared.toFixed(1) + '%'}
          color={data.iSquared > 50 ? colors.red : data.iSquared > 25 ? colors.amber : colors.emerald}
        />
        <StatBox
          label="Q-test p-value"
          value={data.qPValue < 0.001 ? '<0.001' : data.qPValue.toFixed(3)}
          color={data.qPValue < 0.05 ? colors.red : sv.text}
        />
        <StatBox
          label="Largest Subgroup Effect"
          value={data.largestEffect.toFixed(2)}
          color={colors.indigo}
        />
      </div>

      <Sl
        label="Overall ATE"
        value={overallATE}
        min={0}
        max={2}
        step={0.1}
        onChange={setOverallATE}
        fmt={(v) => v.toFixed(1)}
        color={colors.amber}
      />
      <Sl
        label="Heterogeneity Strength"
        value={heterogeneity}
        min={0}
        max={1}
        step={0.05}
        onChange={setHeterogeneity}
        fmt={(v) => v.toFixed(2)}
        color={colors.red}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <PillBtn on={nGroups === 3} onClick={() => setNGroups(3)}>3 Subgroups</PillBtn>
        <PillBtn on={nGroups === 5} onClick={() => setNGroups(5)}>5 Subgroups</PillBtn>
        <PillBtn on={nGroups === 8} onClick={() => setNGroups(8)}>8 Subgroups</PillBtn>
      </div>

      <QA
        items={[
          {
            q: 'Why should I look at subgroup effects instead of just the overall ATE?',
            a: 'The overall ATE is an average that can mask opposing effects in different segments. A treatment might strongly help younger users while hurting older ones, yet the pooled average looks modest and positive. Without subgroup analysis, you ship a change that actively harms part of your population. Heterogeneous treatment effect analysis reveals these hidden patterns.',
          },
          {
            q: 'What does a high I² mean in practice?',
            a: 'I² measures what fraction of the observed variation across subgroup estimates is real (not just sampling noise). An I² above 50% suggests substantial heterogeneity — the treatment effect genuinely differs across subgroups and the single overall ATE is a poor summary. An I² near 0% means subgroup differences are consistent with chance fluctuation.',
          },
          {
            q: 'How do I know the Q-test p-value is meaningful?',
            a: 'The Q-test checks whether subgroup effects are more spread out than expected by chance alone. A small p-value (below 0.05) rejects the null that all subgroups share the same true effect. However, the Q-test has low power with few subgroups — it may miss real heterogeneity when you only have 3 groups. Combine it with I² and visual inspection of the forest plot.',
          },
          {
            q: 'Can I use this to find which subgroup to target?',
            a: 'Use it for exploration, not confirmation. If you mine many subgroups post-hoc, you will inevitably find one with a large effect by chance. Pre-register your subgroup hypotheses before running the experiment. If subgroup analysis is exploratory, treat findings as hypotheses for a follow-up test, not as causal conclusions.',
          },
        ]}
      />
      <TechNote>
        Cochran's Q = sum((effect_i - overall)² / SE_i²) follows an approximate chi-squared
        distribution with df = k - 1. I² = max(0, (Q - df) / Q * 100) expresses heterogeneity as
        a percentage. The Q-test p-value is approximated via the normal distribution:
        p = 2 * (1 - Phi(sqrt(2Q) - sqrt(2df - 1))). The pooled diamond uses inverse-variance
        weights: w_i = 1 / SE_i², with pooled SE = 1 / sqrt(sum(w_i)). This is a fixed-effect
        model; a random-effects model (DerSimonian-Laird) would add a between-study variance
        component tau².
      </TechNote>
      <Insight>
        Crank the heterogeneity slider to 0 and notice every subgroup clusters around the overall
        ATE — the diamond summarizes the data well. Now push heterogeneity toward 1: subgroups
        scatter widely, some crossing zero, some doubling the average. The I² jumps, signaling
        that one number cannot represent this treatment. A significant overall effect can mask that
        the treatment helps some subgroups and hurts others. Whenever I² is high, report
        subgroup-level results alongside the overall — or better yet, run separate confirmatory
        experiments for each segment.
      </Insight>
    </div>
  );
}
