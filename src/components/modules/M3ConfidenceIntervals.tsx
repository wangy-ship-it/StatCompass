import { useState, useMemo, useCallback } from 'react';
import { zInv, sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const paramDefaults = { cl: 0.95, ss: 30 };

export default function M3ConfidenceIntervals() {
  const [p, set] = useAnimatedParams(paramDefaults);
  const { cl, ss } = p;
  const setCl = (v: number) => set('cl', v);
  const setSs = (v: number) => set('ss', v);
  const [seed, setSeed] = useState(1);
  const truM = 50,
    sigma = 10;

  const ivs = useMemo(() => {
    const z = zInv(1 - cl);
    const se = sigma / Math.sqrt(ss);
    return Array.from({ length: 25 }, (_, i) => {
      const m = truM + (((sR(i * 7 + seed * 131) - 0.5) * 2 * sigma) / Math.sqrt(ss)) * 3;
      return { m, lo: m - z * se, hi: m + z * se, cap: m - z * se <= truM && m + z * se >= truM };
    });
  }, [cl, ss, seed]);

  const capN = ivs.filter((c) => c.cap).length;
  const W = 600,
    H = 340,
    pl = 36,
    pr = 36,
    pt = 20,
    ppb = 20;
  const toX = (v: number) => pl + ((v - 32) / 36) * (W - pl - pr);
  const rH = useMemo(() => (H - pt - ppb) / 25, []);

  const tooltipLookup = useCallback(
    (vbX: number, vbY: number) => {
      if (vbX < pl || vbX > W - pr) return null;
      const xVal = 32 + ((vbX - pl) / (W - pl - pr)) * 36;
      // Find the nearest CI bar by vertical position
      let bestIdx = Math.round((vbY - pt - rH / 2) / rH);
      bestIdx = Math.max(0, Math.min(bestIdx, ivs.length - 1));
      const ci = ivs[bestIdx];
      const ciY = pt + bestIdx * rH + rH / 2;
      const c = ci.cap ? colors.indigo : colors.red;
      return {
        x: toX(xVal),
        y: ciY,
        lines: [
          { label: 'Value', value: xVal.toFixed(1), color: colors.indigo },
          {
            label: 'CI #' + (bestIdx + 1),
            value: '[' + ci.lo.toFixed(1) + ', ' + ci.hi.toFixed(1) + ']',
            color: c,
          },
          { label: 'Mean', value: ci.m.toFixed(1), color: c },
          {
            label: 'Captures true',
            value: ci.cap ? 'Yes' : 'No',
            color: ci.cap ? colors.emerald : colors.red,
          },
        ],
        markers: [{ y: ciY, color: c }],
      };
    },
    [ivs, rH],
  );

  return (
    <div>
      <Hdr sub="Foundations">Confidence Intervals</Hdr>
      <Desc>
        Each bar below is one experiment. Most capture the true value (gold line), but some miss —
        and that is expected. A 95% CI means our method catches the truth about 95% of the time.
        Wider bars = more uncertainty; narrower = more precision.
      </Desc>

      <ChartBox
        h={H}
        label="Twenty-five confidence intervals from repeated samples, showing how most capture the true value while some miss"
        tooltipLookup={tooltipLookup}
      >
        <line
          x1={toX(truM)}
          y1={pt}
          x2={toX(truM)}
          y2={H - ppb}
          stroke={colors.amber}
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        <text
          x={toX(truM)}
          y={pt - 4}
          fill={colors.amber}
          fontSize={11}
          textAnchor="middle"
          fontWeight="700"
        >
          {'True Value = ' + truM}
        </text>
        {ivs.map((ci, i) => {
          const y = pt + i * rH + rH / 2;
          const c = ci.cap ? colors.indigo : colors.red;
          return (
            <g key={i}>
              <line
                x1={toX(ci.lo)}
                y1={y}
                x2={toX(ci.hi)}
                y2={y}
                stroke={c}
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.7}
              />
              <circle cx={toX(ci.m)} cy={y} r={2.5} fill={c} />
            </g>
          );
        })}
        {[35, 40, 45, 50, 55, 60, 65].map((v) => (
          <text key={v} x={toX(v)} y={H - ppb + 12} fill={sv.text} fontSize={9} textAnchor="middle">
            {v}
          </text>
        ))}
      </ChartBox>

      <div className="rounded-xl py-3 px-4 mb-4 text-center" style={{ background: sv.fillIndigo }}>
        <span className="text-lg font-extrabold" style={{ color: colors.indigo }}>
          {capN + '/' + ivs.length}
        </span>
        <span className="text-sm text-[var(--svg-text)]">
          {' captured true value (' + Math.round((capN / ivs.length) * 100) + '%)'}
        </span>
        <span className="text-sm ml-2" style={{ color: colors.red }}>
          {'  ' + (ivs.length - capN) + ' missed'}
        </span>
      </div>

      <Sl
        label="Confidence Level"
        value={cl}
        min={0.5}
        max={0.99}
        step={0.01}
        onChange={setCl}
        fmt={(v: number) => Math.round(v * 100) + '%'}
        color={colors.indigo}
      />
      <Sl
        label="Sample Size"
        value={ss}
        min={5}
        max={200}
        step={1}
        onChange={setSs}
        fmt={(v) => String(Math.round(v))}
        color={colors.emerald}
      />

      <button
        onClick={() => setSeed((s) => s + 1)}
        className="mt-2 py-2 px-4 rounded-xl bg-app-glass border border-[var(--color-border-subtle)] text-[var(--svg-text)] text-[13px] font-semibold cursor-pointer hover:text-[var(--color-text-primary)] hover:bg-app-glass transition-all"
      >
        Re-simulate 25 experiments
      </button>

      <QA
        items={[
          {
            q: 'Is there a 95% chance the truth is inside our interval?',
            a: 'Not exactly. Once calculated, the truth is either inside or it is not. The 95% describes our method across many experiments — about 95 out of 100 intervals will contain the true value. Look at the simulation above: most bars hit the gold line, but a few miss.',
          },
          {
            q: 'Why is the CI so wide?',
            a: 'Width depends on sample size and data variability. More data = tighter interval = more precise estimate. If your CI is too wide to be useful, you need more data — not a different statistical trick.',
          },
        ]}
      />
      <TechNote>
        CI width is proportional to σ / √n. A CI is strictly more informative than a p-value — it
        shows direction, magnitude, and precision. Note: overlapping CIs does not necessarily mean
        non-significant difference (a common misconception).
      </TechNote>
      <Insight>
        CIs tell you not just whether an effect exists, but how big it could plausibly be. A result
        can be statistically significant but practically meaningless (tiny effect, tight CI), or
        non-significant but promising (large effect, wide CI needing more data).
      </Insight>
    </div>
  );
}
