import { useState, type JSX } from 'react';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, PillBtn, QA, TechNote, Insight } from '../ui';
import { nPDF } from '../../utils/math';

interface TreeQuestion {
  question: string;
  options: { label: string; next: string }[];
  test?: undefined;
  desc?: undefined;
  when?: undefined;
  viz?: undefined;
}

interface TreeLeaf {
  test: string;
  desc: string;
  when: string;
  viz: string;
  question?: undefined;
  options?: undefined;
}

type TreeNode = TreeQuestion | TreeLeaf;

/* ── Visualization types ── */
const VIZ_TWO_CURVES = 'two_curves';
const VIZ_RANK_BARS = 'rank_bars';
const VIZ_BOX_PLOTS = 'box_plots';
const VIZ_CONTINGENCY = 'contingency';
const VIZ_POISSON = 'poisson';

const tree: Record<string, TreeNode> = {
  root: {
    question: 'What type is your outcome variable?',
    options: [
      { label: 'Continuous', next: 'groups_cont' },
      { label: 'Categorical', next: 'groups_cat' },
      { label: 'Count', next: 'count_leaf' },
    ],
  },
  groups_cont: {
    question: 'How many groups are you comparing?',
    options: [
      { label: '1 or 2', next: 'paired_cont' },
      { label: '3 or more', next: 'normal_anova' },
    ],
  },
  paired_cont: {
    question: 'Are the observations paired (same subjects)?',
    options: [
      { label: 'Yes (paired)', next: 'normal_paired' },
      { label: 'No (independent)', next: 'normal_ind' },
    ],
  },
  normal_paired: {
    question: 'Is the data approximately normal?',
    options: [
      { label: 'Yes', next: 'leaf_paired_t' },
      { label: 'No', next: 'leaf_wilcoxon' },
    ],
  },
  normal_ind: {
    question: 'Is the data approximately normal?',
    options: [
      { label: 'Yes', next: 'leaf_two_sample_t' },
      { label: 'No', next: 'leaf_mann_whitney' },
    ],
  },
  normal_anova: {
    question: 'Is the data approximately normal?',
    options: [
      { label: 'Yes', next: 'leaf_anova' },
      { label: 'No', next: 'leaf_kruskal' },
    ],
  },
  groups_cat: {
    question: 'How many groups are you comparing?',
    options: [
      { label: '2 groups', next: 'paired_cat' },
      { label: '3 or more', next: 'leaf_chi_multi' },
    ],
  },
  paired_cat: {
    question: 'Are the observations paired?',
    options: [
      { label: 'Yes (paired)', next: 'leaf_mcnemar' },
      { label: 'No (independent)', next: 'sample_size_cat' },
    ],
  },
  sample_size_cat: {
    question: 'Are all expected cell counts >= 5?',
    options: [
      { label: 'Yes (large sample)', next: 'leaf_chi_square' },
      { label: 'No (small sample)', next: 'leaf_fisher' },
    ],
  },
  // Leaf nodes
  leaf_paired_t: {
    test: 'Paired T-test',
    desc: 'Compares means of two related groups. Example: before/after measurements on the same subjects.',
    when: 'Continuous, 2 groups, paired, normal',
    viz: VIZ_TWO_CURVES,
  },
  leaf_wilcoxon: {
    test: 'Wilcoxon Signed-Rank',
    desc: 'Non-parametric alternative to paired t-test. Uses ranks instead of raw values.',
    when: 'Continuous, 2 groups, paired, non-normal',
    viz: VIZ_RANK_BARS,
  },
  leaf_two_sample_t: {
    test: 'Two-Sample T-test (or Z-test)',
    desc: 'Compares means of two independent groups. The workhorse of A/B testing. Use Z-test when n > 30.',
    when: 'Continuous, 2 groups, independent, normal',
    viz: VIZ_TWO_CURVES,
  },
  leaf_mann_whitney: {
    test: 'Mann-Whitney U',
    desc: 'Non-parametric alternative to two-sample t-test. Compares rank distributions.',
    when: 'Continuous, 2 groups, independent, non-normal',
    viz: VIZ_RANK_BARS,
  },
  leaf_anova: {
    test: 'One-Way ANOVA',
    desc: 'Compares means across 3+ groups simultaneously. Follow up with post-hoc tests (Tukey) to find which pairs differ.',
    when: 'Continuous, 3+ groups, normal',
    viz: VIZ_BOX_PLOTS,
  },
  leaf_kruskal: {
    test: 'Kruskal-Wallis',
    desc: 'Non-parametric alternative to ANOVA. Compares rank distributions across multiple groups.',
    when: 'Continuous, 3+ groups, non-normal',
    viz: VIZ_BOX_PLOTS,
  },
  leaf_chi_square: {
    test: 'Chi-Square Test',
    desc: 'Tests association between categorical variables. Standard for conversion rate comparisons in A/B tests.',
    when: 'Categorical, 2 groups, independent, large sample',
    viz: VIZ_CONTINGENCY,
  },
  leaf_fisher: {
    test: "Fisher's Exact Test",
    desc: 'Exact test for small samples where chi-square assumptions are violated.',
    when: 'Categorical, 2 groups, independent, small sample',
    viz: VIZ_CONTINGENCY,
  },
  leaf_mcnemar: {
    test: "McNemar's Test",
    desc: 'Tests changes in proportions for paired data. Example: same users before/after an intervention.',
    when: 'Categorical, 2 groups, paired',
    viz: VIZ_CONTINGENCY,
  },
  leaf_chi_multi: {
    test: 'Chi-Square Test (Multi-group)',
    desc: 'Tests whether proportions differ across 3+ groups. Common for multi-variant experiments.',
    when: 'Categorical, 3+ groups',
    viz: VIZ_CONTINGENCY,
  },
  count_leaf: {
    test: 'Poisson/Negative Binomial Regression',
    desc: 'For count outcomes (page views, purchases, errors). Models the rate directly.',
    when: 'Count data (events per unit time/exposure)',
    viz: VIZ_POISSON,
  },
};

