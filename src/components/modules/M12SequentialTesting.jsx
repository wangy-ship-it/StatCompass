import { useState, useMemo } from 'react';
import { sR, nCDF, obfBounds, pocockBounds, alphaSpend } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useModuleParams from '../../hooks/useModuleParams';

const paramDefaults = { maxN: 50000, nLooks: 5, trueEffect: 0.5, method: 'obf' };

export default function M12SequentialTesting() {
  const [p, set] = useModuleParams(paramDefaults);
  const { maxN, nLooks, trueEffect, method } = p;
  const setMaxN = (v) => set('maxN', v);
  const setNLooks = (v) => set('nLooks', v);
  const setTrueEffect = (v) => set('trueEffect', v);
  const setMethod = (v) => set('method', v);
  const [seed, setSeed] = useState(1);

  const data = useMemo(() => {
    // Compute boundaries
    const bounds = method === 'obf'
      ? obfBounds(nLooks, 0.05)
      : pocockBounds(nLooks, 0.05);

    // Generate test statistic path
    const noises = [];
    const zPath = [];
    let cumNoise = 0;
    let stoppedAt = nLooks;
    let crossed = null; // 'upper' | 'lower' | null

    for (let k = 1; k <= nLooks; k++) {
      const noise = (sR(seed * 100 + k * 41) - 0.5) * 1.2;
      noises.push(noise);
      cumNoise += noise;
      const zk = trueEffect * Math.sqrt(k * maxN / (nLooks * 10000)) + cumNoise / Math.sqrt(k);
      zPath.push(zk);

      if (crossed === null) {
        if (zk >= bounds[k - 1]) {
          crossed = 'upper';
          stoppedAt = k;
        } else if (zk <= -bounds[k - 1]) {
          crossed = 'lower';
          stoppedAt = k;
        }
      }
    }

    // Cumulative alpha spent up to current stage
    let cumAlpha = 0;
    for (let k = 1; k <= stoppedAt; k++) {
      cumAlpha = alphaSpend(k, nLooks, 0.05, method === 'obf' ? 'obf' : 'pocock');
    }

    const earlyStop = stoppedAt < nLooks;
    const currentBound = bounds[stoppedAt - 1];

    return { bounds, zPath, stoppedAt, crossed, cumAlpha, earlyStop, currentBound };
  }, [maxN, nLooks, trueEffect, method, seed]);

  // Chart dimensions
  const W = 600, H = 280;
  const pl = 48, pr = 20, pt = 24, pb = 36;
  const cw = W - pl - pr;
  const ch = H - pt - pb;

  // Y-axis range: -4 to 4
  const yMin = -4, yMax = 4;
  const toX = (stage) => pl + ((stage - 1) / (nLooks - 1)) * cw;
  const toY = (z) => pt + ((yMax - z) / (yMax - yMin)) * ch;

  // Build upper boundary stepped path
  const buildBoundaryPath = (bounds, sign) => {
    let d = '';
    for (let k = 0; k < nLooks; k++) {
      const bVal = sign * bounds[k];
      const x0 = k === 0 ? pl : pl + ((k - 0.5) / (nLooks - 1)) * cw;
      const x1 = k === nLooks - 1 ? pl + cw : pl + ((k + 0.5) / (nLooks - 1)) * cw;
      const y = toY(bVal);
      d += (k === 0 ? 'M' : 'L') + x0.toFixed(1) + ',' + y.toFixed(1);
      d += 'L' + x1.toFixed(1) + ',' + y.toFixed(1);
    }
    return d;
  };

  const upperBoundPath = buildBoundaryPath(data.bounds, 1);
  const lowerBoundPath = buildBoundaryPath(data.bounds, -1);

  // Build fill for rejection regions
  const buildUpperFill = () => {
    // Start from top-left, trace upper boundary, then close along top
    let d = '';
    // Top-left corner
    d += 'M' + pl + ',' + pt;
    // Across the top
    d += 'L' + (pl + cw) + ',' + pt;
    // Down to upper boundary at last stage
    const lastBound = data.bounds[nLooks - 1];
    const xLast = nLooks === 1 ? pl : pl + cw;
    d += 'L' + xLast + ',' + toY(lastBound).toFixed(1);
    // Trace upper boundary path backwards
    for (let k = nLooks - 1; k >= 0; k--) {
      const bVal = data.bounds[k];
      const x1 = k === nLooks - 1 ? pl + cw : pl + ((k + 0.5) / (nLooks - 1)) * cw;
      const x0 = k === 0 ? pl : pl + ((k - 0.5) / (nLooks - 1)) * cw;
      const y = toY(bVal);
      d += 'L' + x1.toFixed(1) + ',' + y.toFixed(1);
      d += 'L' + x0.toFixed(1) + ',' + y.toFixed(1);
    }
    d += 'Z';
    return d;
  };

  const buildLowerFill = () => {
    let d = '';
    // Bottom-left corner
    d += 'M' + pl + ',' + (pt + ch);
    // Across bottom
    d += 'L' + (pl + cw) + ',' + (pt + ch);
    // Up to lower boundary at last stage
    const lastBound = -data.bounds[nLooks - 1];
    const xLast = nLooks === 1 ? pl : pl + cw;
    d += 'L' + xLast + ',' + toY(lastBound).toFixed(1);
    // Trace lower boundary backwards
    for (let k = nLooks - 1; k >= 0; k--) {
      const bVal = -data.bounds[k];
      const x1 = k === nLooks - 1 ? pl + cw : pl + ((k + 0.5) / (nLooks - 1)) * cw;
      const x0 = k === 0 ? pl : pl + ((k - 0.5) / (nLooks - 1)) * cw;
      const y = toY(bVal);
      d += 'L' + x1.toFixed(1) + ',' + y.toFixed(1);
      d += 'L' + x0.toFixed(1) + ',' + y.toFixed(1);
    }
    d += 'Z';
    return d;
  };

  // Build test statistic path (up to stoppedAt)
  const buildZPath = () => {
    let d = '';
    for (let k = 0; k < data.stoppedAt; k++) {
      const x = nLooks === 1 ? pl : toX(k + 1);
      const y = toY(data.zPath[k]);
      d += (k === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    return d;
  };

  // Crossing point coordinates
  const crossX = data.crossed ? (nLooks === 1 ? pl : toX(data.stoppedAt)) : null;
  const crossY = data.crossed ? toY(data.zPath[data.stoppedAt - 1]) : null;
  const crossColor = data.crossed === 'upper' ? colors.emerald : data.crossed === 'lower' ? colors.red : null;

  // Y-axis ticks
  const yTicks = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

  // Format maxN as compact string
  const fmtN = (v) => (v >= 1000 ? (v / 1000) + 'K' : v);

  return (
    <div>
      <Hdr sub="Validate & Run">Sequential Testing</Hdr>
      <Desc>
        Sequential testing lets you peek at results before collecting all the data — but only if you
        pre-commit to a monitoring plan. Spending functions define how much alpha (false positive risk)
        you burn at each interim look. Cross a boundary early and you can stop the experiment with a
        valid conclusion.
      </Desc>

      <ChartBox h={H} label="Sequential testing chart showing test statistic path, decision boundaries, and rejection regions across interim analysis stages">
        {/* Rejection region fills */}
        <path d={buildUpperFill()} fill={sv.fillRed} />
        <path d={buildLowerFill()} fill={sv.fillRed} />

        {/* Grid lines */}
        {yTicks.map((t) => (
          <line
            key={'grid-' + t}
            x1={pl}
            y1={toY(t)}
            x2={pl + cw}
            y2={toY(t)}
            stroke={sv.axis}
            strokeWidth={t === 0 ? 1 : 0.5}
            strokeDasharray={t === 0 ? 'none' : '4,4'}
            opacity={t === 0 ? 0.6 : 0.3}
          />
        ))}

        {/* Upper boundary (stepped) */}
        <path d={upperBoundPath} fill="none" stroke={sv.text} strokeWidth={2} />
        {/* Lower boundary (stepped, mirrored) */}
        <path d={lowerBoundPath} fill="none" stroke={sv.text} strokeWidth={2} />

        {/* Test statistic path */}
        <path d={buildZPath()} fill="none" stroke={colors.indigo} strokeWidth={2.5} strokeLinejoin="round" />

        {/* Stage dots on path */}
        {data.zPath.slice(0, data.stoppedAt).map((z, k) => {
          const isCross = data.crossed && k === data.stoppedAt - 1;
          if (isCross) return null; // drawn separately
          return (
            <circle
              key={'dot-' + k}
              cx={nLooks === 1 ? pl : toX(k + 1)}
              cy={toY(z)}
              r={3.5}
              fill={colors.indigo}
            />
          );
        })}

        {/* Crossing point */}
        {data.crossed && (
          <circle
            cx={crossX}
            cy={crossY}
            r={7}
            fill={crossColor}
            stroke={crossColor}
            strokeWidth={2}
            opacity={0.9}
          />
        )}

        {/* Y-axis labels */}
        {yTicks.map((t) => (
          <text
            key={'ytick-' + t}
            x={pl - 6}
            y={toY(t) + 3.5}
            fill={sv.text}
            fontSize={9}
            textAnchor="end"
          >
            {t}
          </text>
        ))}

        {/* X-axis labels (stage numbers) */}
        {Array.from({ length: nLooks }, (_, k) => (
          <text
            key={'xtick-' + k}
            x={nLooks === 1 ? pl : toX(k + 1)}
            y={H - pb + 14}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {k + 1}
          </text>
        ))}

        {/* Axis lines */}
        <line x1={pl} y1={pt} x2={pl} y2={pt + ch} stroke={sv.axis} />
        <line x1={pl} y1={pt + ch} x2={pl + cw} y2={pt + ch} stroke={sv.axis} />

        {/* Axis titles */}
        <text x={pl + cw / 2} y={H - 2} fill={sv.text} fontSize={9} textAnchor="middle">
          Analysis Stage
        </text>
        <text
          x={12}
          y={pt + ch / 2}
          fill={sv.text}
          fontSize={9}
          textAnchor="middle"
          transform={'rotate(-90,' + 12 + ',' + (pt + ch / 2) + ')'}
        >
          Z-score
        </text>

        {/* Boundary labels */}
        <text x={pl + cw + 2} y={toY(data.bounds[nLooks - 1]) + 3} fill={sv.text} fontSize={8}>
          +z
        </text>
        <text x={pl + cw + 2} y={toY(-data.bounds[nLooks - 1]) + 3} fill={sv.text} fontSize={8}>
          -z
        </text>

        {/* Legend */}
        <line x1={pl + 8} y1={pt + 4} x2={pl + 22} y2={pt + 4} stroke={sv.text} strokeWidth={2} />
        <text x={pl + 26} y={pt + 7} fill={sv.text} fontSize={8}>Boundary</text>
        <line x1={pl + 80} y1={pt + 4} x2={pl + 94} y2={pt + 4} stroke={colors.indigo} strokeWidth={2.5} />
        <text x={pl + 98} y={pt + 7} fill={colors.indigo} fontSize={8}>Test Stat</text>
      </ChartBox>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="Current Stage"
          value={data.stoppedAt + ' / ' + nLooks}
          color={colors.indigo}
        />
        <StatBox
          label="Cumulative Alpha"
          value={data.cumAlpha.toFixed(4)}
          color={colors.amber}
        />
        <StatBox
          label="Boundary at Stage"
          value={data.currentBound.toFixed(3)}
          color={sv.text}
        />
        <StatBox
          label="Early Stop"
          value={data.earlyStop ? 'Yes' : 'No'}
          color={data.earlyStop ? colors.emerald : sv.text}
        />
      </div>

      <Sl
        label="Max Sample Size"
        value={maxN}
        min={5000}
        max={100000}
        step={5000}
        onChange={setMaxN}
        fmt={fmtN}
        color={colors.indigo}
      />
      <Sl
        label="Number of Interim Looks"
        value={nLooks}
        min={2}
        max={10}
        step={1}
        onChange={setNLooks}
        color={colors.emerald}
      />
      <Sl
        label="True Effect Size"
        value={trueEffect}
        min={0}
        max={1.5}
        step={0.1}
        onChange={setTrueEffect}
        fmt={(v) => v.toFixed(1)}
        color={colors.amber}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <PillBtn on={method === 'obf'} onClick={() => setMethod('obf')}>O'Brien-Fleming</PillBtn>
        <PillBtn on={method === 'pocock'} onClick={() => setMethod('pocock')}>Pocock</PillBtn>
        <PillBtn on={false} onClick={() => setSeed((s) => s + 1)}>Simulate</PillBtn>
      </div>

      <QA
        items={[
          {
            q: 'Can I just peek at my experiment whenever I want?',
            a: 'No. Every peek inflates your false positive rate. If you check 5 times at the 5% level without adjustment, your true error rate can reach 14% or more. Sequential testing lets you peek at pre-planned intervals while controlling the overall error rate by using tighter boundaries at each look.',
          },
          {
            q: "What is the difference between O'Brien-Fleming and Pocock?",
            a: "O'Brien-Fleming sets very strict boundaries early on (making it hard to stop at the first look) and relaxes them toward the end, so the final-look boundary is close to a standard z-test. Pocock uses constant boundaries at every look, spending alpha more uniformly. OBF preserves more power at the final analysis; Pocock gives a better chance of stopping early if the effect is large.",
          },
          {
            q: 'What happens if I never cross a boundary?',
            a: 'You reach the final planned look and make a standard decision at that stage using the final-stage boundary. You have used your full alpha budget and the test concludes normally — no early stopping, but still a valid analysis.',
          },
        ]}
      />
      <TechNote>
        Spending functions allocate the total type-I error rate across interim analyses. O'Brien-Fleming
        spending: alpha_k = 2 * (1 - Phi(z_alpha / sqrt(t_k))), where t_k = k / K. Pocock spending:
        alpha_k = alpha * t_k (linear). The boundary at each stage is derived by inverting the spending
        function to find the critical z-value that consumes exactly the incremental alpha allocated to
        that look.
      </TechNote>
      <Insight>
        O'Brien-Fleming boundaries are very conservative early on — making it hard to stop at the first
        or second look unless the effect is enormous. But they preserve almost all your alpha for the
        final analysis, so you lose very little power compared to a fixed-sample test. Pocock boundaries
        are constant and spend more alpha upfront, giving you a realistic chance to stop early but at the
        cost of a slightly higher final-stage boundary. Most industry sequential tests use O'Brien-Fleming
        or similar spending functions because the power loss is negligible.
      </Insight>
    </div>
  );
}
