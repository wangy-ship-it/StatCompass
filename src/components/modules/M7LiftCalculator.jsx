import { useState, useMemo } from 'react';
import { liftCI } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, QA, TechNote, Insight } from '../ui';

export default function M7LiftCalculator() {
  const [controlRate, setControlRate] = useState(10);
  const [treatmentRate, setTreatmentRate] = useState(12);
  const [sampleSize, setSampleSize] = useState(5000);

  const result = useMemo(() => {
    const pC = controlRate / 100;
    const pT = treatmentRate / 100;
    return liftCI(pC, pT, sampleSize);
  }, [controlRate, treatmentRate, sampleSize]);

  const W = 600, H = 160, pl = 60, pr = 60, pt = 30, pb = 40;
  const maxAbs = Math.max(Math.abs(result.ciLo), Math.abs(result.ciHi), 0.05);
  const range = maxAbs * 1.5;
  const toX = (v) => pl + ((v + range) / (2 * range)) * (W - pl - pr);
  const midY = (pt + H - pb) / 2;
  const significant = result.significant;
  const barColor = significant
    ? (result.absLift > 0 ? colors.emerald : colors.red)
    : colors.indigo;

  return (
    <div>
      <Hdr sub="Interpret & Decide">Lift Calculator</Hdr>
      <Desc>
        Lift measures how much your treatment moved the needle compared to the control. This
        calculator shows the absolute and relative lift with confidence intervals — so you know not
        just the point estimate, but the range of plausible values.
      </Desc>

      <ChartBox h={H}>
          {/* Zero line */}
          <line x1={toX(0)} y1={pt - 10} x2={toX(0)} y2={H - pb + 10} stroke={sv.text} strokeWidth={1.5} strokeDasharray="6,4" />
          <text x={toX(0)} y={pt - 14} fill={sv.text} fontSize={9} textAnchor="middle">
            No Effect
          </text>

          {/* CI whiskers */}
          <line x1={toX(result.ciLo)} y1={midY} x2={toX(result.ciHi)} y2={midY} stroke={barColor} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
          <line x1={toX(result.ciLo)} y1={midY - 12} x2={toX(result.ciLo)} y2={midY + 12} stroke={barColor} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
          <line x1={toX(result.ciHi)} y1={midY - 12} x2={toX(result.ciHi)} y2={midY + 12} stroke={barColor} strokeWidth={2} strokeLinecap="round" opacity={0.6} />

          {/* Point estimate diamond */}
          <polygon
            points={[
              toX(result.absLift) + ',' + (midY - 10),
              (toX(result.absLift) + 8) + ',' + midY,
              toX(result.absLift) + ',' + (midY + 10),
              (toX(result.absLift) - 8) + ',' + midY,
            ].join(' ')}
            fill={barColor}
          />

          {/* Labels */}
          <text x={toX(result.ciLo)} y={midY + 28} fill={sv.text} fontSize={9} textAnchor="middle">
            {(result.ciLo * 100).toFixed(2) + 'pp'}
          </text>
          <text x={toX(result.ciHi)} y={midY + 28} fill={sv.text} fontSize={9} textAnchor="middle">
            {(result.ciHi * 100).toFixed(2) + 'pp'}
          </text>
          <text x={toX(result.absLift)} y={midY - 18} fill={barColor} fontSize={11} textAnchor="middle" fontWeight="700">
            {(result.absLift > 0 ? '+' : '') + (result.absLift * 100).toFixed(2) + 'pp'}
          </text>

          {/* Axis */}
          <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />
          {[-range, -range / 2, 0, range / 2, range].map((v, i) => (
            <text key={i} x={toX(v)} y={H - pb + 14} fill={sv.text} fontSize={9} textAnchor="middle">
              {(v * 100).toFixed(1) + 'pp'}
            </text>
          ))}

          {/* Significance badge */}
          <text
            x={W - pr}
            y={pt - 5}
            fill={significant ? (result.absLift > 0 ? colors.emerald : colors.red) : sv.text}
            fontSize={11}
            textAnchor="end"
            fontWeight="700"
          >
            {significant ? (result.absLift > 0 ? '✓ Significant Positive' : '✗ Significant Negative') : '— Not Significant'}
          </text>
      </ChartBox>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox label="Relative Lift" value={(result.relLift > 0 ? '+' : '') + result.relLift.toFixed(1) + '%'} color={barColor} />
        <StatBox label="Absolute Lift" value={(result.absLift > 0 ? '+' : '') + (result.absLift * 100).toFixed(2) + 'pp'} color={barColor} />
        <StatBox label="P-value" value={result.pValue < 0.0001 ? '< 0.0001' : result.pValue.toFixed(4)} color={result.pValue < 0.05 ? colors.emerald : colors.slate400} />
        <StatBox label="95% CI" value={(result.ciLo * 100).toFixed(2) + ' to ' + (result.ciHi * 100).toFixed(2) + 'pp'} color={colors.slate400} />
      </div>

      <Sl label="Control Conversion Rate" value={controlRate} min={1} max={50} step={0.5} onChange={setControlRate} fmt={(v) => v.toFixed(1) + '%'} color={colors.indigo} />
      <Sl label="Treatment Conversion Rate" value={treatmentRate} min={1} max={50} step={0.5} onChange={setTreatmentRate} fmt={(v) => v.toFixed(1) + '%'} color={colors.emerald} />
      <Sl label="Sample Size per Group" value={sampleSize} min={100} max={100000} step={100} onChange={setSampleSize} fmt={(v) => v.toLocaleString()} color={colors.slate400} />

      <QA
        items={[
          {
            q: 'A 16% relative lift sounds huge — should we ship?',
            a: 'Relative lift can be misleading with small base rates. Going from 0.1% to 0.116% is a 16% relative lift but only 0.016pp absolute. Always check the absolute lift and confidence interval — they tell you the practical impact and your certainty.',
          },
          {
            q: 'The CI is really wide — what does that mean?',
            a: "A wide CI means high uncertainty. The true effect could be anywhere in that range. You need more data (larger sample size) to narrow it. Don't make ship/no-ship decisions when the CI spans both meaningful positive and negative values.",
          },
        ]}
      />
      <TechNote>
        Lift CI uses the Wald method: SE = √(p₁(1−p₁)/n + p₂(1−p₂)/n). For small samples or
        extreme proportions, consider Wilson or exact methods. Always report both absolute and
        relative lift — relative alone can be misleading.
      </TechNote>
      <Insight>
        The confidence interval is more useful than the point estimate. A 2pp lift with CI [1.5, 2.5]
        is much more actionable than a 5pp lift with CI [-1, 11]. Width of the CI reflects how much
        you really know.
      </Insight>
    </div>
  );
}