/* ── Assumptions definitions per test category ── */
const getAssumptions = (
  nodeId: string,
  normal: boolean,
  equalVar: boolean,
  independent: boolean,
) => {
  const warnings: { label: string; ok: boolean; msg: string }[] = [];

  const tTests = ['leaf_paired_t', 'leaf_two_sample_t'];
  const anovaTests = ['leaf_anova'];
  const chiTests = ['leaf_chi_square', 'leaf_chi_multi'];
  const nonParam = ['leaf_wilcoxon', 'leaf_mann_whitney', 'leaf_kruskal'];
  const paired = ['leaf_paired_t', 'leaf_wilcoxon', 'leaf_mcnemar'];
  const fisherTest = ['leaf_fisher'];
  const mcnemarTest = ['leaf_mcnemar'];

  // Normality checks
  if (tTests.includes(nodeId)) {
    warnings.push({
      label: 'Normality',
      ok: normal,
      msg: normal
        ? 'Normality assumption satisfied. T-test is appropriate.'
        : 'Normality may be violated. Consider non-parametric alternative, or verify n > 30 (CLT applies).',
    });
  }
  if (anovaTests.includes(nodeId)) {
    warnings.push({
      label: 'Normality',
      ok: normal,
      msg: normal
        ? 'Normality assumption satisfied for ANOVA.'
        : 'Normality violated. Consider Kruskal-Wallis test or transform data. ANOVA is robust if groups are large (n > 30 each).',
    });
  }
  if (nonParam.includes(nodeId)) {
    warnings.push({
      label: 'Normality',
      ok: true,
      msg: 'Non-parametric test: normality is NOT required. This is always safe.',
    });
  }

  // Equal variances
  if (anovaTests.includes(nodeId)) {
    warnings.push({
      label: 'Equal variances',
      ok: equalVar,
      msg: equalVar
        ? 'Homoscedasticity satisfied. Standard ANOVA is appropriate.'
        : "Unequal variances detected. Use Welch's ANOVA or apply a variance-stabilizing transformation.",
    });
  }
  if (tTests.includes(nodeId) && nodeId === 'leaf_two_sample_t') {
    warnings.push({
      label: 'Equal variances',
      ok: equalVar,
      msg: equalVar
        ? 'Equal variances assumption met. Standard t-test or pooled t-test is fine.'
        : "Unequal variances. Use Welch's t-test (default in most software), which does not assume equal variances.",
    });
  }

  // Independence checks
  if (
    tTests.includes(nodeId) ||
    anovaTests.includes(nodeId) ||
    chiTests.includes(nodeId) ||
    fisherTest.includes(nodeId)
  ) {
    warnings.push({
      label: 'Independence',
      ok: independent,
      msg: independent
        ? 'Observations are independent. Standard test is valid.'
        : 'Independence violated. Consider paired tests, mixed-effects models, or GEE for clustered data.',
    });
  }
  if (paired.includes(nodeId)) {
    warnings.push({
      label: 'Paired design',
      ok: true,
      msg: 'Paired test accounts for within-subject correlation. Ensure pairs are correctly matched.',
    });
  }

  // Chi-square specific: cell counts
  if (chiTests.includes(nodeId)) {
    warnings.push({
      label: 'Cell counts',
      ok: true,
      msg: "Chi-square requires expected cell counts >= 5. If violated, use Fisher's exact test instead.",
    });
  }
  if (fisherTest.includes(nodeId)) {
    warnings.push({
      label: 'Cell counts',
      ok: true,
      msg: "Fisher's exact test handles small cell counts. No minimum sample size requirement.",
    });
  }
  if (mcnemarTest.includes(nodeId)) {
    warnings.push({
      label: 'Independence',
      ok: true,
      msg: "McNemar's test is designed for paired/matched data. Ensure subjects appear in both conditions.",
    });
  }

  // Count data
  if (nodeId === 'count_leaf') {
    warnings.push({
      label: 'Overdispersion',
      ok: equalVar,
      msg: equalVar
        ? 'Variance roughly equals mean. Poisson model is appropriate.'
        : 'Variance exceeds mean (overdispersion). Use Negative Binomial regression instead of Poisson.',
    });
    warnings.push({
      label: 'Independence',
      ok: independent,
      msg: independent
        ? 'Independent observations. Standard count model is valid.'
        : 'Non-independent counts. Consider mixed-effects Poisson/NB or GEE approach.',
    });
  }

  return warnings;
};

