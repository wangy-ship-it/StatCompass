import { useMemo, useCallback } from 'react';
import { nCDF } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const defaults = { expRatio: 0.5, nA: 5000, nB: 5000 };

export default function M35SRMDiagnostics() {
  const [p, set] = useAnimatedParams(defaults);
  const { expRatio, nA, nB } = p;
  const setExpRatio = (v: number) => set('expRatio', v);
  const setNA = (v: number) => set('nA', v);
  const setNB = (v: number) => set('nB', v);

  const d = useMemo(() => {
    const W = 600,
      H = 240,
      pl = 60,
      pr = 36,
      pt = 24,
      pb = 44;

    const totalN = nA + nB;
    const expectedA = totalN * expRatio;
    const expectedB = totalN * (1 - expRatio);

    const chiSq = Math.pow(nA - expectedA, 2) / expectedA + Math.pow(nB - expectedB, 2) / expectedB;

    const pValue = 2 * (1 - nCDF(Math.sqrt(chiSq), 0, 1));

    const devA = expectedA > 0 ? ((nA - expectedA) / expectedA) * 100 : 0;
    const devB = expectedB > 0 ? ((nB - expectedB) / expectedB) * 100 : 0;

    // Determine verdict
    let verdict: string;
    let verdictColor: string;
    if (pValue < 0.001) {
      verdict = 'SRM Detected';
      verdictColor = colors.red;
    } else if (pValue < 0.01) {
      verdict = 'Warning';
      verdictColor = colors.amber;
    } else {
      verdict = 'No SRM';
      verdictColor = colors.emerald;
    }

    // Bar chart layout: two groups, each with expected + observed bar
    const chartW = W - pl - pr;
    const chartH = H - pt - pb;
    const maxVal = Math.max(nA, nB, expectedA, expectedB);

    const tY = (v: number) => pt + chartH * (1 - v / maxVal);
    const baseY = pt + chartH;

    // Group positions: A on left half, B on right half
    const groupW = chartW / 2;
    const barW = groupW * 0.28;
    const gap = groupW * 0.06;

    // Group A bars
    const aExpX = pl + groupW * 0.2;
    const aObsX = aExpX + barW + gap;
    const aExpH = chartH * (expectedA / maxVal);
    const aObsH = chartH * (nA / maxVal);

    // Group B bars
    const bExpX = pl + groupW + groupW * 0.2;
    const bObsX = bExpX + barW + gap;
    const bExpH = chartH * (expectedB / maxVal);
    const bObsH = chartH * (nB / maxVal);

    return {
      W,
      H,
      pl,
      pr,
      pt,
      pb,
      totalN,
      expectedA,
      expectedB,
      chiSq,
      pValue,
      devA,
      devB,
      verdict,
      verdictColor,
      maxVal,
      tY,
      baseY,
      barW,
      aExpX,
      aObsX,
      aExpH,
      aObsH,
      bExpX,
      bObsX,
      bExpH,
      bObsH,
      groupW,
    };
  }, [expRatio, nA, nB]);

  const tooltipLookup = useCallback(
    (vbX: number) => {
      const { pl, pr, W, baseY, aExpX, aObsX, bExpX, bObsX, barW } = d;
      if (vbX < pl || vbX > W - pr) return null;

      // Determine which bar is hovered
      const margin = 6;
      let group: string | null = null;
      let isObserved = false;

      if (vbX >= aExpX - margin && vbX <= aExpX + barW + margin) {
        group = 'A';
        isObserved = false;
      } else if (vbX >= aObsX - margin && vbX <= aObsX + barW + margin) {
        group = 'A';
        isObserved = true;
      } else if (vbX >= bExpX - margin && vbX <= bExpX + barW + margin) {
        group = 'B';
        isObserved = false;
      } else if (vbX >= bObsX - margin && vbX <= bObsX + barW + margin) {
        group = 'B';
        isObserved = true;
      }

      if (!group) return null;

      const isA = group === 'A';
      const expected = isA ? d.expectedA : d.expectedB;
      const observed = isA ? nA : nB;
      const dev = isA ? d.devA : d.devB;
      const barColor = isA ? colors.indigo : colors.emerald;
      const barX = isObserved ? (isA ? aObsX : bObsX) : isA ? aExpX : bExpX;
      const barH = isObserved ? (isA ? d.aObsH : d.bObsH) : isA ? d.aExpH : d.bExpH;

      return {
        x: barX + barW / 2,
        y: baseY - barH - 10,
        lines: [
          { label: 'Group', value: group, color: barColor },
          {
            label: 'Expected',
            value: Math.round(expected).toLocaleString(),
            color: colors.slate400,
          },
          { label: 'Observed', value: Math.round(observed).toLocaleString(), color: barColor },
          {
            label: 'Deviation',
            value: (dev >= 0 ? '+' : '') + dev.toFixed(2) + '%',
            color: d.verdictColor,
          },
        ],
        markers: [{ y: baseY - barH, color: barColor }],
      };
    },
    [d, nA, nB],
  );

  return (
    <div>
      <Hdr sub="Analyze">Sample Ratio Mismatch (SRM)</Hdr>
      <Desc>
        SRM is the #1 data quality check in A/B testing. When your observed traffic split does not
        match the expected ratio, something is wrong with randomization. Before analyzing any
        experiment results, always verify that the sample ratio matches your design.
      </Desc>

      <ChartBox
        h={d.H}
        tooltipLookup={tooltipLookup}
        label="Observed vs expected sample counts for groups A and B with SRM chi-squared test"
      >
        <defs>
          <linearGradient id="grad-obs-a-m35" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="grad-obs-b-m35" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="grad-exp-a-m35" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="grad-exp-b-m35" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const yy = d.baseY - (d.H - d.pt - d.pb) * frac;
          const val = Math.round(d.maxVal * frac);
          return (
            <g key={frac}>
              <line x1={d.pl} y1={yy} x2={d.W - d.pr} y2={yy} stroke={sv.grid} strokeWidth={0.5} />
              <text x={d.pl - 6} y={yy + 3} fill={sv.textFaint} fontSize={9} textAnchor="end">
                {val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}
              </text>
            </g>
          );
        })}

        {/* Baseline axis */}
        <line
          x1={d.pl}
          y1={d.baseY}
          x2={d.W - d.pr}
          y2={d.baseY}
          stroke={sv.axis}
          strokeWidth={1}
        />

        {/* Group A: Expected bar (dashed outline, semi-transparent fill) */}
        <rect
          x={d.aExpX}
          y={d.baseY - d.aExpH}
          width={d.barW}
          height={d.aExpH}
          fill="url(#grad-exp-a-m35)"
          stroke={colors.indigo}
          strokeWidth={1.5}
          strokeDasharray="4,3"
          rx={2}
        />
        {/* Group A: Observed bar (solid fill) */}
        <rect
          x={d.aObsX}
          y={d.baseY - d.aObsH}
          width={d.barW}
          height={d.aObsH}
          fill="url(#grad-obs-a-m35)"
          stroke={colors.indigo}
          strokeWidth={1.5}
          rx={2}
        />
        {/* Group A: Deviation label above observed bar */}
        <text
          x={d.aObsX + d.barW / 2}
          y={d.baseY - d.aObsH - 6}
          fill={d.verdictColor}
          fontSize={10}
          fontWeight="600"
          textAnchor="middle"
        >
          {(d.devA >= 0 ? '+' : '') + d.devA.toFixed(1) + '%'}
        </text>

        {/* Group B: Expected bar (dashed outline, semi-transparent fill) */}
        <rect
          x={d.bExpX}
          y={d.baseY - d.bExpH}
          width={d.barW}
          height={d.bExpH}
          fill="url(#grad-exp-b-m35)"
          stroke={colors.emerald}
          strokeWidth={1.5}
          strokeDasharray="4,3"
          rx={2}
        />
        {/* Group B: Observed bar (solid fill) */}
        <rect
          x={d.bObsX}
          y={d.baseY - d.bObsH}
          width={d.barW}
          height={d.bObsH}
          fill="url(#grad-obs-b-m35)"
          stroke={colors.emerald}
          strokeWidth={1.5}
          rx={2}
        />
        {/* Group B: Deviation label above observed bar */}
        <text
          x={d.bObsX + d.barW / 2}
          y={d.baseY - d.bObsH - 6}
          fill={d.verdictColor}
          fontSize={10}
          fontWeight="600"
          textAnchor="middle"
        >
          {(d.devB >= 0 ? '+' : '') + d.devB.toFixed(1) + '%'}
        </text>

        {/* Group labels */}
        <text
          x={d.pl + d.groupW / 2}
          y={d.baseY + 16}
          fill={colors.indigo}
          fontSize={12}
          fontWeight="600"
          textAnchor="middle"
        >
          Group A
        </text>
        <text
          x={d.pl + d.groupW + d.groupW / 2}
          y={d.baseY + 16}
          fill={colors.emerald}
          fontSize={12}
          fontWeight="600"
          textAnchor="middle"
        >
          Group B
        </text>

        {/* Legend */}
        <rect
          x={d.W - d.pr - 130}
          y={d.pt}
          width={10}
          height={10}
          fill="none"
          stroke={colors.slate400}
          strokeWidth={1}
          strokeDasharray="3,2"
          rx={1}
        />
        <text x={d.W - d.pr - 116} y={d.pt + 9} fill={sv.textFaint} fontSize={9}>
          Expected
        </text>
        <rect
          x={d.W - d.pr - 130}
          y={d.pt + 16}
          width={10}
          height={10}
          fill={colors.slate400}
          rx={1}
        />
        <text x={d.W - d.pr - 116} y={d.pt + 25} fill={sv.textFaint} fontSize={9}>
          Observed
        </text>

        {/* P-value display */}
        <text x={d.pl + 4} y={d.pt + 10} fill={d.verdictColor} fontSize={11} fontWeight="700">
          {'p = ' + (d.pValue < 0.0001 ? d.pValue.toExponential(2) : d.pValue.toFixed(4))}
        </text>
        <text x={d.pl + 4} y={d.pt + 24} fill={d.verdictColor} fontSize={10} fontWeight="600">
          {d.verdict}
        </text>

        {/* Count labels inside bars */}
        <text
          x={d.aExpX + d.barW / 2}
          y={d.baseY - 6}
          fill={sv.textFaint}
          fontSize={8}
          textAnchor="middle"
        >
          {Math.round(d.expectedA).toLocaleString()}
        </text>
        <text
          x={d.aObsX + d.barW / 2}
          y={d.baseY - 6}
          fill={sv.text}
          fontSize={8}
          fontWeight="600"
          textAnchor="middle"
        >
          {Math.round(nA).toLocaleString()}
        </text>
        <text
          x={d.bExpX + d.barW / 2}
          y={d.baseY - 6}
          fill={sv.textFaint}
          fontSize={8}
          textAnchor="middle"
        >
          {Math.round(d.expectedB).toLocaleString()}
        </text>
        <text
          x={d.bObsX + d.barW / 2}
          y={d.baseY - 6}
          fill={sv.text}
          fontSize={8}
          fontWeight="600"
          textAnchor="middle"
        >
          {Math.round(nB).toLocaleString()}
        </text>
      </ChartBox>

      <div className="flex gap-3 mb-6 flex-wrap justify-center">
        <StatBox
          label="Chi-Squared"
          value={d.chiSq < 100 ? d.chiSq.toFixed(3) : d.chiSq.toFixed(1)}
          color={d.verdictColor}
        />
        <StatBox
          label="p-value"
          value={d.pValue < 0.0001 ? d.pValue.toExponential(2) : d.pValue.toFixed(4)}
          color={d.verdictColor}
        />
        <StatBox label="Verdict" value={d.verdict} color={d.verdictColor} />
      </div>

      <Sl
        label="Expected Ratio (Group A)"
        value={expRatio}
        min={0.1}
        max={0.9}
        step={0.01}
        onChange={setExpRatio}
        fmt={(v: number) => (v * 100).toFixed(0) + '% / ' + ((1 - v) * 100).toFixed(0) + '%'}
        color={colors.slate400}
      />
      <Sl
        label="Observed Count — Group A"
        value={nA}
        min={100}
        max={50000}
        step={100}
        onChange={setNA}
        fmt={(v: number) => Math.round(v).toLocaleString()}
        color={colors.indigo}
      />
      <Sl
        label="Observed Count — Group B"
        value={nB}
        min={100}
        max={50000}
        step={100}
        onChange={setNB}
        fmt={(v: number) => Math.round(v).toLocaleString()}
        color={colors.emerald}
      />

      <QA
        items={[
          {
            q: 'What causes SRM?',
            a: 'Common causes include bot filtering affecting groups differently, redirects dropping users, browser/client issues, or bugs in the randomization code. Even a 51/49 split on a large sample is suspicious.',
          },
          {
            q: 'What should I do if SRM is detected?',
            a: 'Do NOT trust the experiment results. Investigate the root cause — check data pipelines, look for bot traffic, verify the randomization mechanism. Only after fixing the issue should you re-run the test.',
          },
        ]}
      />
      <TechNote>
        The chi-squared test compares observed vs expected frequencies. With 1 degree of freedom,
        {' \u03C7\u00B2 = \u03A3(O\u2013E)\u00B2/E'}. Even small percentage deviations become
        significant with large samples. A common threshold is p {'<'} 0.001.
      </TechNote>
      <Insight>
        SRM is the first thing you should check before looking at any experiment results. If the
        traffic split is wrong, every other metric is untrustworthy. Many teams have shipped bad
        features because they skipped this check.
      </Insight>
    </div>
  );
}
