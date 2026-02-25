import { useMemo, useCallback } from 'react';
import { betaPDF, cumulativeRegret } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';
import useBanditSim, { type Algorithm } from '../../hooks/useBanditSim';

const algorithms: Record<Algorithm, { label: string }> = {
  thompson: { label: 'Thompson Sampling' },
  epsilon: { label: 'Epsilon-Greedy' },
  ucb1: { label: 'UCB1' },
};

const armProbs: Record<number, number[]> = {
  2: [0.3, 0.5],
  3: [0.3, 0.5, 0.4],
  4: [0.3, 0.5, 0.4, 0.35],
  5: [0.3, 0.5, 0.4, 0.35, 0.45],
};

const armColors = [colors.indigo, colors.emerald, colors.red, colors.amber, colors.slate400];

const defaults = { algKey: 'thompson', nArms: 3, epsilon: 10, speed: 50 };

export default function M32MultiarmedBandits() {
  const [p, set] = useAnimatedParams(defaults);
  const nArms = Math.round(p.nArms) as 2 | 3 | 4 | 5;
  const algKey = p.algKey as Algorithm;
  const epsilon = Math.round(p.epsilon);
  const speed = Math.round(p.speed);
  const trueProbs = armProbs[nArms] || armProbs[3];
  const optimalRate = Math.max(...trueProbs);

  const { state, start, pause, reset, stepOnce } = useBanditSim(
    nArms,
    trueProbs,
    algKey,
    epsilon / 100,
    speed,
  );

  // ── Chart 1: Cumulative Reward ──
  const chart1 = useMemo(() => {
    const W = 600,
      H = 200,
      pl = 44,
      pr = 20,
      pt = 18,
      pb = 30;
    const n = state.rewards.length;
    if (n === 0) {
      return {
        W,
        H,
        pl,
        pr,
        pt,
        pb,
        actualPath: '',
        oraclePath: '',
        n: 0,
        maxY: 10,
        ticks: [] as number[],
      };
    }
    const cumRewards: number[] = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += state.rewards[i];
      cumRewards.push(sum);
    }
    const oracleMax = optimalRate * n;
    const maxY = Math.max(oracleMax, sum, 1);
    const toX = (i: number) => pl + (i / Math.max(n - 1, 1)) * (W - pl - pr);
    const toY = (v: number) => H - pb - (v / maxY) * (H - pt - pb);

    let actualPath = '';
    let oraclePath = '';
    for (let i = 0; i < n; i++) {
      const sx = toX(i);
      actualPath += (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + toY(cumRewards[i]).toFixed(1);
      oraclePath +=
        (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + toY(optimalRate * (i + 1)).toFixed(1);
    }

    const tickStep = n <= 200 ? 50 : n <= 500 ? 100 : 200;
    const ticks: number[] = [];
    for (let v = tickStep; v <= n; v += tickStep) ticks.push(v);

    return {
      W,
      H,
      pl,
      pr,
      pt,
      pb,
      actualPath,
      oraclePath,
      n,
      maxY,
      ticks,
      toX,
      toY,
      cumTotal: sum,
    };
  }, [state.rewards, optimalRate]);

  // ── Chart 2: Per-Arm Beta Posteriors ──
  const chart2 = useMemo(() => {
    const W = 600,
      H = 180,
      pl = 36,
      pr = 36,
      pt = 18,
      pb = 30;
    const steps = 200;
    let maxY = 0;
    const curves: { path: string; area: string; color: string }[] = [];
    for (let arm = 0; arm < nArms; arm++) {
      const a = state.arms[arm].wins + 1;
      const b = state.arms[arm].trials - state.arms[arm].wins + 1;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        const x = i / steps;
        const y = betaPDF(x, a, b);
        maxY = Math.max(maxY, y);
        pts.push({ x, y });
      }
      curves.push({ path: '', area: '', color: armColors[arm], pts } as never);
    }
    // Rebuild paths with final maxY
    const toX = (v: number) => pl + v * (W - pl - pr);
    const toY = (v: number) => H - pb - (v / (maxY || 1)) * (H - pt - pb);

    const result: { path: string; area: string; color: string }[] = [];
    for (let arm = 0; arm < nArms; arm++) {
      const a = state.arms[arm].wins + 1;
      const b = state.arms[arm].trials - state.arms[arm].wins + 1;
      let path = '';
      let area = '';
      for (let i = 0; i <= steps; i++) {
        const xVal = i / steps;
        const yVal = betaPDF(xVal, a, b);
        const sx = toX(xVal);
        const sy = toY(yVal);
        path += (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + sy.toFixed(1);
        if (i === 0) area = 'M' + sx.toFixed(1) + ',' + toY(0).toFixed(1);
        area += 'L' + sx.toFixed(1) + ',' + sy.toFixed(1);
      }
      area += 'L' + toX(1).toFixed(1) + ',' + toY(0).toFixed(1) + 'Z';
      result.push({ path, area, color: armColors[arm] });
    }

    const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    return { W, H, pl, pr, pt, pb, curves: result, maxY, ticks, toX, toY };
  }, [state.arms, nArms]);

  // ── Chart 3: Cumulative Regret ──
  const chart3 = useMemo(() => {
    const W = 600,
      H = 160,
      pl = 44,
      pr = 20,
      pt = 18,
      pb = 30;
    const n = state.rewards.length;
    if (n === 0) {
      return { W, H, pl, pr, pt, pb, path: '', n: 0, maxRegret: 1, ticks: [] as number[] };
    }
    const regret = cumulativeRegret(state.rewards, optimalRate);
    const maxRegret = Math.max(regret[regret.length - 1], 1);
    const toX = (i: number) => pl + (i / Math.max(n - 1, 1)) * (W - pl - pr);
    const toY = (v: number) => H - pb - (v / maxRegret) * (H - pt - pb);

    let path = '';
    for (let i = 0; i < n; i++) {
      path += (i === 0 ? 'M' : 'L') + toX(i).toFixed(1) + ',' + toY(regret[i]).toFixed(1);
    }

    const tickStep = n <= 200 ? 50 : n <= 500 ? 100 : 200;
    const ticks: number[] = [];
    for (let v = tickStep; v <= n; v += tickStep) ticks.push(v);

    return {
      W,
      H,
      pl,
      pr,
      pt,
      pb,
      path,
      n,
      maxRegret,
      ticks,
      toX,
      toY,
      finalRegret: regret[n - 1],
    };
  }, [state.rewards, optimalRate]);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const arms = state.arms;
    let bestArm = 0;
    let bestRate = -1;
    for (let i = 0; i < arms.length; i++) {
      const rate = arms[i].trials > 0 ? arms[i].wins / arms[i].trials : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestArm = i;
      }
    }
    const totalWins = arms.reduce((s, a) => s + a.wins, 0);
    const regret = cumulativeRegret(state.rewards, optimalRate);
    const totalRegret = regret.length > 0 ? regret[regret.length - 1] : 0;
    const bestArmTrials = arms[bestArm]?.trials || 0;
    const totalTrials = state.totalTrials;
    const explorationPct =
      totalTrials > 0 ? ((totalTrials - bestArmTrials) / totalTrials) * 100 : 0;
    return {
      bestArm,
      bestRate,
      totalWins,
      totalRegret,
      explorationPct,
    };
  }, [state.arms, state.rewards, state.totalTrials, optimalRate]);

  // ── Tooltip for chart 1 ──
  const tooltipLookup1 = useCallback(
    (vbX: number) => {
      const { W, H, pl, pr, pt, pb, n } = chart1;
      if (n === 0 || vbX < pl || vbX > W - pr) return null;
      const frac = (vbX - pl) / (W - pl - pr);
      const idx = Math.min(Math.round(frac * (n - 1)), n - 1);
      let cumR = 0;
      for (let i = 0; i <= idx; i++) cumR += state.rewards[i];
      const oracle = optimalRate * (idx + 1);
      const toX = (i: number) => pl + (i / Math.max(n - 1, 1)) * (W - pl - pr);
      const maxY = Math.max(oracle, cumR, 1);
      const toY = (v: number) => H - pb - (v / maxY) * (H - pt - pb);
      return {
        x: toX(idx),
        y: Math.min(toY(cumR), toY(oracle)),
        lines: [
          { label: 'Actual', value: String(cumR), color: colors.emerald },
          { label: 'Oracle', value: oracle.toFixed(1), color: colors.amber },
          { label: 'Trial', value: String(idx + 1), color: colors.slate400 },
        ],
        markers: [
          { y: toY(cumR), color: colors.emerald },
          { y: toY(oracle), color: colors.amber },
        ],
      };
    },
    [chart1, state.rewards, optimalRate],
  );

  return (
    <div>
      <Hdr sub="Analyze">Multi-Armed Bandits</Hdr>
      <Desc>
        Traditional A/B tests allocate traffic equally and wait for a fixed horizon. Multi-armed
        bandits adapt allocation in real time, sending more traffic to winning variants as evidence
        accumulates. This reduces regret &mdash; the opportunity cost of showing inferior variants
        &mdash; but trades off against statistical rigor.
      </Desc>

      {/* Algorithm presets */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(Object.entries(algorithms) as [Algorithm, { label: string }][]).map(([key, alg]) => (
          <PillBtn key={key} on={algKey === key} onClick={() => set('algKey', key)}>
            {alg.label}
          </PillBtn>
        ))}
      </div>

      {/* Control buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={state.running ? pause : start}
          className="py-2 px-4 rounded-lg text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all duration-200 min-h-[36px] backdrop-blur-sm bg-app-card text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)] flex items-center gap-1.5"
          aria-label={state.running ? 'Pause simulation' : 'Play simulation'}
        >
          {state.running ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor" />
              <rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 2.5L13 8L4 13.5V2.5Z" fill="currentColor" />
            </svg>
          )}
          {state.running ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={stepOnce}
          className="py-2 px-4 rounded-lg text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all duration-200 min-h-[36px] text-[var(--svg-text)] hover:text-[var(--color-text-primary)] hover:bg-app-glass ring-1 ring-[var(--color-border-subtle)] flex items-center gap-1.5"
          aria-label="Step one trial"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 2.5L9 8L3 13.5V2.5Z" fill="currentColor" />
            <rect x="11" y="2" width="2.5" height="12" rx="0.5" fill="currentColor" />
          </svg>
          Step
        </button>
        <button
          onClick={reset}
          className="py-2 px-4 rounded-lg text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all duration-200 min-h-[36px] text-[var(--svg-text)] hover:text-[var(--color-text-primary)] hover:bg-app-glass ring-1 ring-[var(--color-border-subtle)] flex items-center gap-1.5"
          aria-label="Reset simulation"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 8a6 6 0 1 1 1.76 4.24"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M2 12.5V8.5H6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Reset
        </button>
      </div>

      {/* Chart 1: Cumulative Reward */}
      <ChartBox h={chart1.H} label="Cumulative reward vs oracle" tooltipLookup={tooltipLookup1}>
        <defs>
          <linearGradient id="grad-reward-32" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line
          x1={chart1.pl}
          y1={chart1.H - chart1.pb}
          x2={chart1.W - chart1.pr}
          y2={chart1.H - chart1.pb}
          stroke={sv.axis}
        />
        {chart1.ticks.map((v) => {
          const tx = chart1.toX ? chart1.toX(v) : chart1.pl;
          return (
            <g key={v}>
              <line
                x1={tx}
                y1={chart1.pt}
                x2={tx}
                y2={chart1.H - chart1.pb}
                stroke={sv.grid}
                strokeWidth={0.5}
              />
              <text
                x={tx}
                y={chart1.H - chart1.pb + 14}
                fill={sv.text}
                fontSize={9}
                textAnchor="middle"
              >
                {v}
              </text>
            </g>
          );
        })}
        {/* Oracle line */}
        {chart1.oraclePath && (
          <path
            d={chart1.oraclePath}
            fill="none"
            stroke={colors.amber}
            strokeWidth={1.5}
            strokeDasharray="5,4"
            opacity={0.7}
          />
        )}
        {/* Actual reward line */}
        {chart1.actualPath && (
          <path d={chart1.actualPath} fill="none" stroke={colors.emerald} strokeWidth={2.5} />
        )}
        {/* Y-axis label */}
        <text x={chart1.pl - 6} y={chart1.pt + 4} fill={sv.text} fontSize={9} textAnchor="end">
          Cum.
        </text>
        {/* Legend */}
        <text
          x={chart1.pl + 4}
          y={chart1.pt - 4}
          fill={colors.emerald}
          fontSize={9}
          fontWeight="600"
        >
          Actual
        </text>
        <text
          x={chart1.W - chart1.pr - 4}
          y={chart1.pt - 4}
          fill={colors.amber}
          fontSize={9}
          textAnchor="end"
          fontWeight="600"
        >
          Oracle (best arm)
        </text>
      </ChartBox>

      {/* Chart 2: Per-Arm Beta Posteriors */}
      <ChartBox h={chart2.H} label="Beta posterior distributions for each arm">
        <defs>
          {armColors.slice(0, nArms).map((c, i) => (
            <linearGradient key={i} id={`grad-arm${i}-32`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity="0.25" />
              <stop offset="100%" stopColor={c} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {/* Areas */}
        {chart2.curves.map((c, i) => (
          <path key={'a' + i} d={c.area} fill={`url(#grad-arm${i}-32)`} />
        ))}
        {/* Lines */}
        {chart2.curves.map((c, i) => {
          const lastSelected =
            state.selectedArms.length > 0 ? state.selectedArms[state.selectedArms.length - 1] : -1;
          return (
            <path
              key={'l' + i}
              d={c.path}
              fill="none"
              stroke={c.color}
              strokeWidth={i === lastSelected ? 3 : 1.8}
              opacity={i === lastSelected ? 1 : 0.7}
            />
          );
        })}
        {/* X axis */}
        <line
          x1={chart2.pl}
          y1={chart2.H - chart2.pb}
          x2={chart2.W - chart2.pr}
          y2={chart2.H - chart2.pb}
          stroke={sv.axis}
        />
        {chart2.ticks.map((v) => (
          <text
            key={v}
            x={chart2.toX(v)}
            y={chart2.H - chart2.pb + 14}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {v.toFixed(1)}
          </text>
        ))}
        {/* True probability markers */}
        {trueProbs.map((prob, i) => (
          <line
            key={'tp' + i}
            x1={chart2.toX(prob)}
            y1={chart2.H - chart2.pb}
            x2={chart2.toX(prob)}
            y2={chart2.H - chart2.pb + 6}
            stroke={armColors[i]}
            strokeWidth={2}
          />
        ))}
        {/* Legend */}
        {trueProbs.map((prob, i) => (
          <text
            key={'leg' + i}
            x={chart2.pl + 4 + i * 110}
            y={chart2.pt - 4}
            fill={armColors[i]}
            fontSize={9}
            fontWeight="600"
          >
            {'Arm ' + (i + 1) + ' (p=' + prob.toFixed(2) + ')'}
          </text>
        ))}
      </ChartBox>

      {/* Chart 3: Cumulative Regret */}
      <ChartBox h={chart3.H} label="Cumulative regret over trials">
        <line
          x1={chart3.pl}
          y1={chart3.H - chart3.pb}
          x2={chart3.W - chart3.pr}
          y2={chart3.H - chart3.pb}
          stroke={sv.axis}
        />
        {chart3.ticks.map((v) => {
          const tx = chart3.toX ? chart3.toX(v) : chart3.pl;
          return (
            <g key={v}>
              <line
                x1={tx}
                y1={chart3.pt}
                x2={tx}
                y2={chart3.H - chart3.pb}
                stroke={sv.grid}
                strokeWidth={0.5}
              />
              <text
                x={tx}
                y={chart3.H - chart3.pb + 14}
                fill={sv.text}
                fontSize={9}
                textAnchor="middle"
              >
                {v}
              </text>
            </g>
          );
        })}
        {chart3.path && <path d={chart3.path} fill="none" stroke={colors.red} strokeWidth={2.5} />}
        <text x={chart3.pl - 6} y={chart3.pt + 4} fill={sv.text} fontSize={9} textAnchor="end">
          Regret
        </text>
        <text x={chart3.pl + 4} y={chart3.pt - 4} fill={colors.red} fontSize={9} fontWeight="600">
          Cumulative Regret
        </text>
      </ChartBox>

      {/* StatBoxes */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="Best Arm"
          value={'Arm ' + (stats.bestArm + 1) + ' (' + (stats.bestRate * 100).toFixed(0) + '%)'}
          color={armColors[stats.bestArm]}
        />
        <StatBox label="Cumulative Reward" value={String(stats.totalWins)} color={colors.emerald} />
        <StatBox label="Total Regret" value={stats.totalRegret.toFixed(1)} color={colors.red} />
        <StatBox
          label="Exploration %"
          value={stats.explorationPct.toFixed(1) + '%'}
          color={colors.amber}
        />
      </div>

      {/* Sliders */}
      <Sl
        label="Number of Arms"
        value={nArms}
        min={2}
        max={5}
        step={1}
        onChange={(v: number) => set('nArms', v)}
        color={colors.indigo}
      />
      <Sl
        label="Epsilon (\u03B5)"
        value={epsilon}
        min={1}
        max={50}
        step={1}
        onChange={(v: number) => set('epsilon', v)}
        fmt={(v: number) => Math.round(v) + '%'}
        color={colors.emerald}
      />
      <Sl
        label="Simulation Speed"
        value={speed}
        min={10}
        max={100}
        step={10}
        onChange={(v: number) => set('speed', v)}
        color={colors.amber}
      />

      <QA
        items={[
          {
            q: 'Should I use bandits instead of A/B tests?',
            a: 'It depends. Bandits minimize regret during the experiment by exploiting early winners, but they make it harder to measure the true effect size precisely. Use bandits when the cost of showing a losing variant is high and you care more about cumulative reward than statistical confidence. Use A/B tests when you need precise lift estimates for long-term decisions.',
          },
          {
            q: "What's the difference between Thompson Sampling, Epsilon-Greedy, and UCB1?",
            a: 'Thompson Sampling draws from each arm\u2019s posterior and picks the highest \u2014 it naturally balances exploration and exploitation. Epsilon-Greedy explores randomly with probability \u03B5 and exploits otherwise \u2014 simple but wastes exploration on bad arms. UCB1 picks the arm with the highest upper confidence bound \u2014 it\u2019s optimistic and guarantees logarithmic regret.',
          },
        ]}
      />
      <TechNote>
        Thompson Sampling with Beta-Bernoulli arms achieves asymptotically optimal regret of O(log
        T). UCB1 achieves O(&radic;(KT log T)) worst-case regret where K is the number of arms.
        Epsilon-greedy with fixed &epsilon; achieves linear regret &mdash; to fix this, use decaying
        &epsilon; &prop; 1/t. The Bayesian approach (Thompson) tends to outperform in practice.
      </TechNote>
      <Insight>
        Watch how Thompson Sampling quickly concentrates on the best arm while UCB1 methodically
        tries each arm in turn. The regret curve reveals the exploration cost: steep early
        (learning) then flat (exploiting). Epsilon-greedy&apos;s regret never fully flattens because
        it keeps exploring at rate &epsilon;.
      </Insight>
    </div>
  );
}