/* ── Mini-visualization renderers ── */

const renderTwoCurves = () => {
  const W = 600,
    H = 140;
  const pad = { l: 40, r: 40, t: 20, b: 30 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  // Two normal curves: mean=0,std=0.4 and mean=0.5,std=0.4
  const pts = 120;
  const xMin = -1.2,
    xMax = 1.7;

  const toSVG = (xVal: number, yVal: number) => {
    const sx = pad.l + ((xVal - xMin) / (xMax - xMin)) * pw;
    const maxPDF = nPDF(0, 0, 0.4); // peak of first curve
    const sy = pad.t + ph - (yVal / (maxPDF * 1.15)) * ph;
    return [sx, sy];
  };

  const makePath = (mean: number, std: number, col: string) => {
    let d = '';
    for (let i = 0; i <= pts; i++) {
      const x = xMin + (i / pts) * (xMax - xMin);
      const y = nPDF(x, mean, std);
      const [sx, sy] = toSVG(x, y);
      d += (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + sy.toFixed(1);
    }
    // close to baseline
    const [endX] = toSVG(xMax, 0);
    const [startX] = toSVG(xMin, 0);
    d +=
      'L' +
      endX.toFixed(1) +
      ',' +
      (pad.t + ph) +
      'L' +
      startX.toFixed(1) +
      ',' +
      (pad.t + ph) +
      'Z';
    return <path key={col} d={d} fill={col} fillOpacity={0.15} stroke={col} strokeWidth={2} />;
  };

  // Mean lines
  const [m1x, m1y] = toSVG(0, nPDF(0, 0, 0.4));
  const [m2x, m2y] = toSVG(0.5, nPDF(0.5, 0.5, 0.4));
  const baseY = pad.t + ph;

  return (
    <>
      {makePath(0, 0.4, colors.indigo)}
      {makePath(0.5, 0.4, colors.emerald)}
      <line
        x1={m1x}
        y1={m1y}
        x2={m1x}
        y2={baseY}
        stroke={colors.indigo}
        strokeWidth={1.5}
        strokeDasharray="4,3"
        opacity={0.7}
      />
      <line
        x1={m2x}
        y1={m2y}
        x2={m2x}
        y2={baseY}
        stroke={colors.emerald}
        strokeWidth={1.5}
        strokeDasharray="4,3"
        opacity={0.7}
      />
      <text
        x={m1x}
        y={baseY + 14}
        fill={colors.indigo}
        fontSize={9}
        textAnchor="middle"
        fontWeight="600"
      >
        Group A
      </text>
      <text
        x={m2x}
        y={baseY + 14}
        fill={colors.emerald}
        fontSize={9}
        textAnchor="middle"
        fontWeight="600"
      >
        Group B
      </text>
      {/* Axis line */}
      <line x1={pad.l} y1={baseY} x2={W - pad.r} y2={baseY} stroke={sv.axis} strokeWidth={1} />
      {/* Legend label */}
      <text x={W - pad.r} y={pad.t + 10} fill={sv.text} fontSize={8} textAnchor="end">
        Two sample distributions
      </text>
    </>
  );
};

const renderRankBars = () => {
  const W = 600,
    H = 140;
  const pad = { l: 40, r: 40, t: 16, b: 28 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  // Two sets of 10 rank bars, shuffled
  const ranksA = [3, 7, 1, 9, 5, 2, 10, 4, 8, 6];
  const ranksB = [6, 2, 8, 4, 10, 1, 7, 3, 9, 5];
  const totalBars = 20;
  const barW = Math.min(20, (pw / totalBars) * 0.7);
  const gap = (pw - barW * totalBars) / (totalBars + 1);
  const maxRank = 10;

  const bars: JSX.Element[] = [];
  for (let i = 0; i < 10; i++) {
    const xA = pad.l + gap + i * (barW + gap);
    const hA = (ranksA[i] / maxRank) * ph * 0.85;
    bars.push(
      <rect
        key={'a' + i}
        x={xA}
        y={pad.t + ph - hA}
        width={barW}
        height={hA}
        rx={2}
        fill={colors.indigo}
        fillOpacity={0.6}
        stroke={colors.indigo}
        strokeWidth={0.5}
      />,
    );
  }
  for (let i = 0; i < 10; i++) {
    const xB = pad.l + gap + (i + 10) * (barW + gap);
    const hB = (ranksB[i] / maxRank) * ph * 0.85;
    bars.push(
      <rect
        key={'b' + i}
        x={xB}
        y={pad.t + ph - hB}
        width={barW}
        height={hB}
        rx={2}
        fill={colors.emerald}
        fillOpacity={0.6}
        stroke={colors.emerald}
        strokeWidth={0.5}
      />,
    );
  }

  // Separator line
  const sepX = pad.l + gap + 10 * (barW + gap) - gap / 2;
  const baseY = pad.t + ph;

  return (
    <>
      {bars}
      <line
        x1={sepX}
        y1={pad.t}
        x2={sepX}
        y2={baseY}
        stroke={sv.axis}
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      <line x1={pad.l} y1={baseY} x2={W - pad.r} y2={baseY} stroke={sv.axis} strokeWidth={1} />
      <text
        x={pad.l + (sepX - pad.l) / 2}
        y={baseY + 14}
        fill={colors.indigo}
        fontSize={9}
        textAnchor="middle"
        fontWeight="600"
      >
        Group A ranks
      </text>
      <text
        x={sepX + (W - pad.r - sepX) / 2}
        y={baseY + 14}
        fill={colors.emerald}
        fontSize={9}
        textAnchor="middle"
        fontWeight="600"
      >
        Group B ranks
      </text>
      <text x={W - pad.r} y={pad.t + 10} fill={sv.text} fontSize={8} textAnchor="end">
        Rank distributions
      </text>
    </>
  );
};

const renderBoxPlots = () => {
  const W = 600,
    H = 140;
  const pad = { l: 60, r: 60, t: 16, b: 28 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  // 3 groups with different medians
  const groups = [
    { label: 'Group 1', color: colors.indigo, q1: 0.25, median: 0.4, q3: 0.55, lo: 0.1, hi: 0.7 },
    {
      label: 'Group 2',
      color: colors.emerald,
      q1: 0.4,
      median: 0.58,
      q3: 0.72,
      lo: 0.22,
      hi: 0.88,
    },
    { label: 'Group 3', color: colors.amber, q1: 0.5, median: 0.68, q3: 0.82, lo: 0.3, hi: 0.95 },
  ];

  const boxW = 50;
  const gapBetween = (pw - boxW * 3) / 4;
  const baseY = pad.t + ph;

  const toY = (v: number) => pad.t + ph - v * ph;

  const elements: JSX.Element[] = [];

  groups.forEach((g, i) => {
    const cx = pad.l + gapBetween * (i + 1) + boxW * i + boxW / 2;
    const x = cx - boxW / 2;

    // Whisker line (lo to hi)
    elements.push(
      <line
        key={'w' + i}
        x1={cx}
        y1={toY(g.hi)}
        x2={cx}
        y2={toY(g.lo)}
        stroke={g.color}
        strokeWidth={1.5}
        opacity={0.5}
      />,
    );
    // Whisker caps
    elements.push(
      <line
        key={'wt' + i}
        x1={cx - 10}
        y1={toY(g.hi)}
        x2={cx + 10}
        y2={toY(g.hi)}
        stroke={g.color}
        strokeWidth={1.5}
        opacity={0.5}
      />,
    );
    elements.push(
      <line
        key={'wb' + i}
        x1={cx - 10}
        y1={toY(g.lo)}
        x2={cx + 10}
        y2={toY(g.lo)}
        stroke={g.color}
        strokeWidth={1.5}
        opacity={0.5}
      />,
    );
    // Box (Q1 to Q3)
    elements.push(
      <rect
        key={'box' + i}
        x={x}
        y={toY(g.q3)}
        width={boxW}
        height={toY(g.q1) - toY(g.q3)}
        rx={4}
        fill={g.color}
        fillOpacity={0.12}
        stroke={g.color}
        strokeWidth={1.5}
      />,
    );
    // Median line
    elements.push(
      <line
        key={'med' + i}
        x1={x}
        y1={toY(g.median)}
        x2={x + boxW}
        y2={toY(g.median)}
        stroke={g.color}
        strokeWidth={2.5}
      />,
    );
    // Label
    elements.push(
      <text
        key={'lbl' + i}
        x={cx}
        y={baseY + 14}
        fill={g.color}
        fontSize={9}
        textAnchor="middle"
        fontWeight="600"
      >
        {g.label}
      </text>,
    );
  });

  // Axis
  elements.push(
    <line
      key="axis"
      x1={pad.l - 10}
      y1={baseY}
      x2={W - pad.r + 10}
      y2={baseY}
      stroke={sv.axis}
      strokeWidth={1}
    />,
  );
  elements.push(
    <text key="title" x={W - pad.r} y={pad.t + 10} fill={sv.text} fontSize={8} textAnchor="end">
      Group comparison (box plots)
    </text>,
  );

  return <>{elements}</>;
};

const renderContingency = () => {
  const W = 600,
    H = 140;
  // 2x2 grid: Observed vs Expected
  const cellW = 100,
    cellH = 36,
    gap = 8;
  const gridW = cellW * 2 + gap;
  const gridH = cellH * 2 + gap;
  const startX = (W - gridW) / 2;
  const startY = (H - gridH) / 2 + 4;

  const observed = [
    [45, 15],
    [30, 10],
  ];
  const obsCols = [
    [colors.indigo, colors.emerald],
    [colors.emerald, colors.indigo],
  ];
  const opacities = [
    [0.25, 0.15],
    [0.15, 0.1],
  ];

  const elements: JSX.Element[] = [];

  // "Observed" label
  elements.push(
    <text
      key="obs-title"
      x={startX + gridW / 2}
      y={startY - 6}
      fill={sv.text}
      fontSize={9}
      textAnchor="middle"
      fontWeight="600"
    >
      Observed Frequencies
    </text>,
  );

  // Row labels
  elements.push(
    <text
      key="r0"
      x={startX - 8}
      y={startY + cellH / 2 + 4}
      fill={sv.text}
      fontSize={8}
      textAnchor="end"
    >
      Row 1
    </text>,
  );
  elements.push(
    <text
      key="r1"
      x={startX - 8}
      y={startY + cellH + gap + cellH / 2 + 4}
      fill={sv.text}
      fontSize={8}
      textAnchor="end"
    >
      Row 2
    </text>,
  );
  // Col labels
  elements.push(
    <text
      key="c0"
      x={startX + cellW / 2}
      y={startY + gridH + 14}
      fill={sv.text}
      fontSize={8}
      textAnchor="middle"
    >
      Col 1
    </text>,
  );
  elements.push(
    <text
      key="c1"
      x={startX + cellW + gap + cellW / 2}
      y={startY + gridH + 14}
      fill={sv.text}
      fontSize={8}
      textAnchor="middle"
    >
      Col 2
    </text>,
  );

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const x = startX + c * (cellW + gap);
      const y = startY + r * (cellH + gap);
      elements.push(
        <rect
          key={'cell' + r + c}
          x={x}
          y={y}
          width={cellW}
          height={cellH}
          rx={6}
          fill={obsCols[r][c]}
          fillOpacity={opacities[r][c]}
          stroke={obsCols[r][c]}
          strokeWidth={1}
          opacity={0.8}
        />,
      );
      elements.push(
        <text
          key={'val' + r + c}
          x={x + cellW / 2}
          y={y + cellH / 2 + 4}
          fill={obsCols[r][c]}
          fontSize={13}
          textAnchor="middle"
          fontWeight="700"
        >
          {observed[r][c]}
        </text>,
      );
    }
  }

  // "Expected" mini table on the right
  const expX = startX + gridW + 40;
  elements.push(
    <text
      key="exp-title"
      x={expX + gridW / 2 - 40}
      y={startY - 6}
      fill={sv.text}
      fontSize={9}
      textAnchor="middle"
      fontWeight="600"
    >
      Expected
    </text>,
  );

  const expected = [
    [37.5, 22.5],
    [37.5, 2.5],
  ];
  const miniW = 60,
    miniH = 28,
    miniGap = 4;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const x = expX + c * (miniW + miniGap) - 40;
      const y = startY + r * (miniH + miniGap);
      elements.push(
        <rect
          key={'exp' + r + c}
          x={x}
          y={y}
          width={miniW}
          height={miniH}
          rx={4}
          fill={sv.axis}
          fillOpacity={0.4}
          stroke={sv.axis}
          strokeWidth={1}
        />,
      );
      elements.push(
        <text
          key={'expv' + r + c}
          x={x + miniW / 2}
          y={y + miniH / 2 + 3}
          fill={sv.text}
          fontSize={10}
          textAnchor="middle"
          fontWeight="600"
        >
          {expected[r][c].toFixed(1)}
        </text>,
      );
    }
  }

  return <>{elements}</>;
};

