import { useState, useMemo } from 'react';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';

const BIAS_TYPES = [
  { key: 'clean', label: 'Clean Experiment' },
  { key: 'selection', label: 'Selection Bias' },
  { key: 'novelty', label: 'Novelty Effect' },
  { key: 'interference', label: 'Network Interference' },
];

const CONTROL_TRUE = 5.0;
const TREATMENT_TRUE = 5.8;
const TRUE_LIFT = TREATMENT_TRUE - CONTROL_TRUE; // 0.8pp

function computeRates(biasType, mag) {
  const f = mag / 100;
  let controlObs = CONTROL_TRUE;
  let treatmentObs = TREATMENT_TRUE;

  if (biasType === 'selection') {
    controlObs = CONTROL_TRUE + 1.5 * f;
  } else if (biasType === 'novelty') {
    treatmentObs = TREATMENT_TRUE + 1.2 * f;
  } else if (biasType === 'interference') {
    controlObs = CONTROL_TRUE + 0.4 * f;
  }

  const observedLift = treatmentObs - controlObs;
  return { controlObs, treatmentObs, observedLift };
}

function biasExplanation(biasType, mag) {
  if (biasType === 'clean') {
    return {
      explanation:
        'With proper randomization and no external interference, the observed rates match the true rates. The measured lift is real regardless of the slider position.',
      fix:
        'This is the ideal case. Maintain it by using proper randomization, stable unit IDs, and pre-registered metrics.',
    };
  }
  if (biasType === 'selection') {
    return {
      explanation:
        'Power users are overrepresented in the control group, inflating its observed rate. At high magnitude the control appears to outperform treatment, inverting the true lift entirely.',
      fix:
        'Use proper randomization on a stable user ID. Stratify by key covariates. Check for pre-experiment balance between groups.',
    };
  }
  if (biasType === 'novelty') {
    return {
      explanation:
        'Users engage more with the treatment simply because it is new. The observed treatment rate is inflated above its true long-run value. This extra lift will decay over time.',
      fix:
        'Run tests long enough for novelty to decay (2+ weeks). Use holdback groups. Compare new vs returning users within the treatment.',
    };
  }
  return {
    explanation:
      'Treatment effects spill over to the control group (e.g., treated users share content with control users). The control rate rises, diluting the observed lift below the true effect.',
    fix:
      'Use cluster-based randomization (randomize by region, team, etc.) to create buffer zones between groups. Consider switchback designs for marketplace experiments.',
  };
}

