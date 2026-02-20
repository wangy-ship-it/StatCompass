import { useState, useMemo, useCallback } from 'react';
import { nCDF, zInv, sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const paramDefaults = { effectSize: 2.0, threshold: 2.0, nGuardrails: 3 };

export default function M6MetricsGuardrails() {
  const [p, set] = useAnimatedParams(paramDefaults);
  const { effectSize, threshold, nGuardrails } = p;
  const setEffectSize = (v) => set('effectSize', v);
  const setThreshold = (v) => set('threshold', v);
  const setNGuardrails = (v) => set('nGuardrails', v);
  const [seed, setSeed] = useState(1);

  const data = useMemo(() => {
    const alpha = 0.05;
    const se = 0.8;

    /* --- Primary metric --- */
    const ciHalf = zInv(alpha) * se;
    const ciLo = effectSize - ciHalf;
    const ciHi = effectSize + ciHalf;
    const zStat = effectSize / se;
    const pValue = 2 * (1 - nCDF(Math.abs(zStat), 0, 1));
    const primarySig = pValue < alpha;
    const primaryPositive = effectSize > 0;
    // emerald if significant positive, red if significant negative, indigo if inconclusive
    const primaryColor = primarySig
      ? primaryPositive
        ? colors.emerald
        : colors.red
      : colors.indigo;
    const primaryLabel = primarySig
      ? primaryPositive
        ? 'Significant Positive'
        : 'Significant Negative'
      : 'Inconclusive';

    /* --- Guardrails --- */
    const guardrails = [];
    let trippedCount = 0;
    for (let i = 0; i < nGuardrails; i++) {
      const observed = sR(i * 37 + 100 + seed * 73) * 4 - 2;
      const tripped = Math.abs(observed) > threshold;
      if (tripped) trippedCount++;
      guardrails.push({ index: i, observed, tripped });
    }

    /* --- Statistics --- */
    const falseAlarmRate = 1 - Math.pow(1 - alpha, nGuardrails);
    const bonferroniAlpha = alpha / nGuardrails;

    return {
      effectSize,
      ciLo,
      ciHi,
      primarySig,
      primaryColor,
      primaryLabel,
      guardrails,
      trippedCount,
      falseAlarmRate,
      bonferroniAlpha,
      threshold,
      nGuardrails,
    };
  }, [effectSize, threshold, nGuardrails, seed]);

  /* --- Chart layout --- */
  const W = 600, H = 260;
  const pl = 120, pr = 40, pt = 16, pb = 10;
  const chartW = W - pl - pr;

  /* --- Primary metric bar positioning --- */
  // Map percent values to x coordinates; center at 0, range roughly -6 to +6
  const xRange = 6;
  const toX = (v) => pl + ((v + xRange) / (2 * xRange)) * chartW;
  const centerX = toX(0);

  /* --- Primary metric row --- */
  const primaryY = pt + 20;
  const barH = 18;

  /* --- Guardrail rows --- */
  const guardrailStartY = primaryY + barH + 36;
  const guardrailRowH = 34;

  const tooltipLookup = useCallback((vbX, vbY) => {
    if (vbX < pl || vbX > W - pr) return null;
    const xVal = ((vbX - pl) / chartW) * 2 * xRange - xRange;
    // Determine if hovering over the primary metric or a guardrail row
    if (vbY < guardrailStartY - 14) {
      // Primary metric area
      return {
        x: toX(xVal),
        y: primaryY + barH / 2,
        lines: [
          { label: 'Effect', value: xVal.toFixed(2) + '%', color: data.primaryColor },
          { label: 'Primary', value: data.effectSize.toFixed(1) + '% [' + data.ciLo.toFixed(1) + ', ' + data.ciHi.toFixed(1) + ']', color: data.primaryColor },
          { label: 'Status', value: data.primaryLabel, color: data.primaryColor },
        ],
        markers: [{ y: primaryY + barH / 2, color: data.primaryColor }],
      };
    }
    // Guardrail area - find nearest row
    let gIdx = Math.round((vbY - guardrailStartY - 8 - 7) / guardrailRowH);
    gIdx = Math.max(0, Math.min(gIdx, data.guardrails.length - 1));
    const g = data.guardrails[gIdx];
    const rowY = guardrailStartY + gIdx * guardrailRowH + 8;
    const gBarH = 14;
    const barColor = g.tripped ? colors.red : colors.emerald;
    return {
      x: toX(xVal),
      y: rowY + gBarH / 2,
      lines: [
        { label: 'x', value: xVal.toFixed(2) + '%', color: colors.indigo },
        { label: 'Guardrail ' + (gIdx + 1), value: g.observed.toFixed(2) + '%', color: barColor },
        { label: 'Threshold', value: '\u00B1' + data.threshold.toFixed(1) + '%', color: colors.amber },
        { label: 'Status', value: g.tripped ? 'TRIPPED' : 'OK', color: barColor },
      ],
      markers: [{ y: rowY + gBarH / 2, color: barColor }],
    };
  }, [data]);

  return (
    <div>
      <Hdr sub="Design">Metrics & Guardrails</Hdr>
      <Desc>
        A primary metric tells you whether the experiment moved the needle. Guardrail metrics ensure
        nothing important broke in the process. But monitoring many guardrails simultaneously inflates
        false alarm rates — even when nothing actually changed. Drag the sliders to see how the number
        of guardrails and threshold width interact with the multiple testing problem.
      </Desc>

      <ChartBox h={H} label="Metrics dashboard showing primary metric, secondary metrics, and guardrail metrics with their current values and thresholds" tooltipLookup={tooltipLookup}>
        {/* Center line (zero reference) */}
        <line
          x1={centerX} y1={pt} x2={centerX} y2={H - pb}
          stroke={sv.axis} strokeWidth={1} strokeDasharray="4,3"
        />
        <text x={centerX} y={pt - 2} fill={sv.text} fontSize={8} textAnchor="middle">
          0%
        </text>

        {/* === Primary Metric Section === */}
        <text x={16} y={primaryY + barH / 2 + 1} fill={sv.text} fontSize={11} fontWeight="600" dominantBaseline="middle">
          Primary Metric
        </text>

        {/* Primary CI bar background track */}
        <rect
          x={toX(data.ciLo)} y={primaryY}
          width={Math.max(toX(data.ciHi) - toX(data.ciLo), 4)} height={barH}
          rx={4} fill={data.primaryColor} opacity={0.2}
        />
        {/* Primary CI bar solid */}
        <rect
          x={toX(data.ciLo)} y={primaryY + 3}
          width={Math.max(toX(data.ciHi) - toX(data.ciLo), 4)} height={barH - 6}
          rx={3} fill={data.primaryColor} opacity={0.7}
        />
        {/* Point estimate marker */}
        <circle
          cx={toX(data.effectSize)} cy={primaryY + barH / 2}
          r={4} fill={data.primaryColor} stroke={sv.appBg} strokeWidth={1.5}
        />
        {/* CI endpoints */}
        <line
          x1={toX(data.ciLo)} y1={primaryY + 2} x2={toX(data.ciLo)} y2={primaryY + barH - 2}
          stroke={data.primaryColor} strokeWidth={2}
        />
        <line
          x1={toX(data.ciHi)} y1={primaryY + 2} x2={toX(data.ciHi)} y2={primaryY + barH - 2}
          stroke={data.primaryColor} strokeWidth={2}
        />
        {/* Label */}
        <text
          x={toX(data.ciHi) + 8} y={primaryY + barH / 2 + 1}
          fill={data.primaryColor} fontSize={10} fontWeight="700" dominantBaseline="middle"
        >
          {data.primaryLabel}
        </text>

        {/* Divider */}
        <line
          x1={pl - 10} y1={guardrailStartY - 14}
          x2={W - pr + 10} y2={guardrailStartY - 14}
          stroke={sv.axis} strokeWidth={0.5}
        />
        <text
          x={16} y={guardrailStartY - 6}
          fill={sv.text} fontSize={9} fontWeight="600"
        >
          Guardrails
        </text>

        {/* === Guardrail Rows === */}
        {data.guardrails.map((g, i) => {
          const rowY = guardrailStartY + i * guardrailRowH + 8;
          const gBarH = 14;
          const obsX = toX(g.observed);
          const barColor = g.tripped ? colors.red : colors.emerald;
          const threshLoX = toX(-data.threshold);
          const threshHiX = toX(data.threshold);

          // Bar extends from center to observed value
          const barX = Math.min(centerX, obsX);
          const barWidth = Math.max(Math.abs(obsX - centerX), 2);

          return (
            <g key={i}>
              {/* Guardrail label */}
              <text
                x={pl - 12} y={rowY + gBarH / 2 + 1}
                fill={sv.text} fontSize={10} textAnchor="end" dominantBaseline="middle"
              >
                {'Guardrail ' + (i + 1)}
              </text>

              {/* Background track */}
              <rect
                x={pl} y={rowY}
                width={chartW} height={gBarH}
                rx={3} fill={sv.grid} opacity={0.5}
              />

              {/* Threshold dashed lines */}
              <line
                x1={threshLoX} y1={rowY - 2} x2={threshLoX} y2={rowY + gBarH + 2}
                stroke={colors.amber} strokeWidth={1.2} strokeDasharray="3,2"
              />
              <line
                x1={threshHiX} y1={rowY - 2} x2={threshHiX} y2={rowY + gBarH + 2}
                stroke={colors.amber} strokeWidth={1.2} strokeDasharray="3,2"
              />

              {/* Safe zone fill between thresholds */}
              <rect
                x={threshLoX} y={rowY}
                width={threshHiX - threshLoX} height={gBarH}
                rx={0} fill={colors.emerald} opacity={0.04}
              />

              {/* Observed value bar */}
              <rect
                x={barX} y={rowY + 2}
                width={barWidth} height={gBarH - 4}
                rx={2} fill={barColor} opacity={0.65}
              />

              {/* Observed value dot */}
              <circle
                cx={obsX} cy={rowY + gBarH / 2}
                r={3.5} fill={barColor} stroke={g.tripped ? sv.appBg : 'none'} strokeWidth={1}
              />

              {/* Value label */}
              <text
                x={W - pr + 8} y={rowY + gBarH / 2 + 1}
                fill={barColor} fontSize={9} fontWeight="600" dominantBaseline="middle"
              >
                {g.observed.toFixed(2) + '%'}
              </text>

              {/* Tripped indicator */}
              {g.tripped && (
                <text
                  x={obsX} y={rowY - 4}
                  fill={colors.red} fontSize={8} textAnchor="middle" fontWeight="700"
                >
                  TRIPPED
                </text>
              )}
            </g>
          );
        })}

        {/* Threshold labels (once, at top of guardrails section) */}
        <text
          x={toX(-data.threshold)} y={guardrailStartY + 2}
          fill={colors.amber} fontSize={8} textAnchor="middle"
        >
          {'-' + data.threshold.toFixed(1) + '%'}
        </text>
        <text
          x={toX(data.threshold)} y={guardrailStartY + 2}
          fill={colors.amber} fontSize={8} textAnchor="middle"
        >
          {'+' + data.threshold.toFixed(1) + '%'}
        </text>

        {/* X-axis labels */}
        {[-4, -2, 0, 2, 4].map((v) => (
          <text key={v} x={toX(v)} y={H - 1} fill={sv.text} fontSize={8} textAnchor="middle">
            {v + '%'}
          </text>
        ))}
      </ChartBox>

      {/* StatBoxes */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="False Alarm Rate"
          value={(data.falseAlarmRate * 100).toFixed(1) + '%'}
          color={data.falseAlarmRate > 0.1 ? colors.red : colors.amber}
        />
        <StatBox
          label="Guardrails Tripped"
          value={data.trippedCount + ' / ' + data.nGuardrails}
          color={data.trippedCount > 0 ? colors.red : colors.emerald}
        />
        <StatBox
          label="Bonferroni \u03b1"
          value={(data.bonferroniAlpha * 100).toFixed(2) + '%'}
          color={colors.indigo}
        />
        <StatBox
          label="Primary Significant"
          value={data.primarySig ? 'Yes' : 'No'}
          color={data.primarySig ? colors.emerald : sv.textFaint}
        />
      </div>

      {/* Sliders */}
      <Sl
        label="Primary Metric Effect Size"
        value={effectSize} min={0.5} max={5} step={0.1}
        onChange={setEffectSize}
        fmt={(v) => v.toFixed(1) + '%'}
        color={colors.emerald}
      />
      <Sl
        label="Guardrail Threshold Width"
        value={threshold} min={0.5} max={5} step={0.1}
        onChange={setThreshold}
        fmt={(v) => '\u00B1' + v.toFixed(1) + '%'}
        color={colors.amber}
      />
      <Sl
        label="Number of Guardrails"
        value={nGuardrails} min={1} max={5} step={1}
        onChange={setNGuardrails}
        color={colors.indigo}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <PillBtn on={false} onClick={() => setSeed((s) => s + 1)}>Re-simulate Guardrails</PillBtn>
      </div>

      <QA
        items={[
          {
            q: 'Why do guardrails trigger even when nothing is broken?',
            a: 'Each guardrail metric is tested at a 5% significance level. With 5 independent guardrails, the probability that at least one triggers by pure noise is 1 - (0.95)^5 = 22.6%. This is the multiple testing problem applied to monitoring: the more you watch, the more false alarms you get.',
          },
          {
            q: 'How should we set guardrail thresholds?',
            a: 'Use a Bonferroni or similar correction. If you monitor 5 guardrails, test each at \u03b1/5 = 1% instead of 5%. Alternatively, widen the threshold so only genuinely large degradations trigger an alert. The key is calibrating for the total number of metrics being monitored.',
          },
          {
            q: 'Should we stop an experiment if a guardrail is tripped?',
            a: 'Not automatically. A single tripped guardrail among many is expected noise. Investigate the magnitude, check if the degradation is practically meaningful, and consider whether the guardrail has a history of false positives. Stopping too eagerly increases the cost of experimentation.',
          },
        ]}
      />
      <TechNote>
        The family-wise error rate for k independent tests at level \u03b1 is FWER = 1 - (1 - \u03b1)^k.
        With 5 guardrails at \u03b1 = 0.05, FWER = 22.6%. Bonferroni correction tests each at \u03b1/k,
        guaranteeing FWER \u2264 \u03b1. For correlated guardrails (common in practice), Bonferroni is
        overly conservative — methods like Holm-Bonferroni or bootstrap-based joint tests provide
        tighter control. When guardrail metrics share underlying user behavior, their test statistics
        are correlated, and the true FWER falls below the independence-based formula.
      </TechNote>
      <Insight>
        More guardrails means more false alarms, even when nothing has changed. This is the multiple
        testing problem in disguise. Teams often add guardrails freely — page load time, revenue,
        engagement, error rate, latency — without adjusting thresholds. The result: experiments get
        killed by noise, not by real regressions. Choose guardrails carefully, set thresholds
        deliberately, and always account for the total number of metrics being monitored.
      </Insight>
    </div>
  );
}
