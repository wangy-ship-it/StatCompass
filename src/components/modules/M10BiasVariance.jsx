import { useState, useMemo } from 'react';
import { sR, polyFit, polyEval } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';

export default function M10BiasVariance() {
  const [degree, setDegree] = useState(3);
  const [noise, setNoise] = useState(0.3);
  const [seed, setSeed] = useState(1);
  const [showTrue, setShowTrue] = useState(true);

  const data = useMemo(() => {
    const nTrain = 30, nTest = 50;
    const trueFn = (x) => Math.sin(x * 2);

    const trainX = [], trainY = [];
    for (let i = 0; i < nTrain; i++) {
      const x = (sR(i * 17 + seed * 31) * 2 - 1) * Math.PI;
      const y = trueFn(x) + (sR(i * 43 + seed * 67) - 0.5) * 2 * noise;
      trainX.push(x);
      trainY.push(y);
    }

    const testX = [], testY = [];
    for (let i = 0; i < nTest; i++) {
      const x = (sR(i * 23 + seed * 89 + 1000) * 2 - 1) * Math.PI;
      const y = trueFn(x) + (sR(i * 53 + seed * 97 + 2000) - 0.5) * 2 * noise;
      testX.push(x);
      testY.push(y);
    }

    const coeffs = polyFit(trainX, trainY, degree);

    let trainErr = 0, testErr = 0;
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
    const errCurves = [];
    for (let d = 1; d <= 15; d++) {
      const c = polyFit(trainX, trainY, d);
      let te = 0, tse = 0;
      for (let i = 0; i < nTrain; i++) te += (polyEval(c, trainX[i]) - trainY[i]) ** 2;
      for (let i = 0; i < nTest; i++) tse += (polyEval(c, testX[i]) - testY[i]) ** 2;
      errCurves.push({ d, train: te / nTrain, test: Math.min(tse / nTest, 5) });
    }

    return { trainX, trainY, testX, testY, coeffs, trainErr, testErr, trueFn, errCurves };
  }, [degree, noise, seed]);

  // Chart 1: Fit visualization
  const W = 600, H1 = 220, pl = 36, pr = 20, pt = 16, pb = 28;
  const xMin = -Math.PI, xMax = Math.PI;
  const yMin = -2, yMax = 2;
  const toX = (v) => pl + ((v - xMin) / (xMax - xMin)) * (W - pl - pr);
  const toY = (v) => H1 - pb - ((v - yMin) / (yMax - yMin)) * (H1 - pt - pb);

  let truePath = '', fitPath = '';
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
  const eToX = (d) => pl + ((d - 1) / 14) * (W - pl - pr);
  const eToY = (v) => H2 - pb - (v / maxErr) * (H2 - pt - pb);
  let trainErrPath = '', testErrPath = '';
  data.errCurves.forEach((e, i) => {
    trainErrPath += (i === 0 ? 'M' : 'L') + eToX(e.d) + ',' + eToY(e.train);
    testErrPath += (i === 0 ? 'M' : 'L') + eToX(e.d) + ',' + eToY(e.test);
  });

  const fitLabel = degree <= 2 ? 'Underfitting' : degree <= 6 ? 'Good Fit' : 'Overfitting';
  const fitColor = degree <= 2 ? colors.amber : degree <= 6 ? colors.emerald : colors.red;

  return (
    <div>
      <Hdr sub="Model & Evaluate">Bias-Variance Tradeoff</Hdr>
      <Desc>
        Too simple? Your model misses the pattern (high bias). Too complex? It memorizes noise (high
        variance). Drag the complexity slider to see a model go from underfitting to overfitting —
        and find the sweet spot in between.
      </Desc>

      {/* Chart 1: Scatter + Fit */}
      <ChartBox h={H1}>
          {showTrue && <path d={truePath} fill="none" stroke={sv.text} strokeWidth={1.5} strokeDasharray="6,4" />}
          <path d={fitPath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
          {data.trainX.map((x, i) => (
            <circle key={i} cx={toX(x)} cy={toY(Math.max(yMin, Math.min(yMax, data.trainY[i])))} r={3} fill={colors.indigo} opacity={0.5} />
          ))}
          <line x1={pl} y1={toY(0)} x2={W - pr} y2={toY(0)} stroke={sv.axis} strokeWidth={0.5} />
          <line x1={pl} y1={H1 - pb} x2={W - pr} y2={H1 - pb} stroke={sv.axis} />

          <text x={W - pr - 4} y={pt + 10} fill={fitColor} fontSize={11} textAnchor="end" fontWeight="700">
            {fitLabel + ' (degree ' + degree + ')'}
          </text>
          {showTrue && (
            <text x={pl + 4} y={pt + 10} fill={sv.text} fontSize={9}>Dashed = true function</text>
          )}
      </ChartBox>

      {/* Chart 2: Error curves */}
      <ChartBox h={H2}>
          <path d={trainErrPath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
          <path d={testErrPath} fill="none" stroke={colors.red} strokeWidth={2.5} />
          <line x1={eToX(degree)} y1={pt} x2={eToX(degree)} y2={H2 - pb} stroke={sv.text} strokeWidth={1.5} strokeDasharray="4,3" />
          <circle cx={eToX(degree)} cy={eToY(data.errCurves[degree - 1]?.train || 0)} r={4} fill={colors.indigo} />
          <circle cx={eToX(degree)} cy={eToY(data.errCurves[degree - 1]?.test || 0)} r={4} fill={colors.red} />

          {/* Labels */}
          <text x={W - pr - 4} y={pt + 10} fill={colors.indigo} fontSize={9} textAnchor="end" fontWeight="600">Training Error</text>
          <text x={W - pr - 4} y={pt + 22} fill={colors.red} fontSize={9} textAnchor="end" fontWeight="600">Test Error</text>
          <text x={pl + 4} y={H2 - pb + 14} fill={sv.text} fontSize={9}>Underfitting</text>
          <text x={W - pr - 4} y={H2 - pb + 14} fill={sv.text} fontSize={9} textAnchor="end">Overfitting</text>

          <line x1={pl} y1={H2 - pb} x2={W - pr} y2={H2 - pb} stroke={sv.axis} />
          {[1, 3, 5, 7, 9, 11, 13, 15].map((d) => (
            <text key={d} x={eToX(d)} y={H2 - pb + 14} fill={sv.text} fontSize={9} textAnchor="middle">{d}</text>
          ))}
          <text x={W / 2} y={H2 - 2} fill={sv.text} fontSize={9} textAnchor="middle">Model Complexity (Polynomial Degree)</text>
      </ChartBox>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox label="Training Error" value={data.trainErr.toFixed(3)} color={colors.indigo} />
        <StatBox label="Test Error" value={data.testErr.toFixed(3)} color={colors.red} />
        <StatBox label="Fit Quality" value={fitLabel} color={fitColor} />
        <StatBox label="Degree" value={degree} color={colors.indigo} />
      </div>

      <Sl label="Model Complexity (Degree)" value={degree} min={1} max={15} step={1} onChange={setDegree} fmt={(v) => v} color={colors.indigo} />
      <Sl label="Noise Level" value={noise} min={0.05} max={1} step={0.05} onChange={setNoise} fmt={(v) => v.toFixed(2)} color={colors.slate400} />

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
            a: "Not necessarily. High training accuracy with much lower test accuracy is the hallmark of overfitting. Your model memorized the training data instead of learning the underlying pattern. Always evaluate on held-out test data.",
          },
          {
            q: 'How do I find the right complexity?',
            a: "Use cross-validation: split your data multiple ways, train and test on each split, and pick the complexity that minimizes average test error. Regularization (L1/L2) is another approach — it penalizes overly complex models automatically.",
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