export default function M9ValidityThreats() {
  const [biasType, setBiasType] = useState('clean');
  const [mag, setMag] = useState(0);

  const { controlObs, treatmentObs, observedLift } = useMemo(
    () => computeRates(biasType, mag),
    [biasType, mag],
  );

  const biasStrength = useMemo(() => {
    if (TRUE_LIFT === 0) return 0;
    return Math.abs(observedLift - TRUE_LIFT) / TRUE_LIFT * 100;
  }, [observedLift]);

  const distortionDir = useMemo(() => {
    const diff = observedLift - TRUE_LIFT;
    if (Math.abs(diff) < 0.001) return 'None';
    return diff > 0 ? 'Inflated' : 'Deflated';
  }, [observedLift]);

  const { explanation, fix } = useMemo(
    () => biasExplanation(biasType, mag),
    [biasType, mag],
  );

  const isClean = biasType === 'clean';
  const hasBias = biasStrength > 0.5;
  const liftColor = hasBias ? colors.red : colors.emerald;

  // ---- Chart 1: Horizontal bar chart (observed vs true) ----
  const W = 600, H1 = 200;
  const pl = 100, pr = 50, pt = 40, pb = 30;
  const maxRate = Math.max(controlObs, treatmentObs, CONTROL_TRUE, TREATMENT_TRUE, 4) * 1.35;
  const toX1 = (v) => pl + (v / maxRate) * (W - pl - pr);
  const barH = 28;
  const gap = 20;
  const y1 = pt + 20;
  const y2 = y1 + barH + gap;

  // ---- Chart 2: Divergence line chart ----
  const H2 = 160;
  const pl2 = 60, pr2 = 30, pt2 = 25, pb2 = 35;
  const plotW = W - pl2 - pr2;
  const plotH = H2 - pt2 - pb2;

  // Pre-compute observed lift across the full magnitude range for the curve
  const curvePoints = useMemo(() => {
    const pts = [];
    for (let m = 0; m <= 100; m += 1) {
      const { observedLift: ol } = computeRates(biasType, m);
      pts.push({ m, lift: ol });
    }
    return pts;
  }, [biasType]);

  // Y-axis range for divergence chart — ensure we capture full curve plus true lift and zero
  const allLifts = curvePoints.map((p) => p.lift);
  const liftMin = Math.min(...allLifts, 0, TRUE_LIFT) - 0.2;
  const liftMax = Math.max(...allLifts, 0, TRUE_LIFT) + 0.2;

  const toX2 = (m) => pl2 + (m / 100) * plotW;
  const toY2 = (l) => pt2 + plotH - ((l - liftMin) / (liftMax - liftMin)) * plotH;

  // Build SVG path for the curve
  const curvePath = useMemo(() => {
    return curvePoints
      .map((p, i) => (i === 0 ? 'M' : 'L') + toX2(p.m).toFixed(1) + ',' + toY2(p.lift).toFixed(1))
      .join(' ');
  }, [curvePoints, liftMin, liftMax]);

  // Current dot position
  const dotX = toX2(mag);
  const dotY = toY2(observedLift);

  // Curve color based on bias type
  const curveColor =
    biasType === 'clean'
      ? colors.emerald
      : biasType === 'selection'
        ? colors.red
        : biasType === 'novelty'
          ? colors.amber
          : colors.indigo;

  return (
    <div>
      <Hdr sub="Validate & Run">Validity Threats Simulator</Hdr>
      <Desc>
        Even well-intentioned experiments can go wrong. Selection bias, novelty effects, and network
        interference can all distort your results. Choose a bias type and drag the magnitude slider
        to see how increasing distortion warps what you observe versus what is actually true.
      </Desc>

      {/* Bias type selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {BIAS_TYPES.map(({ key, label }) => (
          <PillBtn
            key={key}
            on={biasType === key}
            onClick={() => { setBiasType(key); if (key === 'clean') setMag(0); }}
          >
            {label}
          </PillBtn>
        ))}
      </div>

      {/* Magnitude slider */}
      <Sl
        label="Bias Magnitude"
        value={isClean ? 0 : mag}
        min={0}
        max={100}
        step={1}
        onChange={(v) => { if (!isClean) setMag(v); }}
        fmt={(v) => (isClean ? '— (no effect)' : v + '%')}
        color={isClean ? colors.slate500 : curveColor}
      />

      {/* StatBoxes */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <StatBox
          label="Observed Lift"
          value={(observedLift >= 0 ? '+' : '') + observedLift.toFixed(2) + 'pp'}
          color={liftColor}
        />
        <StatBox
          label="True Lift"
          value={'+' + TRUE_LIFT.toFixed(2) + 'pp'}
          color={colors.emerald}
        />
        <StatBox
          label="Bias Strength"
          value={biasStrength.toFixed(1) + '%'}
          color={hasBias ? colors.amber : colors.slate400}
        />
        <StatBox
          label="Distortion"
          value={distortionDir}
          color={
            distortionDir === 'None'
              ? colors.emerald
              : distortionDir === 'Inflated'
                ? colors.amber
                : colors.red
          }
        />
      </div>

      {/* Chart 1: Observed vs True horizontal bars */}
      <ChartBox h={H1}>
        {/* Title */}
        <text x={W / 2} y={18} fill={liftColor} fontSize={12} textAnchor="middle" fontWeight="700">
          {'Observed Lift: ' + (observedLift >= 0 ? '+' : '') + observedLift.toFixed(2) + 'pp   |   True Lift: +' + TRUE_LIFT.toFixed(1) + 'pp'}
        </text>

        {/* Control row */}
        <text x={pl - 8} y={y1 + barH / 2 + 4} fill={colors.indigo} fontSize={11} textAnchor="end" fontWeight="600">
          Control (A)
        </text>
        <rect
          x={toX1(0)}
          y={y1}
          width={Math.max(toX1(controlObs) - toX1(0), 2)}
          height={barH}
          rx={6}
          fill={colors.indigo}
          opacity={0.7}
        />
        <text x={toX1(controlObs) + 8} y={y1 + barH / 2 + 4} fill={colors.indigo} fontSize={11} fontWeight="700">
          {controlObs.toFixed(2) + '%'}
        </text>
        {/* True control dashed line */}
        {Math.abs(controlObs - CONTROL_TRUE) > 0.005 && (
          <line
            x1={toX1(CONTROL_TRUE)}
            y1={y1 - 4}
            x2={toX1(CONTROL_TRUE)}
            y2={y1 + barH + 4}
            stroke={sv.text}
            strokeWidth={2}
            strokeDasharray="4,3"
          />
        )}

        {/* Treatment row */}
        <text x={pl - 8} y={y2 + barH / 2 + 4} fill={colors.emerald} fontSize={11} textAnchor="end" fontWeight="600">
          Treatment (B)
        </text>
        <rect
          x={toX1(0)}
          y={y2}
          width={Math.max(toX1(treatmentObs) - toX1(0), 2)}
          height={barH}
          rx={6}
          fill={colors.emerald}
          opacity={0.7}
        />
        <text x={toX1(treatmentObs) + 8} y={y2 + barH / 2 + 4} fill={colors.emerald} fontSize={11} fontWeight="700">
          {treatmentObs.toFixed(2) + '%'}
        </text>
        {/* True treatment dashed line */}
        {Math.abs(treatmentObs - TREATMENT_TRUE) > 0.005 && (
          <line
            x1={toX1(TREATMENT_TRUE)}
            y1={y2 - 4}
            x2={toX1(TREATMENT_TRUE)}
            y2={y2 + barH + 4}
            stroke={sv.text}
            strokeWidth={2}
            strokeDasharray="4,3"
          />
        )}

        {/* Legend for dashed lines */}
        {(Math.abs(controlObs - CONTROL_TRUE) > 0.005 || Math.abs(treatmentObs - TREATMENT_TRUE) > 0.005) && (
          <text x={W - pr} y={H1 - 4} fill={sv.text} fontSize={9} textAnchor="end">
            Dashed lines = true rates
          </text>
        )}

        {/* X axis */}
        <line x1={pl} y1={H1 - pb} x2={W - pr} y2={H1 - pb} stroke={sv.axis} />
      </ChartBox>

      {/* Chart 2: Divergence chart — Lift vs Magnitude */}
      <ChartBox h={H2}>
        {/* Title */}
        <text x={W / 2} y={14} fill={sv.text} fontSize={11} textAnchor="middle" fontWeight="600">
          Observed Lift vs Bias Magnitude
        </text>

        {/* Y axis */}
        <line x1={pl2} y1={pt2} x2={pl2} y2={H2 - pb2} stroke={sv.axis} />
        {/* X axis */}
        <line x1={pl2} y1={H2 - pb2} x2={W - pr2} y2={H2 - pb2} stroke={sv.axis} />

        {/* Y-axis tick labels */}
        {[liftMin, (liftMin + liftMax) / 2, liftMax].map((v, i) => (
          <text
            key={i}
            x={pl2 - 6}
            y={toY2(v) + 3}
            fill={sv.text}
            fontSize={9}
            textAnchor="end"
          >
            {v.toFixed(1)}
          </text>
        ))}
        <text x={pl2 - 6} y={pt2 - 8} fill={sv.text} fontSize={8} textAnchor="end">
          Lift (pp)
        </text>

        {/* X-axis tick labels */}
        {[0, 25, 50, 75, 100].map((m) => (
          <text
            key={m}
            x={toX2(m)}
            y={H2 - pb2 + 14}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {m + '%'}
          </text>
        ))}
        <text x={W - pr2} y={H2 - pb2 + 26} fill={sv.text} fontSize={8} textAnchor="end">
          Bias Magnitude
        </text>

        {/* Reference line: true lift */}
        <line
          x1={pl2}
          y1={toY2(TRUE_LIFT)}
          x2={W - pr2}
          y2={toY2(TRUE_LIFT)}
          stroke={colors.emerald}
          strokeWidth={1.5}
          strokeDasharray="6,4"
          opacity={0.6}
        />
        <text
          x={W - pr2 + 2}
          y={toY2(TRUE_LIFT) + 3}
          fill={colors.emerald}
          fontSize={8}
          opacity={0.7}
        >
          True
        </text>

        {/* Reference line: zero */}
        <line
          x1={pl2}
          y1={toY2(0)}
          x2={W - pr2}
          y2={toY2(0)}
          stroke={sv.text}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.4}
        />
        <text
          x={W - pr2 + 2}
          y={toY2(0) + 3}
          fill={sv.text}
          fontSize={8}
          opacity={0.5}
        >
          0
        </text>

        {/* Observed lift curve */}
        <path d={curvePath} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Current position dot */}
        <circle
          cx={dotX}
          cy={dotY}
          r={5}
          fill={curveColor}
          stroke={sv.appBg}
          strokeWidth={2}
        />

        {/* Value label at dot */}
        <text
          x={dotX}
          y={dotY - 10}
          fill={curveColor}
          fontSize={10}
          textAnchor="middle"
          fontWeight="700"
        >
          {(observedLift >= 0 ? '+' : '') + observedLift.toFixed(2)}
        </text>
      </ChartBox>

      {/* Novelty time-decay note */}
      {biasType === 'novelty' && mag > 0 && (
        <div className="rounded-xl p-4 mb-5 border bg-amber-400/[0.04] border-amber-400/20">
          <div className="text-[11px] uppercase tracking-widest mb-1 font-bold" style={{ color: colors.amber }}>
            Time-Decay Warning
          </div>
          <div className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">
            Novelty-driven lift decays over time as users habituate to the new experience. The
            inflated observed rate of {treatmentObs.toFixed(2)}% will converge toward the true rate of{' '}
            {TREATMENT_TRUE.toFixed(1)}% over 2-4 weeks. Always run experiments long enough for this
            decay to stabilize before making ship decisions.
          </div>
        </div>
      )}

      {/* Explanation box */}
      <div
        className={
          'rounded-xl p-5 mb-5 border ' +
          (hasBias
            ? 'bg-red-400/[0.04] border-red-400/20'
            : 'bg-emerald-400/[0.04] border-emerald-400/20')
        }
      >
        <div
          className="text-[11px] uppercase tracking-widest mb-2 font-bold"
          style={{ color: liftColor }}
        >
          {hasBias ? 'What Went Wrong' : 'No Bias Detected'}
        </div>
        <div className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-3">{explanation}</div>
        <div className="text-[11px] uppercase tracking-widest mb-1 font-bold text-[var(--svg-text)]">
          How to Fix
        </div>
        <div className="text-[13px] text-[var(--svg-text)] leading-relaxed">{fix}</div>
      </div>

      <QA
        items={[
          {
            q: 'How do we prevent these biases?',
            a: 'Proper randomization prevents selection bias. Running tests long enough counters novelty effects. Cluster-based randomization (e.g., by geography or social network) mitigates interference. Pre-registration of metrics and analysis plans prevents post-hoc rationalization.',
          },
          {
            q: 'Can we detect these after the fact?',
            a: "Sometimes. Check pre-experiment balance (are groups comparable on baseline metrics?). Look for time trends in the treatment effect (novelty decays over time). Compare effects in connected vs. isolated users (interference). But prevention is always better than detection.",
          },
          {
            q: 'Why does the slider not affect the clean experiment?',
            a: 'In a properly randomized clean experiment, there is no mechanism for bias to enter. The slider represents the magnitude of a specific bias type — when no bias is present, there is nothing to amplify.',
          },
        ]}
      />
      <TechNote>
        SUTVA (Stable Unit Treatment Value Assumption) requires no interference between units and no
        hidden variations of treatment. Violations are common in social, marketplace, and content
        platforms. Always assess whether your randomization unit is appropriate. The bias magnitude
        model here is linear for illustration — real-world distortions may be nonlinear.
      </TechNote>
      <Insight>
        The scariest validity threats are the ones you don't notice. A biased experiment that looks
        clean will confidently point you in the wrong direction. Building checks for these threats
        into your experimentation platform is more valuable than running more tests. Use the
        divergence chart to build intuition for how quickly small biases compound into misleading
        conclusions.
      </Insight>
    </div>
  );
}
