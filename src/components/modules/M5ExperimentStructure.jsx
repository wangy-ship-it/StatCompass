import { useState, useMemo, useCallback } from 'react';
import { sR, nCDF } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, Sl, PillBtn, QA, TechNote, Insight, ChartBox, StatBox } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const paramDefaults = { split: 50, rand: false, N: 60 };

export default function M5ExperimentStructure() {
  const [p, set] = useAnimatedParams(paramDefaults);
  const { split, rand, N } = p;
  const setSplit = (v) => set('split', v);
  const setRand = (v) => set('rand', v);
  const setN = (v) => set('N', v);
  const [seed, setSeed] = useState(1);
  const users = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        const r = sR(i * 13 + seed * 77);
        return { g: rand ? (r < split / 100 ? 'A' : 'B') : i < (N * split) / 100 ? 'A' : 'B' };
      }),
    [N, split, rand, seed]
  );
  const nA = users.filter((u) => u.g === 'A').length;

  // ── Power curve data ──
  const powerPts = useMemo(() => {
    const pts = [];
    for (let p = 10; p <= 90; p += 1) {
      const frac = p / 100;
      const power = 4 * frac * (1 - frac); // normalized so 50/50 = 1.0
      pts.push({ p, power });
    }
    return pts;
  }, []);
  const currentPower = 4 * (split / 100) * (1 - split / 100);

  // ── Power chart layout ──
  const PW = 600, PH = 140, pL = 48, pR = 20, pT = 16, pB = 30;
  const toX = (p) => pL + ((p - 10) / 80) * (PW - pL - pR);
  const toY = (v) => PH - pB - v * (PH - pT - pB);
  const powerLine = powerPts.map((pt, i) => (i === 0 ? 'M' : 'L') + toX(pt.p) + ',' + toY(pt.power)).join('');
  const powerArea = powerLine + 'L' + toX(90) + ',' + toY(0) + 'L' + toX(10) + ',' + toY(0) + 'Z';

  const tooltipLookup = useCallback((vbX) => {
    if (vbX < pL || vbX > PW - pR) return null;
    const pct = 10 + ((vbX - pL) / (PW - pL - pR)) * 80;
    const closest = powerPts.reduce((best, pt2) =>
      Math.abs(pt2.p - pct) < Math.abs(best.p - pct) ? pt2 : best
    );
    return {
      x: toX(closest.p),
      y: toY(closest.power),
      lines: [
        { label: 'Control', value: closest.p + '%', color: colors.indigo },
        { label: 'Treatment', value: (100 - closest.p) + '%', color: colors.emerald },
        { label: 'Rel. Power', value: closest.power.toFixed(2), color: colors.indigo },
      ],
      markers: [{ y: toY(closest.power), color: colors.indigo }],
    };
  }, [powerPts]);

  // ── SRM check ──
  const nAExpected = N * split / 100;
  const nBExpected = N - nAExpected;
  const nB = N - nA;
  const chiSq = nAExpected > 0 && nBExpected > 0
    ? Math.pow(nA - nAExpected, 2) / nAExpected + Math.pow(nB - nBExpected, 2) / nBExpected
    : 0;
  const srmP = chiSq > 0 ? 2 * (1 - nCDF(Math.sqrt(chiSq), 0, 1)) : 1;
  const srmWarning = srmP < 0.01;

  // ── Dynamic SVG height for dot grid ──
  const maxPerGroup = Math.max(nA, nB);
  const dotsPerRow = 8;
  const dotRows = Math.ceil(maxPerGroup / dotsPerRow);
  const dotGridBottom = 78 + dotRows * 20;
  const svgH = dotGridBottom + 40;

  return (
    <div>
      <Hdr sub="Design">Experiment Structure and Randomization</Hdr>
      <Desc>
        An A/B test splits users into two comparable groups to isolate the effect of a change.
        Randomization ensures the groups are fair — like shuffling a deck of cards so both hands are
        dealt equally.
      </Desc>

      <div className="flex gap-2.5 mb-5 flex-wrap">
        <PillBtn on={!rand} onClick={() => setRand(false)}>Sequential Split</PillBtn>
        <PillBtn on={rand} onClick={() => { setRand(true); setSeed((s) => s + 1); }}>Randomize</PillBtn>
        {rand && <PillBtn on={false} onClick={() => setSeed((s) => s + 1)}>Re-shuffle</PillBtn>}
      </div>

      <Sl
        label="Sample Size"
        value={N}
        min={20}
        max={200}
        step={10}
        onChange={setN}
        fmt={(v) => v + ' users'}
      />

      <Sl
        label="Allocation Ratio"
        value={split}
        min={10}
        max={90}
        step={5}
        onChange={setSplit}
        fmt={(v) => v + '% Control / ' + (100 - v) + '% Treatment'}
      />

      <div className="bg-app-surface rounded-2xl p-6 mb-7 ring-1 ring-[var(--color-border-subtle)]">
        <svg viewBox={'0 0 600 ' + svgH} width="100%" style={{ maxHeight: svgH, display: 'block' }}>
          <text x={300} y={16} fill={sv.text} fontSize={11} textAnchor="middle" fontWeight="600">
            {'All Users (n=' + N + ')'}
          </text>
          <line x1={200} y1={24} x2={300} y2={38} stroke={sv.axis} />
          <line x1={400} y1={24} x2={300} y2={38} stroke={sv.axis} />
          <text x={300} y={48} fill={rand ? colors.indigo : sv.text} fontSize={9} textAnchor="middle">
            {rand ? 'Random Assignment' : 'Sequential Assignment'}
          </text>
          <line x1={300} y1={38} x2={150} y2={58} stroke={rand ? colors.indigo : sv.axis} strokeWidth={1.5} />
          <line x1={300} y1={38} x2={450} y2={58} stroke={rand ? colors.indigo : sv.axis} strokeWidth={1.5} />
          <text x={150} y={68} fill={colors.indigo} fontSize={11} textAnchor="middle" fontWeight="700">
            {'Control (A) n=' + nA}
          </text>
          <text x={450} y={68} fill={colors.emerald} fontSize={11} textAnchor="middle" fontWeight="700">
            {'Treatment (B) n=' + (N - nA)}
          </text>
          {(() => {
            const counters = { A: 0, B: 0 };
            return users.map((u, i) => {
              const isA = u.g === 'A';
              const idx = counters[u.g]++;
              return (
                <circle
                  key={i}
                  cx={(isA ? 30 : 320) + (idx % dotsPerRow) * 30 + 15}
                  cy={78 + Math.floor(idx / dotsPerRow) * 20}
                  r={7}
                  fill={isA ? colors.indigo : colors.emerald}
                  opacity={0.65}
                />
              );
            });
          })()}
          <rect x={30} y={dotGridBottom + 6} width={240} height={26} rx={6} fill={sv.fillIndigoSubtle} stroke={sv.borderIndigo} />
          <text x={150} y={dotGridBottom + 23} fill={sv.text} fontSize={9} textAnchor="middle">
            Primary: Conversion Rate
          </text>
          <rect x={330} y={dotGridBottom + 6} width={240} height={26} rx={6} fill={sv.fillEmeraldSubtle} stroke={sv.borderEmerald} />
          <text x={450} y={dotGridBottom + 23} fill={sv.text} fontSize={9} textAnchor="middle">
            Guardrail: Revenue / Session
          </text>
        </svg>
      </div>

      {/* ── Power Mini-Chart ── */}
      <ChartBox h={PH} label="Relative statistical power vs control allocation percentage, showing how unequal splits reduce power" tooltipLookup={tooltipLookup}>
        {[0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={pL} y1={toY(v)} x2={PW - pR} y2={toY(v)} stroke={sv.grid} />
            <text x={pL - 5} y={toY(v) + 3} fill={sv.text} fontSize={9} textAnchor="end">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => (
          <text key={v} x={toX(v)} y={PH - pB + 14} fill={sv.text} fontSize={9} textAnchor="middle">
            {v + '%'}
          </text>
        ))}
        <text x={PW / 2} y={PH - 2} fill={sv.text} fontSize={9} textAnchor="middle">
          Control Allocation %
        </text>
        <text x={12} y={PH / 2} fill={sv.text} fontSize={9} textAnchor="middle" transform={'rotate(-90,' + 12 + ',' + PH / 2 + ')'}>
          Relative Power
        </text>
        <defs>
          <linearGradient id="m5-power-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={powerArea} fill="url(#m5-power-grad)" />
        <path d={powerLine} fill="none" stroke={colors.indigo} strokeWidth={2} />
        {/* Current split marker */}
        <circle cx={toX(split)} cy={toY(currentPower)} r={5} fill={colors.indigo} stroke={sv.appBg} strokeWidth={1.5} />
        <text x={toX(split)} y={toY(currentPower) - 9} fill={colors.indigo} fontSize={9} textAnchor="middle" fontWeight="600">
          {currentPower.toFixed(2)}
        </text>
      </ChartBox>

      {/* ── StatBoxes ── */}
      <div className="flex gap-3 mb-7 flex-wrap">
        <StatBox label="Group A Count" value={nA} color={colors.indigo} />
        <StatBox label="Group B Count" value={N - nA} color={colors.emerald} />
        <StatBox
          label={srmWarning ? 'SRM Warning' : 'SRM p-value'}
          value={srmP < 0.001 ? srmP.toExponential(1) : srmP.toFixed(3)}
          color={srmWarning ? colors.red : sv.textFaint}
        />
        <StatBox label="Relative Power" value={currentPower.toFixed(2)} color={colors.indigo} />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-5">
        <div className="rounded-xl bg-app-glass ring-1 ring-[var(--color-border-subtle)] p-4">
          <div className="text-[10px] text-[var(--color-accent-faint)] font-medium uppercase tracking-[0.1em] mb-1.5">Primary Metric</div>
          <div className="text-[13px] text-[var(--svg-text)] leading-relaxed">
            The one number you are trying to move — your decision metric.
          </div>
        </div>
        <div className="rounded-xl bg-app-glass ring-1 ring-[var(--color-border-subtle)] p-4">
          <div className="text-[10px] text-[var(--svg-text-faint)] font-medium uppercase tracking-[0.1em] mb-1.5">Guardrail Metrics</div>
          <div className="text-[13px] text-[var(--svg-text)] leading-relaxed">
            Make sure nothing else breaks — monitor for side effects.
          </div>
        </div>
      </div>

      <QA
        items={[
          {
            q: 'Why not just launch and compare before/after?',
            a: 'Without a simultaneous control group, you cannot separate your change from external factors like seasonality, marketing campaigns, or news. The control group is your "what would have happened anyway" baseline.',
          },
          {
            q: 'Why 50/50? Can we test on fewer users?',
            a: 'A 50/50 split maximizes statistical power — your ability to detect a real effect. Unequal splits (e.g. 90/10) are used when the treatment is risky, but they require more total users to reach the same confidence.',
          },
        ]}
      />
      <TechNote>
        Randomization ensures exchangeability on observed and unobserved covariates. Always hash on a
        stable user ID for consistent assignment across sessions. Consider stratified randomization
        for small samples.
      </TechNote>
      <Insight>
        Randomization is the single most important design choice. Without it, observed differences
        could be due to selection bias rather than your treatment. A proper A/B test is the gold
        standard because it isolates causation, not just correlation.
      </Insight>
    </div>
  );
}