const renderPoisson = () => {
  const W = 600,
    H = 140;
  const pad = { l: 50, r: 50, t: 16, b: 28 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  // Poisson-like histogram with lambda=3
  const lambda = 3;
  const maxK = 12;
  const vals: number[] = [];
  for (let k = 0; k <= maxK; k++) {
    // Poisson PMF: e^(-lambda) * lambda^k / k!
    let logP = -lambda + k * Math.log(lambda);
    let logFact = 0;
    for (let j = 2; j <= k; j++) logFact += Math.log(j);
    logP -= logFact;
    vals.push(Math.exp(logP));
  }
  const maxVal = Math.max(...vals);

  const barW = Math.min(30, (pw / (maxK + 1)) * 0.7);
  const gapBar = (pw - barW * (maxK + 1)) / (maxK + 2);
  const baseY = pad.t + ph;

  const elements: JSX.Element[] = [];
  for (let k = 0; k <= maxK; k++) {
    const x = pad.l + gapBar * (k + 1) + barW * k;
    const h = (vals[k] / maxVal) * ph * 0.88;
    const opacity = 0.3 + (vals[k] / maxVal) * 0.5;
    elements.push(
      <rect
        key={'bar' + k}
        x={x}
        y={baseY - h}
        width={barW}
        height={h}
        rx={2}
        fill={colors.indigo}
        fillOpacity={opacity}
        stroke={colors.indigo}
        strokeWidth={0.8}
      />,
    );
    if (k % 2 === 0 || k <= 6) {
      elements.push(
        <text
          key={'lbl' + k}
          x={x + barW / 2}
          y={baseY + 12}
          fill={sv.text}
          fontSize={7}
          textAnchor="middle"
        >
          {k}
        </text>,
      );
    }
  }

  // Axis
  elements.push(
    <line
      key="axis"
      x1={pad.l}
      y1={baseY}
      x2={W - pad.r}
      y2={baseY}
      stroke={sv.axis}
      strokeWidth={1}
    />,
  );
  elements.push(
    <text key="xlabel" x={W / 2} y={baseY + 24} fill={sv.text} fontSize={8} textAnchor="middle">
      Count (k)
    </text>,
  );
  elements.push(
    <text key="title" x={W - pad.r} y={pad.t + 10} fill={sv.text} fontSize={8} textAnchor="end">
      Poisson distribution (lambda=3)
    </text>,
  );

  return <>{elements}</>;
};

const renderViz = (vizType: string) => {
  switch (vizType) {
    case VIZ_TWO_CURVES:
      return renderTwoCurves();
    case VIZ_RANK_BARS:
      return renderRankBars();
    case VIZ_BOX_PLOTS:
      return renderBoxPlots();
    case VIZ_CONTINGENCY:
      return renderContingency();
    case VIZ_POISSON:
      return renderPoisson();
    default:
      return null;
  }
};

/* ── Assumptions Checker Component ── */

function AssumptionsChecker({ nodeId }: { nodeId: string }) {
  const [normal, setNormal] = useState(true);
  const [equalVar, setEqualVar] = useState(true);
  const [independent, setIndependent] = useState(true);

  const warnings = getAssumptions(nodeId, normal, equalVar, independent);

  const Toggle = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200"
      style={{
        background: value ? sv.fillEmeraldSubtle : sv.fillAmberSubtle,
        border: '1px solid ' + (value ? sv.borderEmerald : sv.borderAmber),
      }}
    >
      <span
        className="inline-block rounded-full transition-all duration-200"
        style={{
          width: 32,
          height: 18,
          background: value ? colors.emerald : colors.amber,
          opacity: value ? 0.6 : 0.5,
          position: 'relative',
        }}
      >
        <span
          className="inline-block rounded-full absolute transition-all duration-200"
          style={{
            width: 14,
            height: 14,
            background: '#fff',
            top: 2,
            left: value ? 16 : 2,
          }}
        />
      </span>
      <span
        className="text-[12px] font-semibold"
        style={{ color: value ? colors.emerald : colors.amber }}
      >
        {label}: {value ? 'Yes' : 'No'}
      </span>
    </button>
  );

  return (
    <div className="rounded-xl p-5 mb-5 bg-app-glass border border-[var(--color-border-subtle)]">
      <div className="text-[11px] uppercase tracking-widest mb-3 font-bold text-[var(--svg-text)]">
        Assumptions Checker
      </div>
      <div className="text-[12px] text-[var(--svg-text)] mb-4 leading-relaxed">
        Toggle each assumption to check whether this test is appropriate for your data.
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        <Toggle label="Normal distribution" value={normal} onChange={setNormal} />
        <Toggle label="Equal variances" value={equalVar} onChange={setEqualVar} />
        <Toggle label="Independent observations" value={independent} onChange={setIndependent} />
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-[12px] leading-relaxed"
              style={{
                background: w.ok ? sv.fillEmeraldSubtle : sv.fillAmberSubtle,
                border: '1px solid ' + (w.ok ? sv.borderEmerald : sv.borderAmber),
              }}
            >
              <span
                className="mt-0.5 shrink-0 font-bold text-[11px]"
                style={{ color: w.ok ? colors.emerald : colors.amber }}
              >
                {w.ok ? '\u2713' : '\u26A0'}
              </span>
              <div>
                <span
                  className="font-semibold"
                  style={{ color: w.ok ? colors.emerald : colors.amber }}
                >
                  {w.label}:
                </span>{' '}
                <span className="text-[var(--color-text-primary)]">{w.msg}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */

export default function M10TestChooser() {
  const [path, setPath] = useState(['root']);

  const currentNodeId = path[path.length - 1];
  const currentNode = tree[currentNodeId];
  const isLeaf = !!currentNode.test;

  const handleChoice = (nextId: string) => {
    setPath([...path, nextId]);
  };

  const reset = () => setPath(['root']);

  // SVG flowchart
  const W = 600;
  const nodeW = 220,
    nodeH = 38,
    gapY = 52;
  const leafW = 240,
    leafH = 42;

  const renderNodesSVG = () => {
    const elements: JSX.Element[] = [];
    const levels = path.map((id) => tree[id]);

    levels.forEach((node, i) => {
      const y = 20 + i * (nodeH + gapY);
      const isActive = i === path.length - 1;
      const isFinal = !!node.test;

      const w = isFinal ? leafW : nodeW;
      const h = isFinal ? leafH : nodeH;
      const x = W / 2 - w / 2;

      // Connector line + arrow to this node from previous
      if (i > 0) {
        const prevY = 20 + (i - 1) * (nodeH + gapY) + nodeH;
        const arrowY = y;
        const midY = (prevY + arrowY) / 2;

        // Vertical line
        elements.push(
          <line
            key={'line-' + i}
            x1={W / 2}
            y1={prevY}
            x2={W / 2}
            y2={arrowY}
            stroke={colors.indigo}
            strokeWidth={1.5}
            opacity={0.35}
          />,
        );
        // Arrow head
        elements.push(
          <polygon
            key={'arrow-' + i}
            points={`${W / 2},${arrowY} ${W / 2 - 5},${arrowY - 7} ${W / 2 + 5},${arrowY - 7}`}
            fill={colors.indigo}
            opacity={0.5}
          />,
        );

        // Choice label pill
        const chosenOption = tree[path[i - 1]].options?.find((o) => o.next === path[i]);
        if (chosenOption) {
          const pillText = chosenOption.label;
          const pillW = pillText.length * 6.5 + 20;
          elements.push(
            <g key={'pill-' + i}>
              <rect
                x={W / 2 + 10}
                y={midY - 10}
                width={pillW}
                height={20}
                rx={10}
                fill="var(--color-app-bg)"
                stroke={colors.indigo}
                strokeWidth={1}
                opacity={0.7}
              />
              <text
                x={W / 2 + 10 + pillW / 2}
                y={midY + 4}
                fill={colors.indigo}
                fontSize={10}
                textAnchor="middle"
                fontWeight="600"
              >
                {pillText}
              </text>
            </g>,
          );
        }
      }

      // Node box
      if (isFinal) {
        // Leaf: result node with accent styling
        elements.push(
          <g key={'node-' + i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={14}
              fill={sv.fillEmeraldSubtle}
              stroke={colors.emerald}
              strokeWidth={2}
            />
            <text
              x={W / 2}
              y={y + h / 2 + 5}
              fill={colors.emerald}
              fontSize={12}
              textAnchor="middle"
              fontWeight="700"
            >
              {node.test}
            </text>
          </g>,
        );
      } else if (isActive) {
        // Active question node
        elements.push(
          <g key={'node-' + i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={12}
              fill={sv.fillIndigoSubtle}
              stroke={colors.indigo}
              strokeWidth={1.5}
            />
            <text
              x={W / 2}
              y={y + h / 2 + 4}
              fill={colors.indigo}
              fontSize={11}
              textAnchor="middle"
              fontWeight="600"
            >
              {node.question}
            </text>
          </g>,
        );
      } else {
        // Past (answered) question node
        elements.push(
          <g key={'node-' + i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={12}
              fill={sv.fillIndigoSubtle}
              stroke={sv.axis}
              strokeWidth={1}
              opacity={0.7}
            />
            <text
              x={W / 2}
              y={y + h / 2 + 4}
              fill={sv.textFaint}
              fontSize={10}
              textAnchor="middle"
              fontWeight="500"
            >
              {node.question}
            </text>
          </g>,
        );
      }
    });

    return elements;
  };

  const svgH = 20 + path.length * (nodeH + gapY) - gapY + (isLeaf ? leafH - nodeH : 0) + 10;

  return (
    <div>
      <Hdr sub="Analyze">Choosing the Right Statistical Test</Hdr>
      <Desc>
        Answer a few questions about your data and this decision tree will recommend the appropriate
        statistical test. The right test depends on your outcome type, number of groups, pairing,
        and distributional assumptions.
      </Desc>

      <div className="bg-app-surface rounded-2xl p-6 mb-7 ring-1 ring-[var(--color-border-subtle)]">
        <svg
          viewBox={'0 0 ' + W + ' ' + svgH}
          width="100%"
          style={{ maxHeight: svgH, display: 'block', overflow: 'visible' }}
        >
          {renderNodesSVG()}
        </svg>
      </div>

      {/* Current step */}
      {!isLeaf && (
        <div className="mb-5">
          <div className="text-[13px] text-[var(--color-text-primary)] font-semibold mb-3">
            {currentNode.question}
          </div>
          <div className="flex gap-2 flex-wrap">
            {currentNode.options?.map((opt) => (
              <PillBtn key={opt.next} on={false} onClick={() => handleChoice(opt.next)}>
                {opt.label}
              </PillBtn>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {isLeaf && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{ background: sv.fillEmeraldSubtle, border: '1px solid ' + sv.borderEmerald }}
        >
          <div className="text-[11px] uppercase tracking-widest mb-2 font-bold text-[var(--color-emerald-text)]">
            Recommended Test
          </div>
          <div className="text-lg font-bold text-[var(--color-emerald-text)] mb-2">
            {currentNode.test}
          </div>
          <div className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-2">
            {currentNode.desc}
          </div>
          <div className="text-xs text-[var(--svg-text)]">When: {currentNode.when}</div>
        </div>
      )}

      {/* Mini-visualization for leaf nodes */}
      {isLeaf && currentNode.viz && (
        <ChartBox
          h={140}
          label="Distribution comparison for the recommended statistical test, showing test statistic and critical region"
        >
          {renderViz(currentNode.viz)}
        </ChartBox>
      )}

      {/* Assumptions Checker for leaf nodes */}
      {isLeaf && <AssumptionsChecker nodeId={currentNodeId} />}

      <div className="flex gap-2 mb-4">
        {path.length > 1 && (
          <PillBtn on={false} onClick={() => setPath(path.slice(0, -1))}>
            ← Back
          </PillBtn>
        )}
        <PillBtn on={false} onClick={reset}>
          Start Over
        </PillBtn>
      </div>

      <QA
        items={[
          {
            q: "I'm not sure if my data is normal — what should I do?",
            a: 'For n > 30, the Central Limit Theorem means t-tests are robust to non-normality. For smaller samples, plot a histogram or use a Shapiro-Wilk test. When in doubt, the non-parametric alternative is always safe (slightly less powerful but valid).',
          },
          {
            q: 'What about A/B tests with multiple variants?',
            a: "Use ANOVA (continuous) or Chi-square (categorical) to test overall differences first. If significant, use post-hoc pairwise tests with multiple testing correction (Tukey for ANOVA, pairwise chi-square with Bonferroni). Don't just test each variant against control separately.",
          },
        ]}
      />
      <TechNote>
        This tree covers the most common scenarios. Advanced cases: repeated measures → mixed
        effects models; time-to-event → survival analysis (log-rank, Cox); clustered data → GEE or
        multilevel models; high-dimensional → FDR control with BH procedure.
      </TechNote>
      <Insight>
        Choosing the wrong test doesn't always give wrong results — many tests are robust to
        moderate violations of their assumptions. But using the right test gives you the most
        statistical power to detect real effects with the data you have.
      </Insight>
    </div>
  );
}
