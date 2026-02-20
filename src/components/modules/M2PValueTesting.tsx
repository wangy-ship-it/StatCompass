import { useCallback } from 'react';
import { nPDF, nCDF } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const defaults = { ts: 1.96, two: true };

export default function M2PValueTesting() {
  const [p, set] = useAnimatedParams(defaults);
  const { ts, two } = p;
  const setTs = (v: number) => set('ts', v);
  const setTwo = (v: boolean) => set('two', v);
  const pVal = two ? 2 * (1 - nCDF(Math.abs(ts), 0, 1)) : 1 - nCDF(ts, 0, 1);
  const sig = pVal < 0.05;

  const W = 600,
    H = 220,
    pl = 36,
    pr = 36,
    pt = 16,
    pb = 36;
  const toX = (v: number) => pl + ((v + 4) / 8) * (W - pl - pr);
  const toY = (v: number) => H - pb - (v / 0.4) * (H - pt - pb);

  let crv = '';
  const shPts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 200; i++) {
    const x = -4 + i * 0.04;
    const y = nPDF(x, 0, 1);
    crv += (i === 0 ? 'M' : 'L') + toX(x) + ',' + toY(y);
    if (two ? Math.abs(x) >= Math.abs(ts) : x >= ts) shPts.push({ x: toX(x), y: toY(y) });
  }
  let shade = '';
  if (shPts.length > 1) {
    shade = 'M' + shPts[0].x + ',' + toY(0);
    shPts.forEach((p) => (shade += 'L' + p.x + ',' + p.y));
    shade += 'L' + shPts[shPts.length - 1].x + ',' + toY(0) + 'Z';
  }

  const tooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < pl || vbX > W - pr) return null;
      const xVal = -4 + ((vbX - pl) / (W - pl - pr)) * 8;
      const yVal = nPDF(xVal, 0, 1);
      const pAtX = two ? 2 * (1 - nCDF(Math.abs(xVal), 0, 1)) : 1 - nCDF(xVal, 0, 1);
      return {
        x: toX(xVal),
        y: toY(yVal),
        lines: [
          { label: 'z', value: xVal.toFixed(2), color: colors.indigo },
          { label: 'PDF', value: yVal.toFixed(4), color: colors.indigo },
          {
            label: 'p-value',
            value: pAtX < 0.0001 ? '< 0.0001' : pAtX.toFixed(4),
            color: pAtX < 0.05 ? colors.red : colors.indigo,
          },
        ],
        markers: [{ y: toY(yVal), color: colors.indigo }],
      };
    },
    [two, ts],
  );

  return (
    <div>
      <Hdr sub="Foundations">P-Value and Hypothesis Testing</Hdr>
      <Desc>
        The p-value answers: "If there were truly no effect, how surprising is our result?" The
        shaded area shows that probability. A tiny shaded area means the result is very unlikely
        under no-effect — strong evidence for a real change.
      </Desc>

      <ChartBox
        h={H}
        label="Normal distribution with shaded p-value region showing probability of observing results as extreme as the test statistic"
        tooltipLookup={tooltipLookup}
      >
        <defs>
          <linearGradient id="grad-pshade-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.red} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colors.red} stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="grad-pshade-indigo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.30" />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path d={shade} fill={sig ? 'url(#grad-pshade-red)' : 'url(#grad-pshade-indigo)'} />
        <path d={crv} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
        <line
          x1={toX(ts)}
          y1={pt}
          x2={toX(ts)}
          y2={toY(0)}
          stroke={colors.indigo}
          strokeWidth={2}
          strokeDasharray="5,3"
        />
        {two && ts !== 0 && (
          <line
            x1={toX(-ts)}
            y1={pt}
            x2={toX(-ts)}
            y2={toY(0)}
            stroke={colors.indigo}
            strokeWidth={2}
            strokeDasharray="5,3"
            opacity={0.4}
          />
        )}
        <line x1={pl} y1={toY(0)} x2={W - pr} y2={toY(0)} stroke={sv.axis} />
        {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
          <text key={v} x={toX(v)} y={toY(0) + 13} fill={sv.text} fontSize={9} textAnchor="middle">
            {v}
          </text>
        ))}
        <text
          x={toX(ts) + (ts > 2 ? -8 : 8)}
          y={pt + 10}
          fill={colors.indigo}
          fontSize={11}
          fontWeight="700"
          textAnchor={ts > 2 ? 'end' : 'start'}
        >
          {'z = ' + ts.toFixed(2)}
        </text>
        <text x={W / 2} y={H - 4} fill={sv.text} fontSize={9} textAnchor="middle">
          Standard deviations from "no effect"
        </text>
      </ChartBox>

      <div
        className="rounded-xl p-4 mb-4 text-center"
        style={{
          background: sig ? sv.fillRedSubtle : sv.fillIndigoSubtle,
          border: '1px solid ' + (sig ? sv.borderRed : sv.borderIndigo),
        }}
      >
        <div
          className="text-[26px] font-extrabold font-mono"
          style={{ color: sig ? colors.red : colors.indigo }}
        >
          {'p = ' + (pVal < 0.0001 ? '< 0.0001' : pVal.toFixed(4))}
        </div>
        <div className="text-[13px] mt-1 text-[var(--color-text-secondary)]">
          {sig ? 'Significant at α = 0.05 — reject H0' : 'Not significant — cannot reject H0'}
        </div>
      </div>

      <Sl
        label="Test Statistic (Z-score)"
        value={ts}
        min={-3.5}
        max={3.5}
        step={0.05}
        onChange={setTs}
        fmt={(v: number) => v.toFixed(2)}
        color={colors.indigo}
      />

      <div className="flex gap-3 mb-4">
        <PillBtn on={two} onClick={() => setTwo(true)}>
          Two-tailed
        </PillBtn>
        <PillBtn on={!two} onClick={() => setTwo(false)}>
          One-tailed
        </PillBtn>
      </div>

      <div className="text-[13px] text-[var(--svg-text)] font-bold mb-3">
        Which test should I use?
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: 'Z-test', when: 'Large n (>30), known variance', icon: '📊' },
          { name: 'T-test', when: 'Small n or unknown variance', icon: '📉' },
          { name: 'Chi-square', when: 'Categorical / count data', icon: '🔢' },
          { name: 'Mann-Whitney U', when: 'Non-normal distributions', icon: '📐' },
        ].map((t, i) => (
          <div key={i} className="rounded-xl bg-app-glass p-4">
            <div className="text-[13px] text-[var(--color-text-primary)] font-semibold">
              {t.icon + ' ' + t.name}
            </div>
            <div className="text-xs text-[var(--svg-text)] mt-1">{t.when}</div>
          </div>
        ))}
      </div>

      <QA
        items={[
          {
            q: 'The p-value is 0.06 — so close! Can we round down?',
            a: "No. A p-value of 0.06 means there is a 6% chance of seeing this result if nothing changed — above our 5% threshold. 'Almost significant' is not significant. You can extend the test to collect more data, but you cannot move the goalpost after the fact.",
          },
          {
            q: 'Does a small p-value prove our change works?',
            a: 'Not exactly. It means the data would be very surprising if there were no effect. But it does not tell you how large the effect is or whether it matters practically. Always pair p-values with confidence intervals and effect sizes.',
          },
        ]}
      />
      <TechNote>
        P-value = P(data this extreme | H0 true). It is NOT P(H0 true). Common pitfalls: treating
        0.049 vs 0.051 as fundamentally different, p-hacking via multiple comparisons or optional
        stopping. Always complement with CIs.
      </TechNote>
      <Insight>
        If 100 teams tested the same thing and there was truly no effect, about 5 of them would
        still get a "significant" result by chance. That is what the 5% threshold controls. The
        p-value quantifies surprise, not truth.
      </Insight>
    </div>
  );
}
