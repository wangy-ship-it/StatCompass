import { useState, useMemo, useCallback } from 'react';
import { sR, polyFit, polyEval } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const paramDefaults = { degree: 3, noise: 0.3, showTrue: true };

export default function M27BiasVariance() {
  const [p, set] = useAnimatedParams(paramDefaults);
  const { degree, noise, showTrue } = p;
  const setDegree = (v: number) => set('degree', v);
  const setNoise = (v: number) => set('noise', v);
  const setShowTrue = (v: boolean) => set('showTrue', v);
  const [seed, setSeed] = useState(1);

  const data = useMemo(() => {
    const nTrain = 30,
      nTest = 50;
    const trueFn = (x: number) => Math.sin(x * 2);

    const trainX: number[] = [],
      trainY: number[] = [];
    for (let i = 0; i < nTrain; i++) {
      const x = (sR(i * 17 + seed * 31) * 2 - 1) * Math.PI;
      const y = trueFn(x) + (sR(i * 43 + seed * 67) - 0.5) * 2 * noise;
      trainX.push(x);
      trainY.push(y);
    }

    const testX: number[] = [],
      testY: number[] = [];
    for (let i = 0; i < nTest; i++) {
      const x = (sR(i * 23 + seed * 89 + 1000) * 2 - 1) * Math.PI;
      const y = trueFn(x) + (sR(i * 53 + seed * 97 + 2000) - 0.5) * 2 * noise;
      testX.push(x);
      testY.push(y);
    }

    const coeffs = polyFit(trainX, trainY, Math.round(degree));

    let trainErr = 0,
      testErr = 0;
    for (let i = 0; i < nTrain; i++) {
      const pred = polyEval(coeffs, trainX[i]);
      trainErr += (pred - trainY[i]) ** 2;
    }
    trainErr /= nTrain;
    for (let i = 0; i < nTest; i++) {
      const pred = polyEval(coeffs, testX[i]);
      testErr += (pred - testY[i]) ** 2;
    }
    testErr /= nTest;

    // Error curves across degrees
    const errCurves: { d: number; train: number; test: number }[] = [];
    for (let d = 1; d <= 15; d++) {
      const c = polyFit(trainX, trainY, d);
      let te = 0,
        tse = 0;
      for (let i = 0; i < nTrain; i++) te += (polyEval(c, trainX[i]) - trainY[i]) ** 2;
      for (let i = 0; i < nTest; i++) tse += (polyEval(c, testX[i]) - testY[i]) ** 2;
      errCurves.push({ d, train: te / nTrain, test: Math.min(tse / nTest, 5) });
    }

    return { trainX, trainY, testX, testY, coeffs, trainErr, testErr, trueFn, errCurves };
  }, [degree, noise, seed]);

  // Chart 1: Fit visualization
  const W = 600,
    H1 = 220,
    pl = 36,
    pr = 20,
    pt = 16,
    pb = 28;
  const xMin = -Math.PI,
    xMax = Math.PI;
  const yMin = -2,
    yMax = 2;
  const toX = (v: number) => pl + ((v - xMin) / (xMax - xMin)) * (W - pl - pr);
  const toY = (v: number) => H1 - pb - ((v - yMin) / (yMax - yMin)) * (H1 - pt - pb);

  let truePath = '',
    fitPath = '';
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    const yt = data.trueFn(x);
    const yf = Math.max(yMin, Math.min(yMax, polyEval(data.coeffs, x)));
    truePath += (i === 0 ? 'M' : 'L') + toX(x) + ',' + toY(yt);
    fitPath += (i === 0 ? 'M' : 'L') + toX(x) + ',' + toY(yf);
  }

  // Chart 2: Error curves
  const H2 = 180;
  const maxErr = Math.max(...data.errCurves.map((e) => Math.max(e.train, e.test)), 0.5);
  const eToX = (d: number) => pl + ((d - 1) / 14) * (W - pl - pr);
  const eToY = (v: number) => H2 - pb - (v / maxErr) * (H2 - pt - pb);
  let trainErrPath = '',
    testErrPath = '';
  data.errCurves.forEach((e, i) => {
    trainErrPath += (i === 0 ? 'M' : 'L') + eToX(e.d) + ',' + eToY(e.train);
    testErrPath += (i === 0 ? 'M' : 'L') + eToX(e.d) + ',' + eToY(e.test);
  });

  const fitTooltipLookup = useCallback(
    (vbX: number, _vbY: number) => {
      const W2 = 600,
        pl2 = 36,
        pr2 = 20,
        pt2 = 16,
        pb2 = 28,
        H2 = 220;
      if (vbX < pl2 || vbX > W2 - pr2) return null;
      const xVal = -Math.PI + ((vbX - pl2) / (W2 - pl2 - pr2)) * (2 * Math.PI);
      const yTrue = Math.sin(xVal * 2);
      const yFit = Math.max(-2, Math.min(2, polyEval(data.coeffs, xVal)));
      const toX2 = (v: number) => pl2 + ((v - -Math.PI) / (2 * Math.PI)) * (W2 - pl2 - pr2);
      const toY2 = (v: number) => H2 - pb2 - ((v - -2) / 4) * (H2 - pt2 - pb2);
      return {
        x: toX2(xVal),
        y: Math.min(toY2(yTrue), toY2(yFit)),
        lines: [
          { label: 'x', value: xVal.toFixed(2), color: colors.amber },
          { label: 'True', value: yTrue.toFixed(3), color: sv.text },
          { label: 'Model', value: yFit.toFixed(3), color: colors.indigo },
          { label: 'Error', value: Math.abs(yTrue - yFit).toFixed(3), color: colors.red },
        ],
        markers: [
          { y: toY2(Math.max(-2, Math.min(2, yTrue))), color: sv.text },
          { y: toY2(yFit), color: colors.indigo },
        ],
      };
    },
    [data.coeffs],
  );

  const errTooltipLookup = useCallback(
    (vbX: number, _vbY: number) => {
      const W2 = 600,
        pl2 = 36,
        pr2 = 20,
        pt2 = 16,
        pb2 = 28,
        H2 = 180;
      if (vbX < pl2 || vbX > W2 - pr2) return null;
      const dVal = 1 + ((vbX - pl2) / (W2 - pl2 - pr2)) * 14;
      const dIdx = Math.max(0, Math.min(14, Math.round(dVal - 1)));
      const ec = data.errCurves[dIdx];
      if (!ec) return null;
      const maxE = Math.max(...data.errCurves.map((e) => Math.max(e.train, e.test)), 0.5);
      const eToX2 = (d: number) => pl2 + ((d - 1) / 14) * (W2 - pl2 - pr2);
      const eToY2 = (v: number) => H2 - pb2 - (v / maxE) * (H2 - pt2 - pb2);
      return {
        x: eToX2(ec.d),
        y: Math.min(eToY2(ec.train), eToY2(ec.test)),
        lines: [
          { label: 'Degree', value: String(ec.d), color: colors.amber },
          { label: 'Train Error', value: ec.train.toFixed(4), color: colors.indigo },
          { label: 'Test Error', value: ec.test.toFixed(4), color: colors.red },
        ],
        markers: [
          { y: eToY2(ec.train), color: colors.indigo },
          { y: eToY2(ec.test), color: colors.red },
        ],
      };
    },
    [data.errCurves],
  );

  const errRatio = data.trainErr > 0 ? data.testErr / data.trainErr : 1;
  const fitLabel = errRatio > 3 ? 'Overfitting' : data.testErr > 0.5 ? 'Underfitting' : 'Good Fit';
  const fitColor =
    fitLabel === 'Underfitting'
      ? colors.amber
      : fitLabel === 'Good Fit'
        ? colors.emerald
        : colors.red;

  return (
    <div>
      <Hdr sub="Model & Evaluate">Bias-Variance Tradeoff</Hdr>
      <Desc>
        Too simple? Your model misses the pattern (high bias). Too complex? It memorizes noise (high
        variance). Drag the complexity slider to see a model go from underfitting to overfitting —
        and find the sweet spot in between.
      </Desc>

      {/* Chart 1: Scatter + Fit */}
      <ChartBox
        h={H1}
        tooltipLookup={fitTooltipLookup}
        label="Scatter plot showing model predictions with bias and variance, demonstrating the tradeoff between underfitting and overfitting"
      >
        {showTrue && (
          <path d={truePath} fill="none" stroke={sv.text} strokeWidth={1.5} strokeDasharray="6,4" />
        )}
        <path d={fitPath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
        {data.trainX.map((x, i) => (
          <circle
            key={i}
            cx={toX(x)}
            cy={toY(Math.max(yMin, Math.min(yMax, data.trainY[i])))}
            r={3}
            fill={colors.indigo}
            opacity={0.5}
          />
        ))}
        <line x1={pl} y1={toY(0)} x2={W - pr} y2={toY(0)} stroke={sv.axis} strokeWidth={0.5} />
        <line x1={pl} y1={H1 - pb} x2={W - pr} y2={H1 - pb} stroke={sv.axis} />

        <text
          x={W - pr - 4}
          y={pt + 10}
          fill={fitColor}
          fontSize={11}
          textAnchor="end"
          fontWeight="700"
        >
          {fitLabel + ' (degree ' + Math.round(degree) + ')'}
        </text>
        {showTrue && (
          <text x={pl + 4} y={pt + 10} fill={sv.text} fontSize={9}>
            Dashed = true function
          </text>
        )}
      </ChartBox>

      {/* Chart 2: Error curves */}
      <ChartBox
        h={H2}
        tooltipLookup={errTooltipLookup}
        label="Error decomposition showing how total error is composed of bias squared plus variance as model complexity changes"
      >
        <path d={trainErrPath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
        <path d={testErrPath} fill="none" stroke={colors.red} strokeWidth={2.5} />
        <line
          x1={eToX(degree)}
          y1={pt}
          x2={eToX(degree)}
          y2={H2 - pb}
          stroke={sv.text}
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />
        <circle
          cx={eToX(degree)}
          cy={eToY(data.errCurves[Math.max(0, Math.min(14, Math.round(degree) - 1))]?.train || 0)}
          r={4}
          fill={colors.indigo}
        />
        <circle
          cx={eToX(degree)}
          cy={eToY(data.errCurves[Math.max(0, Math.min(14, Math.round(degree) - 1))]?.test || 0)}
          r={4}
          fill={colors.red}
        />

        {/* Labels */}
        <text
          x={W - pr - 4}
          y={pt + 10}
          fill={colors.indigo}
          fontSize={9}
          textAnchor="end"
          fontWeight="600"
        >
          Training Error
        </text>
        <text
          x={W - pr - 4}
          y={pt + 22}
          fill={colors.red}
          fontSize={9}
          textAnchor="end"
          fontWeight="600"
        >
          Test Error
        </text>
        <text x={pl + 4} y={H2 - pb + 14} fill={sv.text} fontSize={9}>
          Underfitting
        </text>
        <text x={W - pr - 4} y={H2 - pb + 14} fill={sv.text} fontSize={9} textAnchor="end">
          Overfitting
        </text>

        <line x1={pl} y1={H2 - pb} x2={W - pr} y2={H2 - pb} stroke={sv.axis} />
        {[1, 3, 5, 7, 9, 11, 13, 15].map((d) => (
          <text
            key={d}
            x={eToX(d)}
            y={H2 - pb + 14}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {d}
          </text>
        ))}
        <text x={W / 2} y={H2 - 2} fill={sv.text} fontSize={9} textAnchor="middle">
          Model Complexity (Polynomial Degree)
        </text>
      </ChartBox>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox label="Training Error" value={data.trainErr.toFixed(3)} color={colors.indigo} />
        <StatBox label="Test Error" value={data.testErr.toFixed(3)} color={colors.red} />
        <StatBox label="Fit Quality" value={fitLabel} color={fitColor} />
        <StatBox label="Degree" value={Math.round(degree)} color={colors.indigo} />
      </div>

      <Sl
        label="Model Complexity (Degree)"
        value={degree}
        min={1}
        max={15}
        step={1}
        onChange={setDegree}
        fmt={(v) => String(Math.round(v))}
        color={colors.indigo}
      />
      <Sl
        label="Noise Level"
        value={noise}
        min={0.05}
        max={1}
        step={0.01}
        onChange={setNoise}
        fmt={(v) => v.toFixed(2)}
        color={sv.textFaint}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <PillBtn on={showTrue} onClick={() => setShowTrue(!showTrue)}>
          {showTrue ? 'Hide True Function' : 'Show True Function'}
        </PillBtn>
        <PillBtn on={false} onClick={() => setSeed((s) => s + 1)}>
          New Data
        </PillBtn>
      </div>

      <QA
        items={[
          {
            q: "My training accuracy is 99% — isn't that great?",
            a: 'Not necessarily. High training accuracy with much lower test accuracy is the hallmark of overfitting. Your model memorized the training data instead of learning the underlying pattern. Always evaluate on held-out test data.',
          },
          {
            q: 'How do I find the right complexity?',
            a: 'Use cross-validation: split your data multiple ways, train and test on each split, and pick the complexity that minimizes average test error. Regularization (L1/L2) is another approach — it penalizes overly complex models automatically.',
          },
        ]}
      />
      <TechNote>
        Total error = Bias² + Variance + Irreducible noise. Bias comes from model simplification
        (underfitting), variance from sensitivity to training data (overfitting). Regularization,
        cross-validation, and ensemble methods all manage this tradeoff.
      </TechNote>
      <Insight>
        The bias-variance tradeoff is why more complex models aren't always better. A simple model
        that generalizes well beats a complex model that memorizes training data. The goal is not to
        fit the training data perfectly — it's to predict new data accurately.
      </Insight>
    </div>
  );
}
