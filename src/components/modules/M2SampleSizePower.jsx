import { useState, useMemo } from 'react';
import { nCDF, zInv } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, QA, TechNote, Insight } from '../ui';

export default function M2SampleSizePower() {
  const [eff, setEff] = useState(0.5);
  const [alp, setAlp] = useState(0.05);
  const pts = useMemo(() => {
    const cz = zInv(alp);
    return Array.from({ length: 99 }, (_, i) => {
      const n = 10 + i * 5;
      const se = 1 / Math.sqrt(n);
      return { n, p: Math.min(1 - nCDF(cz, eff / se, 1), 1) };
    });
  }, [eff, alp]);

  const W = 600, H = 240, pl = 48, pr = 20, pt = 16, pb = 38;
  const toX = (n) => pl + ((n - 10) / 490) * (W - pl - pr);
  const toY = (p) => H - pb - p * (H - pt - pb);
  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + toX(p.n) + ',' + toY(p.p)).join('');
  const area = line + 'L' + toX(500) + ',' + toY(0) + 'L' + toX(10) + ',' + toY(0) + 'Z';
  const n80 = pts.find((p) => p.p >= 0.8);

  return (
    <div>
      <Hdr sub="Design">Sample Size and Statistical Power</Hdr>
      <Desc>
        Power is your ability to detect a real effect. Think of sample size like camera resolution —
        too few users and the picture is blurry. This curve shows how confidence grows as you add
        more data.
      </Desc>

      <ChartBox h={H}>
        {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
          <g key={v}>
            <line x1={pl} y1={toY(v)} x2={W - pr} y2={toY(v)} stroke={sv.grid} />
            <text x={pl - 5} y={toY(v) + 3} fill={sv.text} fontSize={9} textAnchor="end">
              {v * 100 + '%'}
            </text>
          </g>
        ))}
        {[50, 100, 200, 300, 400, 500].map((v) => (
          <text key={v} x={toX(v)} y={H - pb + 14} fill={sv.text} fontSize={9} textAnchor="middle">
            {v}
          </text>
        ))}
        <line x1={pl} y1={toY(0.8)} x2={W - pr} y2={toY(0.8)} stroke={colors.amber} strokeWidth={1.5} strokeDasharray="6,4" />
        <text x={W - pr} y={toY(0.8) - 4} fill={colors.amber} fontSize={9} textAnchor="end">
          80% power target
        </text>
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pg)" />
        <path d={line} fill="none" stroke={colors.emerald} strokeWidth={2.5} />
        {n80 && (
          <g>
            <line x1={toX(n80.n)} y1={toY(0)} x2={toX(n80.n)} y2={toY(0.8)} stroke={colors.amber} strokeWidth={1} strokeDasharray="4,3" />
            <circle cx={toX(n80.n)} cy={toY(0.8)} r={5} fill={colors.amber} />
            <text x={toX(n80.n)} y={toY(0) + 14} fill={colors.amber} fontSize={11} textAnchor="middle" fontWeight="700">
              {'n = ' + n80.n}
            </text>
          </g>
        )}
        <line x1={pl} y1={toY(0)} x2={W - pr} y2={toY(0)} stroke={sv.axis} />
        <text x={W / 2} y={H - 4} fill={sv.text} fontSize={9} textAnchor="middle">
          Sample Size per Group
        </text>
      </ChartBox>

      <Sl label="Effect Size (Cohen's d)" value={eff} min={0.05} max={1.5} step={0.05} onChange={setEff} fmt={(v) => v.toFixed(2)} color={colors.emerald} />
      <Sl label="Significance Level" value={alp} min={0.01} max={0.1} step={0.005} onChange={setAlp} fmt={(v) => 'α = ' + v.toFixed(3)} color={colors.red} />

      {n80 && (
        <div className="bg-app-surface rounded-xl p-4 text-center mt-2">
          <span className="text-sm text-[var(--svg-text)]">For 80% power you need about </span>
          <span className="text-xl font-extrabold" style={{ color: colors.amber }}>{n80.n}</span>
          <span className="text-sm text-[var(--svg-text)]"> users per group</span>
        </div>
      )}

      <QA
        items={[
          {
            q: "Can we end the test early? B looks like it's winning.",
            a: "Ending early is like calling a coin unfair after 3 flips. Early results are noisy and unreliable. Stopping early inflates false positives dramatically — you might ship something that doesn't actually work. We set the sample size upfront so the conclusion is trustworthy.",
          },
          {
            q: 'Why do we need so many users?',
            a: 'Smaller effects need exponentially more data to detect reliably. If you are looking for a 1% improvement vs. a 20% improvement, the required sample size differs by orders of magnitude. The power curve above shows exactly how this scales.',
          },
        ]}
      />
      <TechNote>
        Power = P(reject H0 | H1 true). It increases with effect size, sample size, and alpha.
        Always compute the minimum detectable effect (MDE) before launch — it tells you the smallest
        improvement you can reliably detect with your available traffic.
      </TechNote>
      <Insight>
        An underpowered test is worse than no test — it wastes time and traffic while producing
        ambiguous results that often lead to bad decisions. Always plan your sample size before you
        start.
      </Insight>
    </div>
  );
}
