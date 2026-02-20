import { useMemo, useCallback } from 'react';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, PillBtn, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const effectTypes = {
  novelty: { label: 'Novelty Decay', desc: 'Initial spike, then decay' },
  primacy: { label: 'Primacy Adaptation', desc: 'Initial resistance, then adaptation' },
  sustained: { label: 'Sustained', desc: 'Stable effect over time' },
};

function effectCurve(type: string, magnitude: number, decayRate: number, week: number) {
  const mag = magnitude / 100;
  const t = week;
  const k = decayRate;
  if (type === 'novelty') {
    const steadyState = mag * Math.exp(-k * 12);
    const current = mag * Math.exp(-k * t);
    return { current, steadyState };
  }
  if (type === 'primacy') {
    const steadyState = mag;
    const current = mag * (1 - Math.exp(-k * t));
    return { current, steadyState };
  }
  // sustained
  return { current: mag, steadyState: mag };
}

const paramDefaults = { effectType: 'novelty', magnitude: 15, decayRate: 0.3, window: 8 };

export default function M14NoveltyTimeEffects() {
  const [p, set] = useAnimatedParams(paramDefaults);
  const { effectType, magnitude, decayRate, window } = p;
  const setEffectType = (v: string) => set('effectType', v);
  const setMagnitude = (v: number) => set('magnitude', v);
  const setDecayRate = (v: number) => set('decayRate', v);
  const setWindow = (v: number) => set('window', v);

  const data = useMemo(() => {
    const points = [];
    const weeks = 12;
    for (let w = 0; w <= weeks; w += 0.25) {
      const { current } = effectCurve(effectType, magnitude, decayRate, w);
      points.push({ week: w, effect: current * 100 });
    }

    const start = effectCurve(effectType, magnitude, decayRate, 0);
    const initial = effectCurve(effectType, magnitude, decayRate, 1);
    const atWindow = effectCurve(effectType, magnitude, decayRate, window);
    const steady = effectCurve(effectType, magnitude, decayRate, 12);
    const peakVal = Math.max(Math.abs(initial.current), Math.abs(steady.steadyState));
    const measurementBias =
      peakVal > 0 ? (Math.abs(initial.current - steady.steadyState) / peakVal) * 100 : 0;

    // Recommended wait: find week where 90% of the transition from t=0 to steady state has occurred
    let recWait = 12;
    const totalTransition = Math.abs(start.current - steady.steadyState);
    for (let w = 0.5; w <= 12; w += 0.5) {
      const { current, steadyState } = effectCurve(effectType, magnitude, decayRate, w);
      if (totalTransition < 0.0001 || Math.abs(current - steadyState) / totalTransition < 0.1) {
        recWait = w;
        break;
      }
    }

    return {
      points,
      initialEffect: initial.current * 100,
      steadyState: steady.steadyState * 100,
      atWindowEffect: atWindow.current * 100,
      measurementBias: Math.abs(measurementBias),
      recWait,
    };
  }, [effectType, magnitude, decayRate, window]);

  const W = 600,
    H = 240,
    pl = 56,
    pr = 30,
    pt = 30,
    pb = 40;
  const maxEffect = Math.max(magnitude * 1.2, 5);
  const toX = (w: number) => pl + (w / 12) * (W - pl - pr);
  const toY = (e: number) => H - pb - (e / maxEffect) * (H - pt - pb);

  let curvePath = '';
  data.points.forEach((pt, i) => {
    curvePath += (i === 0 ? 'M' : 'L') + toX(pt.week) + ',' + toY(pt.effect);
  });

  let fillPath = `M${toX(0)},${toY(0)}`;
  data.points.forEach((pt) => {
    fillPath += `L${toX(pt.week)},${toY(pt.effect)}`;
  });
  fillPath += `L${toX(12)},${toY(0)}Z`;

  const curveColor =
    effectType === 'novelty'
      ? colors.amber
      : effectType === 'primacy'
        ? colors.indigo
        : colors.emerald;

  const tooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < pl || vbX > W - pr) return null;
      const w = ((vbX - pl) / (W - pl - pr)) * 12;
      const closest = data.points.reduce(
        (best: { week: number; effect: number }, pt2: { week: number; effect: number }) =>
          Math.abs(pt2.week - w) < Math.abs(best.week - w) ? pt2 : best,
      );
      const sx = pl + (closest.week / 12) * (W - pl - pr);
      const sy = H - pb - (closest.effect / maxEffect) * (H - pt - pb);
      return {
        x: sx,
        y: sy,
        lines: [
          { label: 'Week', value: closest.week.toFixed(1), color: curveColor },
          { label: 'Effect', value: closest.effect.toFixed(1) + '%', color: curveColor },
          {
            label: 'Steady-State',
            value: data.steadyState.toFixed(1) + '%',
            color: colors.emerald,
          },
        ],
        markers: [{ y: sy, color: curveColor }],
      };
    },
    [data.points, data.steadyState, curveColor, maxEffect],
  );

  return (
    <div>
      <Hdr sub="Validate & Run">Novelty & Time Effects</Hdr>
      <Desc>
        Treatment effects are not always stable over time. Novelty effects inflate early results as
        users engage with anything new. Primacy effects bias toward the status quo as users resist
        change initially. Understanding these dynamics is critical for reading experiment results
        correctly.
      </Desc>

      <div className="flex gap-2 mb-6 flex-wrap">
        {Object.entries(effectTypes).map(([key, { label }]) => (
          <PillBtn key={key} on={effectType === key} onClick={() => setEffectType(key)}>
            {label}
          </PillBtn>
        ))}
      </div>

      <ChartBox
        h={H}
        label="Time series showing how novelty and primacy effects cause treatment impact to change over the experiment duration"
        tooltipLookup={tooltipLookup}
      >
        <defs>
          <linearGradient id="grad-time-13" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={curveColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={curveColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 2, 4, 6, 8, 10, 12].map((w) => (
          <g key={w}>
            <line x1={toX(w)} y1={pt} x2={toX(w)} y2={H - pb} stroke={sv.grid} strokeWidth={0.5} />
            <text x={toX(w)} y={H - pb + 14} fill={sv.textFaint} fontSize={9} textAnchor="middle">
              W{w}
            </text>
          </g>
        ))}

        {/* Steady state dashed line */}
        <line
          x1={pl}
          y1={toY(data.steadyState)}
          x2={W - pr}
          y2={toY(data.steadyState)}
          stroke={curveColor}
          strokeWidth={1.5}
          strokeDasharray="6,4"
          opacity={0.6}
        />
        <text
          x={W - pr + 4}
          y={toY(data.steadyState) - 4}
          fill={curveColor}
          fontSize={9}
          opacity={0.8}
        >
          Steady state
        </text>

        {/* Observation window marker */}
        <line
          x1={toX(window)}
          y1={pt}
          x2={toX(window)}
          y2={H - pb}
          stroke={colors.red}
          strokeWidth={1.5}
          strokeDasharray="4,3"
          opacity={0.7}
        />
        <text x={toX(window)} y={pt - 6} fill={colors.red} fontSize={9} textAnchor="middle">
          Read point
        </text>

        {/* Effect curve */}
        <path d={fillPath} fill="url(#grad-time-13)" />
        <path d={curvePath} fill="none" stroke={curveColor} strokeWidth={2.5} />

        {/* Measured point */}
        <circle cx={toX(window)} cy={toY(data.atWindowEffect)} r={5} fill={curveColor} />
        <text
          x={toX(window) + 10}
          y={toY(data.atWindowEffect) - 4}
          fill={curveColor}
          fontSize={10}
          fontWeight="600"
        >
          {data.atWindowEffect.toFixed(1)}%
        </text>

        {/* Axes */}
        <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />
        <line x1={pl} y1={pt} x2={pl} y2={H - pb} stroke={sv.axis} />
        <text x={W / 2} y={H - 6} fill={sv.textFaint} fontSize={10} textAnchor="middle">
          Weeks
        </text>
        <text
          x={14}
          y={(H - pt - pb) / 2 + pt}
          fill={sv.textFaint}
          fontSize={10}
          textAnchor="middle"
          transform={`rotate(-90,14,${(H - pt - pb) / 2 + pt})`}
        >
          Effect %
        </text>
      </ChartBox>

      <Sl
        label="Effect Magnitude (initial lift %)"
        value={magnitude}
        min={1}
        max={30}
        step={0.5}
        onChange={setMagnitude}
        fmt={(v) => v.toFixed(1) + '%'}
        color={curveColor}
      />
      <Sl
        label="Decay / Adaptation Rate"
        value={decayRate}
        min={0.05}
        max={1}
        step={0.05}
        onChange={setDecayRate}
        fmt={(v) => v.toFixed(2)}
        color={colors.amber}
      />
      <Sl
        label="Observation Window (weeks)"
        value={window}
        min={1}
        max={12}
        step={0.5}
        onChange={setWindow}
        fmt={(v) => v.toFixed(1) + ' wk'}
        color={colors.red}
      />

      <div className="flex gap-3 flex-wrap mt-6">
        <StatBox
          label="Initial Effect"
          value={data.initialEffect.toFixed(1) + '%'}
          color={curveColor}
        />
        <StatBox
          label="Steady-State"
          value={data.steadyState.toFixed(1) + '%'}
          color={colors.emerald}
        />
        <StatBox
          label="Measurement Bias"
          value={data.measurementBias.toFixed(0) + '%'}
          color={data.measurementBias > 20 ? colors.red : colors.amber}
        />
        <StatBox label="Rec. Wait" value={data.recWait.toFixed(1) + ' wk'} color={colors.indigo} />
      </div>

      <QA
        items={[
          {
            q: 'Our test showed +15% in week 1 but only +3% in week 4. What happened?',
            a: 'Classic novelty effect. The initial bump was users exploring the new feature out of curiosity. The sustained effect is +3%. This is the number you should use for your launch decision, not the exciting week-1 number.',
          },
          {
            q: 'How long should we wait before reading results?',
            a: 'At least 2-3 full business cycles (typically 2-4 weeks). Look for effect stabilization — when the daily/weekly effect stops trending and flattens. Also ensure you capture weekday and weekend behavior, as user patterns differ.',
          },
        ]}
      />
      <TechNote>
        Novelty effects are modeled as exponential decay: effect(t) = E₀·e^(-kt). Primacy effects
        follow exponential adaptation: effect(t) = E_ss·(1 - e^(-kt)). The measurement bias is the
        gap between what you measure at time t and the true long-run effect.
      </TechNote>
      <Insight>
        The most common mistake is reading experiment results too early. A +15% initial lift that
        decays to +3% is a 5x overestimate — enough to make a mediocre feature look like a
        game-changer. Always wait for effect stabilization before making launch decisions.
      </Insight>
    </div>
  );
}
