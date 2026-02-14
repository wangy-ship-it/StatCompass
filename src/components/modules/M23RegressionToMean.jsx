import { useState, useMemo } from 'react';
import { sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, QA, TechNote, Insight } from '../ui';

export default function M23RegressionToMean() {
  const [nUnits, setNUnits] = useState(30);
  const [noise, setNoise] = useState(0.5);
  const [seed, setSeed] = useState(1);

  const data = useMemo(() => {
    const trueMeans = [];
    for (let i = 0; i < nUnits; i++) {
      trueMeans.push(50 + (sR(i * 17 + 3) - 0.5) * 30);
    }

    const noiseSD = noise * 20;
    const m1 = trueMeans.map((m, i) => m + (sR(i * 31 + seed * 97) - 0.5) * 2 * noiseSD);
    const m2 = trueMeans.map((m, i) => m + (sR(i * 53 + seed * 149 + 1000) - 0.5) * 2 * noiseSD);

    // Find bottom 20%
    const sortedIndices = m1.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const bottomCount = Math.max(2, Math.floor(nUnits * 0.2));
    const bottomIndices = new Set(sortedIndices.slice(0, bottomCount).map((d) => d.i));

    const bottomM1Avg = sortedIndices.slice(0, bottomCount).reduce((s, d) => s + d.v, 0) / bottomCount;
    const bottomM2Avg = sortedIndices.slice(0, bottomCount).reduce((s, d) => s + m2[d.i], 0) / bottomCount;
    const apparentImprovement = bottomM2Avg - bottomM1Avg;

    return { m1, m2, trueMeans, bottomIndices, bottomM1Avg, bottomM2Avg, apparentImprovement };
  }, [nUnits, noise, seed]);

  // Scatter plot
  const W = 600, H = 340, pl = 50, pr = 30, pt = 30, pb = 44;
  const allVals = [...data.m1, ...data.m2];
  const mn = Math.min(...allVals) - 5;
  const mx = Math.max(...allVals) + 5;
  const toX = (v) => pl + ((v - mn) / (mx - mn)) * (W - pl - pr);
  const toY = (v) => H - pb - ((v - mn) / (mx - mn)) * (H - pt - pb);

  return (
    <div>
      <Hdr sub="Interpret & Decide">Regression to the Mean</Hdr>
      <Desc>
        Extreme observations tend to move toward the average on subsequent measurement — not because
        of any intervention, but because of natural variation. Selecting the worst performers and
        re-measuring them will almost always show improvement, even with zero treatment effect.
      </Desc>

      <ChartBox h={H}>
        {/* Identity line */}
        <line x1={toX(mn)} y1={toY(mn)} x2={toX(mx)} y2={toY(mx)} stroke={sv.axis} strokeWidth={1} strokeDasharray="6,4" opacity={0.5} />

        {/* Points */}
        {data.m1.map((v, i) => {
          const isBottom = data.bottomIndices.has(i);
          return (
            <circle
              key={i}
              cx={toX(v)}
              cy={toY(data.m2[i])}
              r={isBottom ? 6 : 4}
              fill={isBottom ? colors.red : colors.indigo}
              opacity={isBottom ? 0.9 : 0.5}
              stroke={isBottom ? colors.red : 'none'}
              strokeWidth={isBottom ? 2 : 0}
            />
          );
        })}

        {/* Axes */}
        <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />
        <line x1={pl} y1={pt} x2={pl} y2={H - pb} stroke={sv.axis} />
        <text x={W / 2} y={H - 8} fill={sv.textFaint} fontSize={10} textAnchor="middle">Measurement 1</text>
        <text x={14} y={(H - pt - pb) / 2 + pt} fill={sv.textFaint} fontSize={10} textAnchor="middle" transform={`rotate(-90,14,${(H - pt - pb) / 2 + pt})`}>Measurement 2</text>

        {/* Legend */}
        <circle cx={pl + 16} cy={pt + 6} r={4} fill={colors.indigo} opacity={0.5} />
        <text x={pl + 26} y={pt + 10} fill={sv.text} fontSize={10}>All units</text>
        <circle cx={pl + 110} cy={pt + 6} r={6} fill={colors.red} opacity={0.9} />
        <text x={pl + 122} y={pt + 10} fill={colors.red} fontSize={10} fontWeight="600">Bottom 20% (M1)</text>

        {/* Diagonal label */}
        <text x={toX(mx) - 10} y={toY(mx) + 16} fill={sv.textFaint} fontSize={9} textAnchor="end">y = x (no change)</text>
      </ChartBox>

      <Sl label="Number of Units" value={nUnits} min={10} max={50} step={1} onChange={setNUnits} color={colors.indigo} />
      <Sl label="Measurement Noise" value={noise} min={0.05} max={1} step={0.05} onChange={setNoise} fmt={(v) => v <= 0.3 ? 'Low' : v <= 0.6 ? 'Medium' : 'High'} color={colors.amber} />

      <button
        onClick={() => setSeed((s) => s + 1)}
        className="w-full mt-2 mb-6 py-3 rounded-xl text-[14px] font-medium cursor-pointer transition-all duration-200 bg-app-glass text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-subtle)] hover:ring-[var(--color-border)] active:scale-[0.98]"
      >
        Re-measure (new random draw)
      </button>

      <div className="flex gap-3 flex-wrap">
        <StatBox label="Bottom 20% M1 Avg" value={data.bottomM1Avg.toFixed(1)} color={colors.red} />
        <StatBox label="Bottom 20% M2 Avg" value={data.bottomM2Avg.toFixed(1)} color={colors.amber} />
        <StatBox label="Apparent Improvement" value={(data.apparentImprovement > 0 ? '+' : '') + data.apparentImprovement.toFixed(1)} color={data.apparentImprovement > 0 ? colors.emerald : colors.red} />
        <StatBox label="True Effect" value="0" color={colors.indigo} />
      </div>

      <QA
        items={[
          {
            q: 'We picked the worst-performing stores and gave them training. They improved! Was it the training?',
            a: 'Maybe not. You would see improvement even without training due to regression to the mean. The stores that scored lowest likely had bad luck in measurement — their true performance is higher, so a second measurement naturally looks better. You need a randomized control group to isolate the training effect.',
          },
          {
            q: 'How do we avoid this trap?',
            a: 'Always use a randomized control group. Never select units based on pre-treatment performance without accounting for regression. If you must select extreme performers, compare them to a control group of similarly extreme performers who did not receive treatment.',
          },
        ]}
      />
      <TechNote>
        Regression to the mean occurs whenever there is imperfect correlation between measurements.
        The expected regression is proportional to (1 - ρ), where ρ is the test-retest correlation.
        With ρ = 0.7, a unit one standard deviation below the mean in M1 is expected to be only 0.7
        SD below in M2 — a 30% apparent improvement with zero intervention.
      </TechNote>
      <Insight>
        This is one of the most common statistical traps in business. Any time someone selects the
        worst performers, intervenes, and celebrates their improvement — check for regression to the
        mean. The red dots above the diagonal line are not improving; they are simply returning to
        their natural baseline.
      </Insight>
    </div>
  );
}
