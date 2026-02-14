import { useState, useMemo } from 'react';
import { nCDF, zInv } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, QA, TechNote, Insight } from '../ui';

export default function M21PracticalSignificance() {
  const [effect, setEffect] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(10000);
  const [mwe, setMwe] = useState(0.5);

  const data = useMemo(() => {
    const effectFrac = effect / 100;
    const mweFrac = mwe / 100;
    const p = 0.1;
    const se = Math.sqrt((2 * p * (1 - p)) / sampleSize);
    const z = effectFrac / se;
    const pValue = 2 * (1 - nCDF(Math.abs(z), 0, 1));
    const significant = pValue < 0.05;
    const zCrit = zInv(0.05);
    const ciLo = effectFrac - zCrit * se;
    const ciHi = effectFrac + zCrit * se;
    const ciWidth = ciHi - ciLo;
    const practical = effectFrac >= mweFrac;
    const ratio = mweFrac > 0 ? effectFrac / mweFrac : 0;

    let verdict;
    if (significant && practical) verdict = 'Significant & Practical';
    else if (significant && !practical) verdict = 'Significant but Trivial';
    else if (!significant && effectFrac >= mweFrac * 0.5) verdict = 'Not Significant, Promising';
    else verdict = 'Not Significant & Trivial';

    let quadrant;
    if (significant && practical) quadrant = 0;
    else if (significant && !practical) quadrant = 1;
    else if (!significant && effectFrac >= mweFrac * 0.5) quadrant = 2;
    else quadrant = 3;

    return { effectFrac, mweFrac, se, pValue, significant, ciLo, ciHi, ciWidth, practical, ratio, verdict, quadrant };
  }, [effect, sampleSize, mwe]);

  const W = 600, H = 200, pl = 60, pr = 60, pt = 50, pb = 40;
  const maxAbs = Math.max(Math.abs(data.ciLo), Math.abs(data.ciHi), data.mweFrac * 1.5, 0.01);
  const range = maxAbs * 1.3;
  const toX = (v) => pl + ((v + range) / (2 * range)) * (W - pl - pr);
  const cy = pt + (H - pt - pb) / 2;
  const zeroX = toX(0);
  const mweX = toX(data.mweFrac);
  const ciLoX = toX(data.ciLo);
  const ciHiX = toX(data.ciHi);
  const effectX = toX(data.effectFrac);

  const quadrantColors = [colors.emerald, colors.amber, colors.indigo, colors.red];
  const quadrantLabels = ['Significant & Practical', 'Significant but Trivial', 'Not Significant, Promising', 'Not Significant & Trivial'];

  return (
    <div>
      <Hdr sub="Analyze">Practical vs Statistical Significance</Hdr>
      <Desc>
        A result can be statistically significant but practically meaningless — a tiny effect detected
        with a massive sample. Or it can be practically important but not yet detectable with your
        current data. Always define a Minimum Worthwhile Effect (MWE) before running a test.
      </Desc>

      <ChartBox h={H}>
        {/* Zero line */}
        <line x1={zeroX} y1={pt - 10} x2={zeroX} y2={H - pb + 10} stroke={sv.axis} strokeWidth={1.5} />
        <text x={zeroX} y={pt - 16} fill={sv.text} fontSize={10} textAnchor="middle">0</text>

        {/* MWE threshold zone */}
        <rect x={mweX} y={pt} width={W - pr - mweX} height={H - pt - pb} fill={colors.emerald} opacity={0.06} rx={4} />
        <line x1={mweX} y1={pt - 10} x2={mweX} y2={H - pb + 10} stroke={colors.emerald} strokeWidth={2} strokeDasharray="6,4" />
        <text x={mweX} y={pt - 16} fill={colors.emerald} fontSize={10} textAnchor="middle" fontWeight="600">MWE</text>

        {/* CI bar */}
        <line x1={ciLoX} y1={cy} x2={ciHiX} y2={cy} stroke={data.quadrant === 0 ? colors.emerald : data.quadrant === 1 ? colors.amber : colors.indigo} strokeWidth={4} strokeLinecap="round" />
        {/* CI endpoints */}
        <line x1={ciLoX} y1={cy - 10} x2={ciLoX} y2={cy + 10} stroke={data.quadrant === 0 ? colors.emerald : data.quadrant === 1 ? colors.amber : colors.indigo} strokeWidth={2} />
        <line x1={ciHiX} y1={cy - 10} x2={ciHiX} y2={cy + 10} stroke={data.quadrant === 0 ? colors.emerald : data.quadrant === 1 ? colors.amber : colors.indigo} strokeWidth={2} />
        {/* Point estimate */}
        <circle cx={effectX} cy={cy} r={5} fill={data.quadrant === 0 ? colors.emerald : data.quadrant === 1 ? colors.amber : colors.indigo} />

        {/* CI labels */}
        <text x={ciLoX} y={cy + 26} fill={sv.textFaint} fontSize={9} textAnchor="middle">{(data.ciLo * 100).toFixed(2)}%</text>
        <text x={ciHiX} y={cy + 26} fill={sv.textFaint} fontSize={9} textAnchor="middle">{(data.ciHi * 100).toFixed(2)}%</text>
        <text x={effectX} y={cy - 16} fill={sv.text} fontSize={10} textAnchor="middle" fontWeight="600">{(data.effectFrac * 100).toFixed(2)}%</text>

        {/* Axis */}
        <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />
        <text x={W / 2} y={H - 8} fill={sv.textFaint} fontSize={10} textAnchor="middle">Observed Effect Size</text>
      </ChartBox>

      {/* Quadrant indicator */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quadrantLabels.map((label, i) => (
          <div
            key={i}
            className={'rounded-xl px-4 py-3 text-center text-[13px] ring-1 transition-all duration-300 ' +
              (data.quadrant === i
                ? 'ring-2 font-semibold'
                : 'ring-[var(--color-border-subtle)] opacity-40')}
            style={data.quadrant === i ? { color: quadrantColors[i], '--tw-ring-color': quadrantColors[i] } : {}}
          >
            {label}
          </div>
        ))}
      </div>

      <Sl label="Observed Effect Size (%)" value={effect} min={0.01} max={5} step={0.01} onChange={setEffect} fmt={(v) => v.toFixed(2) + '%'} color={colors.indigo} />
      <Sl label="Sample Size (per group)" value={sampleSize} min={100} max={1000000} step={100} onChange={setSampleSize} fmt={(v) => v.toLocaleString()} color={colors.emerald} />
      <Sl label="Min Worthwhile Effect — MWE (%)" value={mwe} min={0.1} max={2} step={0.01} onChange={setMwe} fmt={(v) => v.toFixed(2) + '%'} color={colors.amber} />

      <div className="flex gap-3 flex-wrap mt-6">
        <StatBox label="p-value" value={data.pValue < 0.001 ? '<0.001' : data.pValue.toFixed(4)} color={data.significant ? colors.emerald : colors.red} />
        <StatBox label="CI Width" value={(data.ciWidth * 100).toFixed(3) + '%'} color={colors.indigo} />
        <StatBox label="Effect / MWE" value={data.ratio.toFixed(2) + 'x'} color={colors.amber} />
        <StatBox label="Verdict" value={data.verdict} color={quadrantColors[data.quadrant]} />
      </div>

      <QA
        items={[
          {
            q: 'Our test is significant at p=0.03 — should we ship?',
            a: 'Not necessarily. Check if the effect exceeds your MWE. A statistically significant but tiny effect (e.g., +0.01% lift on a metric) may not justify the engineering and maintenance cost of shipping the change.',
          },
          {
            q: 'The effect is huge but p=0.15 — was the test a failure?',
            a: 'Not necessarily. You may be underpowered. The confidence interval tells you more than the p-value alone. If the CI includes your MWE and you simply need more data, consider extending the test rather than abandoning it.',
          },
        ]}
      />
      <TechNote>
        Statistical significance depends on sample size — with enough users, even a 0.001% effect
        becomes significant. Practical significance depends on business context. Always set your MWE
        before the experiment to avoid post-hoc rationalization.
      </TechNote>
      <Insight>
        The four quadrants frame every experiment result: significant + practical means ship it;
        significant + trivial means the effect is real but not worth it; not significant + promising
        means collect more data; not significant + trivial means move on to the next idea.
      </Insight>
    </div>
  );
}
