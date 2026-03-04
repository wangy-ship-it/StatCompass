import { useState, useMemo, useCallback } from 'react';
import { betaPDF, betaQuantile, probBBeatsA, expectedLossOfB } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import {
  Hdr,
  Desc,
  ChartBox,
  Sl,
  PillBtn,
  StatBox,
  SimControls,
  QA,
  TechNote,
  Insight,
} from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';
import useBayesianSim from '../../hooks/useBayesianSim';

const priors: Record<string, { label: string; a: number; b: number }> = {
  uninformative: { label: 'Uninformative', a: 1, b: 1 },
  weak: { label: 'Weak', a: 5, b: 45 },
  strong: { label: 'Strong', a: 20, b: 180 },
};

const defaults = {
  priorKey: 'uninformative',
  nControl: 500,
  nTreat: 500,
  convControl: 50,
  convTreat: 65,
  trueRateA: 0.1,
  trueRateB: 0.12,
  speed: 50,
};

export default function M30BayesianABTesting() {
  const [p, set] = useAnimatedParams(defaults);
  const { priorKey, nControl, nTreat, convControl, convTreat, trueRateA, trueRateB, speed } = p;
  const setPriorKey = (v: string) => set('priorKey', v);
  const setNControl = (v: number) => set('nControl', v);
  const setNTreat = (v: number) => set('nTreat', v);
  const setConvControl = (v: number) => set('convControl', v);
  const setConvTreat = (v: number) => set('convTreat', v);
  const setTrueRateA = (v: number) => set('trueRateA', v);
  const setTrueRateB = (v: number) => set('trueRateB', v);
  const setSpeed = (v: number) => set('speed', v);
  const [simMode, setSimMode] = useState(false);

  const prior = priors[priorKey as string] || priors.uninformative;

  // Simulation hook
  const sim = useBayesianSim(trueRateA, trueRateB, prior.a, prior.b, speed);

  // Compute chart data from either sim state or slider values
  const data = useMemo(() => {
    let ctrlA: number, ctrlB: number, treatA: number, treatB: number;
    let nC: number, nT: number, cC: number, cT: number;

    if (simMode) {
      const s = sim.state;
      ctrlA = s.postAlphaA;
      ctrlB = s.postBetaA;
      treatA = s.postAlphaB;
      treatB = s.postBetaB;
      nC = s.visitorsA;
      nT = s.visitorsB;
      cC = s.conversionsA;
      cT = s.conversionsB;
    } else {
      nC = Math.round(nControl);
      nT = Math.round(nTreat);
      cC = Math.min(Math.round(convControl), nC);
      cT = Math.min(Math.round(convTreat), nT);
      ctrlA = prior.a + cC;
      ctrlB = prior.b + nC - cC;
      treatA = prior.a + cT;
      treatB = prior.b + nT - cT;
    }

    const ctrlMean = ctrlA / (ctrlA + ctrlB);
    const treatMean = treatA / (treatA + treatB);
    const ctrlCI = [betaQuantile(0.025, ctrlA, ctrlB), betaQuantile(0.975, ctrlA, ctrlB)];
    const treatCI = [betaQuantile(0.025, treatA, treatB), betaQuantile(0.975, treatA, treatB)];

    const pBbeatsA = simMode ? sim.state.pBbeatsA : probBBeatsA(ctrlA, ctrlB, treatA, treatB);
    const expLossB = simMode
      ? sim.state.expectedLoss
      : expectedLossOfB(ctrlA, ctrlB, treatA, treatB);
    const expLossA = expectedLossOfB(treatA, treatB, ctrlA, ctrlB);

    const lossThreshold = 0.0005;
    let decision: string;
    if (expLossB < lossThreshold && pBbeatsA > 0.5) decision = 'Ship B';
    else if (expLossA < lossThreshold && pBbeatsA < 0.5) decision = 'Ship A';
    else decision = 'Continue';

    // Build PDF curves for Chart 1
    const xMax1 = Math.min(1, Math.max(ctrlMean, treatMean) * 2.5 + 0.02);
    const xMin1 = Math.max(0, Math.min(ctrlMean, treatMean) * 0.3 - 0.01);

    const W1 = 600,
      H1 = 220,
      pl1 = 36,
      pr1 = 36,
      pt1 = 20,
      pb1 = 34;
    const steps1 = 300;
    let maxY1 = 0;
    const pts1: { x: number; yCtrl: number; yTreat: number }[] = [];
    for (let i = 0; i <= steps1; i++) {
      const x = xMin1 + (i / steps1) * (xMax1 - xMin1);
      const yCtrl = betaPDF(x, ctrlA, ctrlB);
      const yTreat = betaPDF(x, treatA, treatB);
      maxY1 = Math.max(maxY1, yCtrl, yTreat);
      pts1.push({ x, yCtrl, yTreat });
    }
    const toX1 = (v: number) => pl1 + ((v - xMin1) / (xMax1 - xMin1)) * (W1 - pl1 - pr1);
    const toY1 = (v: number) => H1 - pb1 - (v / (maxY1 || 1)) * (H1 - pt1 - pb1);

    let ctrlPath = '',
      ctrlArea = '',
      treatPath = '',
      treatArea = '';
    pts1.forEach((pt, i) => {
      const sx = toX1(pt.x);
      ctrlPath += (i === 0 ? 'M' : 'L') + sx + ',' + toY1(pt.yCtrl);
      treatPath += (i === 0 ? 'M' : 'L') + sx + ',' + toY1(pt.yTreat);
      if (i === 0) {
        ctrlArea = 'M' + sx + ',' + toY1(0);
        treatArea = 'M' + sx + ',' + toY1(0);
      }
      ctrlArea += 'L' + sx + ',' + toY1(pt.yCtrl);
      treatArea += 'L' + sx + ',' + toY1(pt.yTreat);
    });
    ctrlArea += 'L' + toX1(xMax1) + ',' + toY1(0) + 'Z';
    treatArea += 'L' + toX1(xMax1) + ',' + toY1(0) + 'Z';

    const tickStep1 = Math.max(0.01, Math.round(((xMax1 - xMin1) / 6) * 100) / 100);
    const ticks1: number[] = [];
    for (let v = Math.ceil(xMin1 / tickStep1) * tickStep1; v <= xMax1; v += tickStep1) {
      ticks1.push(Math.round(v * 1000) / 1000);
    }

    // Chart 2: Posterior Difference Distribution
    const W2 = 600,
      H2 = 180,
      pl2 = 36,
      pr2 = 36,
      pt2 = 20,
      pb2 = 34;
    const diffSteps = 200;
    const diffMin = -0.15;
    const diffMax = 0.15;
    const diffDx = (diffMax - diffMin) / diffSteps;
    const gridSteps = 150;
    const gridDx = 1 / gridSteps;
    const diffPts: { d: number; density: number }[] = [];
    let maxDiffY = 0;
    for (let i = 0; i <= diffSteps; i++) {
      const diff = diffMin + (i / diffSteps) * (diffMax - diffMin);
      let density = 0;
      for (let j = 0; j < gridSteps; j++) {
        const xa = (j + 0.5) * gridDx;
        const xb = xa + diff;
        if (xb > 0 && xb < 1) {
          density += betaPDF(xa, ctrlA, ctrlB) * betaPDF(xb, treatA, treatB) * gridDx;
        }
      }
      maxDiffY = Math.max(maxDiffY, density);
      diffPts.push({ d: diff, density });
    }
    const toX2 = (v: number) => pl2 + ((v - diffMin) / (diffMax - diffMin)) * (W2 - pl2 - pr2);
    const toY2 = (v: number) => H2 - pb2 - (v / (maxDiffY || 1)) * (H2 - pt2 - pb2);

    let posArea = '',
      negArea = '',
      diffLine = '';
    const posPts: { sx: number; sy: number }[] = [];
    const negPts: { sx: number; sy: number }[] = [];
    diffPts.forEach((pt, i) => {
      const sx = toX2(pt.d);
      const sy = toY2(pt.density);
      diffLine += (i === 0 ? 'M' : 'L') + sx + ',' + sy;
      if (pt.d >= 0) posPts.push({ sx, sy });
      if (pt.d <= 0) negPts.push({ sx, sy });
    });

    if (posPts.length > 1) {
      posArea = 'M' + toX2(0) + ',' + toY2(0);
      posPts.forEach((pt) => (posArea += 'L' + pt.sx + ',' + pt.sy));
      posArea += 'L' + posPts[posPts.length - 1].sx + ',' + toY2(0) + 'Z';
    }
    if (negPts.length > 1) {
      negArea = 'M' + negPts[0].sx + ',' + toY2(0);
      negPts.forEach((pt) => (negArea += 'L' + pt.sx + ',' + pt.sy));
      negArea += 'L' + toX2(0) + ',' + toY2(0) + 'Z';
    }

    const diffMean = treatMean - ctrlMean;
    let cumSum = 0;
    let diffCILo = diffMin,
      diffCIHi = diffMax;
    const totalArea = diffPts.reduce((s, pt) => s + pt.density * diffDx, 0);
    for (let i = 0; i < diffPts.length; i++) {
      cumSum += (diffPts[i].density * diffDx) / totalArea;
      if (cumSum >= 0.025 && diffCILo === diffMin) diffCILo = diffPts[i].d;
      if (cumSum >= 0.975 && diffCIHi === diffMax) {
        diffCIHi = diffPts[i].d;
        break;
      }
    }

    return {
      prior,
      ctrlA,
      ctrlB,
      treatA,
      treatB,
      ctrlMean,
      treatMean,
      ctrlCI,
      treatCI,
      pBbeatsA,
      expLossB,
      expLossA,
      lossThreshold,
      decision,
      W1,
      H1,
      pl1,
      pr1,
      pt1,
      pb1,
      xMin1,
      xMax1,
      maxY1,
      ctrlPath,
      ctrlArea,
      treatPath,
      treatArea,
      ticks1,
      W2,
      H2,
      pl2,
      pr2,
      pt2,
      pb2,
      diffMin,
      diffMax,
      maxDiffY,
      posArea,
      negArea,
      diffLine,
      diffMean,
      diffCILo,
      diffCIHi,
      toX1,
      toY1,
      toX2,
      toY2,
      nC,
      nT,
      cC,
      cT,
    };
  }, [simMode, sim.state, nControl, nTreat, convControl, convTreat, prior]);

  const tooltipLookup1 = useCallback(
    (vbX: number) => {
      const { pl1, pr1, pt1, pb1, W1, H1, xMin1, xMax1, maxY1, ctrlA, ctrlB, treatA, treatB } =
        data;
      if (vbX < pl1 || vbX > W1 - pr1) return null;
      const xVal = xMin1 + ((vbX - pl1) / (W1 - pl1 - pr1)) * (xMax1 - xMin1);
      const yCtrl = betaPDF(xVal, ctrlA, ctrlB);
      const yTreat = betaPDF(xVal, treatA, treatB);
      const tX = (v: number) => pl1 + ((v - xMin1) / (xMax1 - xMin1)) * (W1 - pl1 - pr1);
      const tY = (v: number) => H1 - pb1 - (v / (maxY1 || 1)) * (H1 - pt1 - pb1);
      return {
        x: tX(xVal),
        y: Math.min(tY(yCtrl), tY(yTreat)),
        lines: [
          { label: 'Control', value: xVal.toFixed(4), color: colors.indigo },
          { label: 'Treatment', value: xVal.toFixed(4), color: colors.emerald },
        ],
        markers: [
          { y: tY(yCtrl), color: colors.indigo },
          { y: tY(yTreat), color: colors.emerald },
        ],
      };
    },
    [data],
  );

  const tooltipLookup2 = useCallback(
    (vbX: number) => {
      const {
        pl2,
        pr2,
        pt2,
        pb2,
        W2,
        H2,
        diffMin,
        diffMax,
        maxDiffY,
        ctrlA,
        ctrlB,
        treatA,
        treatB,
      } = data;
      if (vbX < pl2 || vbX > W2 - pr2) return null;
      const dVal = diffMin + ((vbX - pl2) / (W2 - pl2 - pr2)) * (diffMax - diffMin);
      const gridSteps2 = 100;
      const gridDx2 = 1 / gridSteps2;
      let density = 0;
      for (let j = 0; j < gridSteps2; j++) {
        const xa = (j + 0.5) * gridDx2;
        const xb = xa + dVal;
        if (xb > 0 && xb < 1) {
          density += betaPDF(xa, ctrlA, ctrlB) * betaPDF(xb, treatA, treatB) * gridDx2;
        }
      }
      const tX = (v: number) => pl2 + ((v - diffMin) / (diffMax - diffMin)) * (W2 - pl2 - pr2);
      const tY = (v: number) => H2 - pb2 - (v / (maxDiffY || 1)) * (H2 - pt2 - pb2);
      return {
        x: tX(dVal),
        y: tY(density),
        lines: [
          {
            label: 'Diff (B-A)',
            value: (dVal * 100).toFixed(2) + ' pp',
            color: dVal >= 0 ? colors.emerald : colors.red,
          },
        ],
        markers: [{ y: tY(density), color: dVal >= 0 ? colors.emerald : colors.red }],
      };
    },
    [data],
  );

  const nC = Math.round(nControl);
  const nT = Math.round(nTreat);

  return (
    <div>
      <Hdr sub="Analyze">Bayesian A/B Testing</Hdr>
      <Desc>
        Traditional frequentist tests answer &ldquo;is this result unlikely under the null?&rdquo;
        Bayesian A/B testing directly answers what practitioners actually want: &ldquo;what is the
        probability that B is better than A, and by how much?&rdquo; Watch the posterior
        distributions update as you adjust conversion data.
      </Desc>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <PillBtn on={!simMode} onClick={() => setSimMode(false)}>
          Explore
        </PillBtn>
        <PillBtn on={simMode} onClick={() => setSimMode(true)}>
          Simulate
        </PillBtn>
      </div>

      {/* Sim controls */}
      {simMode && (
        <SimControls
          running={sim.state.running}
          onPlay={sim.start}
          onPause={sim.pause}
          onStep={sim.stepOnce}
          onReset={sim.reset}
          progress={
            sim.state.visitorsA +
            sim.state.visitorsB +
            ' visitors | ' +
            'P(B>A) = ' +
            (sim.state.pBbeatsA * 100).toFixed(1) +
            '%'
          }
        />
      )}

      {/* Chart 1: Posterior Distributions */}
      <ChartBox
        h={data.H1}
        label="Posterior distributions for control and treatment"
        tooltipLookup={tooltipLookup1}
      >
        <defs>
          <linearGradient id="grad-ctrl-30" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="grad-treat-30" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path d={data.ctrlArea} fill="url(#grad-ctrl-30)" />
        <path d={data.treatArea} fill="url(#grad-treat-30)" />
        <path d={data.ctrlPath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
        <path d={data.treatPath} fill="none" stroke={colors.emerald} strokeWidth={2.5} />
        <line
          x1={data.toX1(data.ctrlMean)}
          y1={data.pt1}
          x2={data.toX1(data.ctrlMean)}
          y2={data.H1 - data.pb1}
          stroke={colors.indigo}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
        <line
          x1={data.toX1(data.treatMean)}
          y1={data.pt1}
          x2={data.toX1(data.treatMean)}
          y2={data.H1 - data.pb1}
          stroke={colors.emerald}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
        <line
          x1={data.pl1}
          y1={data.H1 - data.pb1}
          x2={data.W1 - data.pr1}
          y2={data.H1 - data.pb1}
          stroke={sv.axis}
        />
        {data.ticks1.map((v) => (
          <text
            key={v}
            x={data.toX1(v)}
            y={data.H1 - data.pb1 + 14}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {v.toFixed(2)}
          </text>
        ))}
        <text x={data.pl1 + 4} y={data.pt1 - 4} fill={colors.indigo} fontSize={9} fontWeight="600">
          Control
        </text>
        <text
          x={data.W1 - data.pr1 - 4}
          y={data.pt1 - 4}
          fill={colors.emerald}
          fontSize={9}
          textAnchor="end"
          fontWeight="600"
        >
          Treatment
        </text>
      </ChartBox>

      {/* Chart 2: Posterior Difference Distribution */}
      <ChartBox
        h={data.H2}
        label="Posterior difference distribution (B minus A)"
        tooltipLookup={tooltipLookup2}
      >
        <defs>
          <linearGradient id="grad-pos-30" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="grad-neg-30" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.red} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colors.red} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {data.posArea && <path d={data.posArea} fill="url(#grad-pos-30)" />}
        {data.negArea && <path d={data.negArea} fill="url(#grad-neg-30)" />}
        <path d={data.diffLine} fill="none" stroke={sv.text} strokeWidth={2} />
        <line
          x1={data.toX2(0)}
          y1={data.pt2}
          x2={data.toX2(0)}
          y2={data.H2 - data.pb2}
          stroke={sv.axis}
          strokeWidth={1}
          strokeDasharray="4,3"
        />
        <line
          x1={data.toX2(data.diffCILo)}
          y1={data.H2 - data.pb2 - 12}
          x2={data.toX2(data.diffCIHi)}
          y2={data.H2 - data.pb2 - 12}
          stroke={colors.emerald}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.6}
        />
        <circle
          cx={data.toX2(data.diffMean)}
          cy={data.H2 - data.pb2 - 12}
          r={3}
          fill={colors.emerald}
        />
        <line
          x1={data.pl2}
          y1={data.H2 - data.pb2}
          x2={data.W2 - data.pr2}
          y2={data.H2 - data.pb2}
          stroke={sv.axis}
        />
        {[-0.1, -0.05, 0, 0.05, 0.1].map((v) => (
          <text
            key={v}
            x={data.toX2(v)}
            y={data.H2 - data.pb2 + 14}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {(v * 100).toFixed(0) + '%'}
          </text>
        ))}
        <text
          x={data.W2 - data.pr2 - 4}
          y={data.pt2 - 4}
          fill={data.pBbeatsA >= 0.5 ? colors.emerald : colors.red}
          fontSize={9}
          textAnchor="end"
          fontWeight="600"
        >
          {'P(B beats A) = ' + (data.pBbeatsA * 100).toFixed(1) + '%'}
        </text>
        <text x={data.pl2 + 4} y={data.pt2 - 4} fill={sv.text} fontSize={9}>
          95% CI
        </text>
      </ChartBox>

      {/* StatBoxes */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="P(B beats A)"
          value={(data.pBbeatsA * 100).toFixed(1) + '%'}
          color={data.pBbeatsA >= 0.5 ? colors.emerald : colors.red}
        />
        <StatBox
          label="Loss (ship B)"
          value={(data.expLossB * 100).toFixed(3) + '%'}
          color={colors.amber}
        />
        <StatBox
          label="Loss (ship A)"
          value={(data.expLossA * 100).toFixed(3) + '%'}
          color={colors.amber}
        />
        <StatBox
          label="Decision"
          value={data.decision}
          color={
            data.decision === 'Ship B'
              ? colors.emerald
              : data.decision === 'Ship A'
                ? colors.red
                : colors.amber
          }
        />
      </div>

      {/* Decision Rule Visualization */}
      <div className="bg-app-surface rounded-xl p-4 mb-5 ring-1 ring-[var(--color-border-subtle)]">
        <div className="text-[11px] text-[var(--svg-text-faint)] uppercase tracking-widest mb-3 text-center font-semibold">
          Expected Loss Decision Rule
        </div>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-[10px] text-[var(--svg-text-faint)] mb-1">Ship A</div>
            <div
              className="text-lg font-bold"
              style={{
                color:
                  data.expLossA < data.lossThreshold && data.pBbeatsA < 0.5
                    ? colors.emerald
                    : sv.textFaint,
              }}
            >
              {(data.expLossA * 100).toFixed(3) + '%'}
            </div>
            <div className="text-[9px] text-[var(--svg-text-faint)]">
              {data.expLossA < data.lossThreshold ? '< threshold' : '> threshold'}
            </div>
          </div>
          <div className="text-[var(--svg-text-faint)] text-xl font-light">vs</div>
          <div className="text-center">
            <div className="text-[10px] text-[var(--svg-text-faint)] mb-1">Ship B</div>
            <div
              className="text-lg font-bold"
              style={{
                color:
                  data.expLossB < data.lossThreshold && data.pBbeatsA > 0.5
                    ? colors.emerald
                    : sv.textFaint,
              }}
            >
              {(data.expLossB * 100).toFixed(3) + '%'}
            </div>
            <div className="text-[9px] text-[var(--svg-text-faint)]">
              {data.expLossB < data.lossThreshold ? '< threshold' : '> threshold'}
            </div>
          </div>
        </div>
        <div className="text-center mt-2 text-[10px] text-[var(--svg-text-faint)]">
          {'Loss threshold: ' +
            (data.lossThreshold * 100).toFixed(2) +
            '% — ship when expected loss < threshold'}
        </div>
      </div>

      {/* Prior presets */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(priors).map(([key, pr]) => (
          <PillBtn key={key} on={priorKey === key} onClick={() => setPriorKey(key)}>
            {pr.label}
          </PillBtn>
        ))}
      </div>

      {/* Sliders */}
      {simMode ? (
        <>
          <Sl
            label="True Control Rate"
            value={trueRateA}
            min={0.01}
            max={0.5}
            step={0.005}
            onChange={setTrueRateA}
            fmt={(v: number) => (v * 100).toFixed(1) + '%'}
            color={colors.indigo}
          />
          <Sl
            label="True Treatment Rate"
            value={trueRateB}
            min={0.01}
            max={0.5}
            step={0.005}
            onChange={setTrueRateB}
            fmt={(v: number) => (v * 100).toFixed(1) + '%'}
            color={colors.emerald}
          />
          <Sl
            label="Simulation Speed"
            value={speed}
            min={10}
            max={100}
            step={1}
            onChange={setSpeed}
            fmt={(v) => Math.round(v) + '%'}
            color={colors.amber}
          />
        </>
      ) : (
        <>
          <Sl
            label="Control Sample Size"
            value={nControl}
            min={50}
            max={5000}
            step={50}
            onChange={setNControl}
            fmt={(v: number) => String(Math.round(v))}
            color={colors.indigo}
          />
          <Sl
            label="Treatment Sample Size"
            value={nTreat}
            min={50}
            max={5000}
            step={50}
            onChange={setNTreat}
            fmt={(v: number) => String(Math.round(v))}
            color={colors.emerald}
          />
          <Sl
            label="Control Conversions"
            value={convControl}
            min={1}
            max={nC}
            step={1}
            onChange={setConvControl}
            fmt={(v: number) => String(Math.round(v))}
            color={colors.indigo}
          />
          <Sl
            label="Treatment Conversions"
            value={convTreat}
            min={1}
            max={nT}
            step={1}
            onChange={setConvTreat}
            fmt={(v: number) => String(Math.round(v))}
            color={colors.emerald}
          />
        </>
      )}

      <QA
        items={[
          {
            q: 'How is this different from a p-value?',
            a: "A p-value tells you how surprising your data is under the null hypothesis. Bayesian testing tells you the probability that one variant is better and by how much. You get a direct probability statement \u2014 'there is a 94% chance B beats A' \u2014 rather than 'reject H0 at alpha = 0.05'.",
          },
          {
            q: 'When should I use Bayesian over frequentist testing?',
            a: "Bayesian testing shines when you want continuous monitoring without alpha-spending corrections, when you need direct probability statements for stakeholders, or when you have meaningful prior information. It also naturally handles the 'peeking problem' since you are updating beliefs, not running repeated hypothesis tests.",
          },
        ]}
      />
      <TechNote>
        The posterior for each variant follows Beta(&alpha; + successes, &beta; + failures) under a
        Beta prior. P(B &gt; A) is computed by integrating the joint posterior &mdash; for each
        possible value of B&apos;s rate, we multiply by the probability that A&apos;s rate is lower.
        The expected loss measures the cost of choosing the wrong variant.
      </TechNote>
      <Insight>
        Bayesian A/B testing eliminates the need for fixed sample sizes and pre-determined stopping
        rules. You can check results at any time without inflating error rates. The cost is that
        results depend on your prior &mdash; but with sufficient data, even a skeptical prior
        converges to the truth.
      </Insight>
    </div>
  );
}
