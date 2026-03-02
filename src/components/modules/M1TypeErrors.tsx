import { useMemo, useCallback } from 'react';
import { nPDF, nCDF, zInv } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const defaults = { alp: 0.05, eff: 2.0, ss: 30 };

export default function M1TypeErrors() {
  const [p, set] = useAnimatedParams(defaults);
  const { alp, eff, ss } = p;
  const setAlp = (v: number) => set('alp', v);
  const setEff = (v: number) => set('eff', v);
  const setSs = (v: number) => set('ss', v);

  const d = useMemo(() => {
    const std = 3 / Math.sqrt(ss / 30);
    const m1 = eff;
    const cv = zInv(alp) * std;
    const beta = nCDF(cv, m1, std);
    const pow = 1 - beta;
    const W = 600,
      H = 240,
      pl = 36,
      pr = 36,
      ppt = 16,
      ppb = 34;
    const xMn = -4 * std;
    const xMx = Math.max(m1 + 4 * std, 5 * std);
    const tX = (v: number) => pl + ((v - xMn) / (xMx - xMn)) * (W - pl - pr);
    const steps = 220;
    const dx = (xMx - xMn) / steps;
    let mxY = 0;
    for (let i = 0; i <= steps; i++) {
      const x = xMn + i * dx;
      mxY = Math.max(mxY, nPDF(x, 0, std), nPDF(x, m1, std));
    }
    const tY = (v: number) => H - ppb - (v / mxY) * (H - ppt - ppb);
    let h0 = '',
      h1 = '';
    const af: { x: number; y: number; b: number }[] = [],
      bf: { x: number; y: number; b: number }[] = [],
      pf: { x: number; y: number; b: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = xMn + i * dx;
      const sx = tX(x);
      const y0 = nPDF(x, 0, std);
      const y1 = nPDF(x, m1, std);
      h0 += (i ? 'L' : 'M') + sx + ',' + tY(y0);
      h1 += (i ? 'L' : 'M') + sx + ',' + tY(y1);
      if (x >= cv) af.push({ x: sx, y: tY(y0), b: tY(0) });
      if (x <= cv) bf.push({ x: sx, y: tY(y1), b: tY(0) });
      if (x >= cv) pf.push({ x: sx, y: tY(y1), b: tY(0) });
    }
    const fp = (pts: { x: number; y: number; b: number }[]) => {
      if (pts.length < 2) return '';
      let dd = 'M' + pts[0].x + ',' + pts[0].b;
      pts.forEach((p) => (dd += 'L' + p.x + ',' + p.y));
      return dd + 'L' + pts[pts.length - 1].x + ',' + pts[pts.length - 1].b + 'Z';
    };
    return {
      h0,
      h1,
      ap: fp(af),
      bp: fp(bf),
      pp: fp(pf),
      cx: tX(cv),
      by: tY(0),
      beta: beta.toFixed(3),
      pow: pow.toFixed(3),
      W,
      H,
      std,
      m1,
      xMn,
      xMx,
      mxY,
    };
  }, [alp, eff, ss]);

  const tooltipLookup = useCallback(
    (vbX: number) => {
      const pl = 36,
        pr = 36,
        ppt = 16,
        ppb = 34;
      if (vbX < pl || vbX > d.W - pr) return null;
      const xVal = d.xMn + ((vbX - pl) / (d.W - pl - pr)) * (d.xMx - d.xMn);
      const y0 = nPDF(xVal, 0, d.std);
      const y1 = nPDF(xVal, d.m1, d.std);
      const tX2 = (v: number) => pl + ((v - d.xMn) / (d.xMx - d.xMn)) * (d.W - pl - pr);
      const tY2 = (v: number) => d.H - ppb - (v / d.mxY) * (d.H - ppt - ppb);
      return {
        x: tX2(xVal),
        y: Math.min(tY2(y0), tY2(y1)),
        lines: [
          { label: 'H\u2080', value: y0.toFixed(4), color: colors.indigo },
          { label: 'H\u2081', value: y1.toFixed(4), color: colors.emerald },
        ],
        markers: [
          { y: tY2(y0), color: colors.indigo },
          { y: tY2(y1), color: colors.emerald },
        ],
      };
    },
    [d],
  );

  return (
    <div>
      <Hdr sub="Foundations">Type I and Type II Errors</Hdr>
      <Desc>
        Every test has two risk types: a false alarm (concluding something works when it does not)
        and a missed signal (failing to detect a real improvement). Like a smoke detector — too
        sensitive and it beeps at toast; too lenient and it misses a fire.
      </Desc>

      <ChartBox
        h={d.H}
        tooltipLookup={tooltipLookup}
        label="Type I and Type II error regions under null and alternative distributions"
      >
        <defs>
          <linearGradient id="grad-alpha-m1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.red} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colors.red} stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="grad-beta-m1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.amber} stopOpacity="0.30" />
            <stop offset="100%" stopColor={colors.amber} stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="grad-power-m1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.30" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.04" />
          </linearGradient>
          <pattern
            id="hatch-beta-m1"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={colors.amber}
              strokeWidth="1.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <path d={d.ap} fill="url(#grad-alpha-m1)" />
        <path d={d.bp} fill="url(#grad-beta-m1)" />
        <path d={d.bp} fill="url(#hatch-beta-m1)" />
        <path d={d.pp} fill="url(#grad-power-m1)" />
        <path d={d.h0} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
        <path d={d.h1} fill="none" stroke={colors.emerald} strokeWidth={2.5} />
        <line
          x1={d.cx}
          y1={10}
          x2={d.cx}
          y2={d.by}
          stroke={colors.red}
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />
        <text x={d.cx} y={8} fill={colors.red} fontSize={9} textAnchor="middle">
          Decision Threshold
        </text>
        <line x1={36} y1={d.by} x2={564} y2={d.by} stroke={sv.axis} />
        <text
          x={130}
          y={d.by + 14}
          fill={colors.indigo}
          fontSize={11}
          textAnchor="middle"
          fontWeight="600"
        >
          H0: No Effect
        </text>
        <text
          x={440}
          y={d.by + 14}
          fill={colors.emerald}
          fontSize={11}
          textAnchor="middle"
          fontWeight="600"
        >
          H1: Real Effect
        </text>
      </ChartBox>

      <div className="flex gap-4 mb-4 flex-wrap justify-center">
        {[
          { bg: sv.fillRed, brd: colors.red, lbl: 'False Alarm (Type I)', val: alp.toFixed(3) },
          { bg: sv.fillAmber, brd: colors.amber, lbl: 'Missed Signal (Type II)', val: d.beta },
          { bg: sv.fillEmerald, brd: colors.emerald, lbl: 'Power (1 − β)', val: d.pow },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded"
              style={{ background: item.bg, border: '2px solid ' + item.brd }}
            />
            <span className="text-[13px] text-[var(--color-text-primary)]">
              {item.lbl + ' = '}
              <b style={{ color: item.brd }}>{item.val}</b>
            </span>
          </div>
        ))}
      </div>

      <Sl
        label="Significance Level (α)"
        value={alp}
        min={0.005}
        max={0.2}
        step={0.001}
        onChange={setAlp}
        fmt={(v: number) => v.toFixed(3)}
        color={colors.red}
      />
      <Sl
        label="True Effect Size"
        value={eff}
        min={0}
        max={5}
        step={0.02}
        onChange={setEff}
        fmt={(v: number) => v.toFixed(1)}
        color={colors.emerald}
      />
      <Sl
        label="Sample Size"
        value={ss}
        min={5}
        max={200}
        step={1}
        onChange={setSs}
        fmt={(v) => String(Math.round(v))}
        color={colors.indigo}
      />

      <QA
        items={[
          {
            q: 'Is there always a chance we are wrong?',
            a: 'Yes. We set a 5% false alarm rate and target 80% detection power. These are industry standards that balance speed with accuracy. Proper experiments still produce far better decisions than intuition alone.',
          },
          {
            q: 'How do we reduce both error types?',
            a: 'More data. At a fixed sample size, reducing one error increases the other — it is a direct tradeoff. The only way to shrink both is to increase your sample size, which makes both curves narrower and more separated.',
          },
        ]}
      />
      <TechNote>
        At fixed n, reducing α increases β. For multiple comparisons, apply Bonferroni or
        Benjamini-Hochberg corrections to maintain family-wise error rate or false discovery rate.
      </TechNote>
      <Insight>
        The tradeoff is fundamental: you cannot eliminate both errors simultaneously without more
        data. Increasing sample size is the only free lunch — it narrows both distributions and
        separates them, reducing both false alarms and missed signals.
      </Insight>
    </div>
  );
}
