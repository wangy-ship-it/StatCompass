import { useState, useMemo } from 'react';
import { sR, polyFit, polyEval, kFoldSplit } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useModuleParams from '../../hooks/useModuleParams';

const paramDefaults = { kFolds: 5, complexity: 3 };

export default function M28CrossValidation() {
  const [p, set] = useModuleParams(paramDefaults);
  const { kFolds, complexity } = p;
  const setKFolds = (v) => set('kFolds', v);
  const setComplexity = (v) => set('complexity', v);
  const [seed, setSeed] = useState(1);

  const data = useMemo(() => {
    const n = 100;
    const nTest = 50;
    const trueFn = (x) => Math.sin(x);

    // Generate training data: x in [-3, 3], y = sin(x) + noise
    const xs = [];
    const ys = [];
    for (let i = 0; i < n; i++) {
      const x = (sR(i * 13 + seed * 37) * 2 - 1) * 3;
      const noise = (sR(i * 47 + seed * 71) - 0.5) * 2 * 0.5;
      xs.push(x);
      ys.push(trueFn(x) + noise);
    }

    // Generate separate true test data
    const testXs = [];
    const testYs = [];
    for (let i = 0; i < nTest; i++) {
      const x = (sR(i * 19 + seed * 83 + 5000) * 2 - 1) * 3;
      const noise = (sR(i * 59 + seed * 97 + 7000) - 0.5) * 2 * 0.5;
      testXs.push(x);
      testYs.push(trueFn(x) + noise);
    }

    // For each complexity d (1-15), compute CV error, training error, true test error
    const cvErrors = [];
    const cvStds = [];
    const trainErrors = [];
    const trueTestErrors = [];

    for (let d = 1; d <= 15; d++) {
      // k-fold cross-validation
      const folds = kFoldSplit(n, kFolds, seed);
      const foldErrors = [];

      for (let f = 0; f < kFolds; f++) {
        const { train, test } = folds[f];
        const trainXFold = train.map((idx) => xs[idx]);
        const trainYFold = train.map((idx) => ys[idx]);
        const testXFold = test.map((idx) => xs[idx]);
        const testYFold = test.map((idx) => ys[idx]);

        const coeffs = polyFit(trainXFold, trainYFold, d);
        let mse = 0;
        for (let j = 0; j < testXFold.length; j++) {
          const pred = polyEval(coeffs, testXFold[j]);
          mse += (pred - testYFold[j]) ** 2;
        }
        mse /= testXFold.length;
        foldErrors.push(mse);
      }

      const meanCV = foldErrors.reduce((a, b) => a + b, 0) / kFolds;
      const stdCV = Math.sqrt(
        foldErrors.reduce((a, b) => a + (b - meanCV) ** 2, 0) / kFolds
      );
      cvErrors.push(meanCV);
      cvStds.push(stdCV);

      // Training error: fit on all data, compute MSE on training data
      const allCoeffs = polyFit(xs, ys, d);
      let trainMSE = 0;
      for (let i = 0; i < n; i++) {
        const pred = polyEval(allCoeffs, xs[i]);
        trainMSE += (pred - ys[i]) ** 2;
      }
      trainMSE /= n;
      trainErrors.push(trainMSE);

      // True test error: fit on all training data, evaluate on separate test set
      let testMSE = 0;
      for (let i = 0; i < nTest; i++) {
        const pred = polyEval(allCoeffs, testXs[i]);
        testMSE += (pred - testYs[i]) ** 2;
      }
      testMSE /= nTest;
      trueTestErrors.push(testMSE);
    }

    // Find optimal complexity (minimizes CV error)
    let optDeg = 1;
    let minCV = cvErrors[0];
    for (let d = 1; d < 15; d++) {
      if (cvErrors[d] < minCV) {
        minCV = cvErrors[d];
        optDeg = d + 1;
      }
    }

    // Per-fold errors for the current complexity
    const currentFolds = kFoldSplit(n, kFolds, seed);
    const currentFoldErrors = [];
    for (let f = 0; f < kFolds; f++) {
      const { train, test } = currentFolds[f];
      const trainXFold = train.map((idx) => xs[idx]);
      const trainYFold = train.map((idx) => ys[idx]);
      const testXFold = test.map((idx) => xs[idx]);
      const testYFold = test.map((idx) => ys[idx]);
      const coeffs = polyFit(trainXFold, trainYFold, complexity);
      let mse = 0;
      for (let j = 0; j < testXFold.length; j++) {
        const pred = polyEval(coeffs, testXFold[j]);
        mse += (pred - testYFold[j]) ** 2;
      }
      mse /= testXFold.length;
      currentFoldErrors.push(mse);
    }

    return {
      cvErrors,
      cvStds,
      trainErrors,
      trueTestErrors,
      optDeg,
      currentFoldErrors,
    };
  }, [kFolds, complexity, seed]);

  // Current complexity index (0-based)
  const ci = complexity - 1;
  const meanCVCurrent = data.cvErrors[ci];
  const stdCVCurrent = data.cvStds[ci];
  const trainErrCurrent = data.trainErrors[ci];

  // ── Visual 1: Fold structure ──
  const W = 600;
  const H1 = 160;
  const pl1 = 50, pr1 = 60, pt1 = 16, pb1 = 12;
  const rowH = Math.min(22, (H1 - pt1 - pb1) / Math.max(kFolds, 1));
  const rowGap = Math.max(2, (H1 - pt1 - pb1 - rowH * kFolds) / Math.max(kFolds - 1, 1));
  const segW = (W - pl1 - pr1) / kFolds;
  const segGap = 2;

  // ── Visual 2: CV error curve ──
  const H2 = 200;
  const pl2 = 48, pr2 = 20, pt2 = 20, pb2 = 32;
  const cw2 = W - pl2 - pr2;
  const ch2 = H2 - pt2 - pb2;

  // Clamp errors for display
  const maxErr = Math.min(
    5,
    Math.max(
      ...data.cvErrors.map((e) => Math.min(e, 5)),
      ...data.trainErrors.map((e) => Math.min(e, 5)),
      ...data.trueTestErrors.map((e) => Math.min(e, 5)),
      0.5
    )
  );

  const eToX = (d) => pl2 + ((d - 1) / 14) * cw2;
  const eToY = (v) => pt2 + ((maxErr - Math.min(v, maxErr)) / maxErr) * ch2;

  // Build paths for error curves
  let trainErrPath = '';
  let cvErrPath = '';
  let trueTestErrPath = '';
  for (let d = 0; d < 15; d++) {
    const x = eToX(d + 1);
    trainErrPath += (d === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + eToY(data.trainErrors[d]).toFixed(1);
    cvErrPath += (d === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + eToY(data.cvErrors[d]).toFixed(1);
    trueTestErrPath += (d === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + eToY(data.trueTestErrors[d]).toFixed(1);
  }

  // Y-axis ticks for error chart
  const yTickCount = 5;
  const yTicks2 = Array.from({ length: yTickCount + 1 }, (_, i) => (maxErr * i) / yTickCount);

  return (
    <div>
      <Hdr sub="Model & Evaluate">Cross-Validation</Hdr>
      <Desc>
        How do you know if your model will work on new data? Cross-validation systematically splits
        your data into training and test folds, rotates which fold is held out, and averages the
        errors. Drag the sliders to see how fold count and model complexity affect the estimate
        of out-of-sample performance.
      </Desc>

      {/* Visual 1: Fold structure */}
      <ChartBox h={H1} label="K-fold cross-validation diagram showing how data is split into training and test folds across iterations">
        {/* Fold rows */}
        {Array.from({ length: kFolds }, (_, f) => {
          const y = pt1 + f * (rowH + rowGap);
          return (
            <g key={'fold-' + f}>
              {/* Fold label */}
              <text
                x={pl1 - 6}
                y={y + rowH / 2 + 3.5}
                fill={sv.text}
                fontSize={9}
                textAnchor="end"
              >
                Fold {f + 1}
              </text>
              {/* Segments */}
              {Array.from({ length: kFolds }, (_, s) => {
                const isTest = s === f;
                return (
                  <rect
                    key={'seg-' + f + '-' + s}
                    x={pl1 + s * segW + segGap / 2}
                    y={y}
                    width={segW - segGap}
                    height={rowH}
                    rx={3}
                    fill={isTest ? colors.amber : colors.indigo}
                    opacity={isTest ? 0.85 : 0.4}
                  />
                );
              })}
              {/* Per-fold test error */}
              <text
                x={W - pr1 + 6}
                y={y + rowH / 2 + 3.5}
                fill={colors.amber}
                fontSize={8}
                textAnchor="start"
                opacity={0.9}
              >
                {data.currentFoldErrors[f] !== undefined
                  ? data.currentFoldErrors[f].toFixed(3)
                  : ''}
              </text>
            </g>
          );
        })}
        {/* Legend */}
        <rect x={pl1} y={H1 - 10} width={8} height={8} rx={2} fill={colors.indigo} opacity={0.4} />
        <text x={pl1 + 12} y={H1 - 3} fill={sv.text} fontSize={8}>Train</text>
        <rect x={pl1 + 50} y={H1 - 10} width={8} height={8} rx={2} fill={colors.amber} opacity={0.85} />
        <text x={pl1 + 62} y={H1 - 3} fill={sv.text} fontSize={8}>Test</text>
        <text x={W - pr1 + 6} y={H1 - 3} fill={sv.text} fontSize={8} textAnchor="start">MSE</text>
      </ChartBox>

      {/* Visual 2: CV error curve */}
      <ChartBox h={H2} label="Cross-validation results showing training vs test error across folds to assess model generalization">
        {/* Grid lines */}
        {yTicks2.map((t, i) => (
          <line
            key={'grid-' + i}
            x1={pl2}
            y1={eToY(t)}
            x2={pl2 + cw2}
            y2={eToY(t)}
            stroke={sv.axis}
            strokeWidth={0.5}
            strokeDasharray="4,4"
            opacity={0.3}
          />
        ))}

        {/* Training error (indigo, dashed) */}
        <path
          d={trainErrPath}
          fill="none"
          stroke={colors.indigo}
          strokeWidth={2}
          strokeDasharray="6,4"
        />

        {/* CV error (amber, solid) */}
        <path
          d={cvErrPath}
          fill="none"
          stroke={colors.amber}
          strokeWidth={2.5}
        />

        {/* True test error (emerald, dashed) */}
        <path
          d={trueTestErrPath}
          fill="none"
          stroke={colors.emerald}
          strokeWidth={2}
          strokeDasharray="6,4"
        />

        {/* Vertical dashed line at optimal complexity */}
        <line
          x1={eToX(data.optDeg)}
          y1={pt2}
          x2={eToX(data.optDeg)}
          y2={H2 - pb2}
          stroke={sv.text}
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />
        <text
          x={eToX(data.optDeg)}
          y={pt2 - 4}
          fill={sv.text}
          fontSize={8}
          textAnchor="middle"
        >
          optimal d={data.optDeg}
        </text>

        {/* Current complexity dots */}
        <circle
          cx={eToX(complexity)}
          cy={eToY(data.trainErrors[ci])}
          r={4}
          fill={colors.indigo}
        />
        <circle
          cx={eToX(complexity)}
          cy={eToY(data.cvErrors[ci])}
          r={4}
          fill={colors.amber}
        />
        <circle
          cx={eToX(complexity)}
          cy={eToY(data.trueTestErrors[ci])}
          r={4}
          fill={colors.emerald}
        />

        {/* Axes */}
        <line x1={pl2} y1={pt2} x2={pl2} y2={H2 - pb2} stroke={sv.axis} />
        <line x1={pl2} y1={H2 - pb2} x2={pl2 + cw2} y2={H2 - pb2} stroke={sv.axis} />

        {/* X-axis ticks */}
        {[1, 3, 5, 7, 9, 11, 13, 15].map((d) => (
          <text
            key={'xt-' + d}
            x={eToX(d)}
            y={H2 - pb2 + 14}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {d}
          </text>
        ))}

        {/* Y-axis labels */}
        {yTicks2.map((t, i) => (
          <text
            key={'yt-' + i}
            x={pl2 - 6}
            y={eToY(t) + 3}
            fill={sv.text}
            fontSize={9}
            textAnchor="end"
          >
            {t.toFixed(1)}
          </text>
        ))}

        {/* Axis titles */}
        <text
          x={pl2 + cw2 / 2}
          y={H2 - 2}
          fill={sv.text}
          fontSize={9}
          textAnchor="middle"
        >
          Model Complexity (Polynomial Degree)
        </text>
        <text
          x={10}
          y={pt2 + ch2 / 2}
          fill={sv.text}
          fontSize={9}
          textAnchor="middle"
          transform={'rotate(-90,' + 10 + ',' + (pt2 + ch2 / 2) + ')'}
        >
          Error (MSE)
        </text>

        {/* Legend */}
        <line x1={pl2 + cw2 - 130} y1={pt2 + 6} x2={pl2 + cw2 - 116} y2={pt2 + 6} stroke={colors.indigo} strokeWidth={2} strokeDasharray="4,3" />
        <text x={pl2 + cw2 - 112} y={pt2 + 9} fill={colors.indigo} fontSize={8}>Training</text>
        <line x1={pl2 + cw2 - 130} y1={pt2 + 19} x2={pl2 + cw2 - 116} y2={pt2 + 19} stroke={colors.amber} strokeWidth={2.5} />
        <text x={pl2 + cw2 - 112} y={pt2 + 22} fill={colors.amber} fontSize={8}>CV Error</text>
        <line x1={pl2 + cw2 - 130} y1={pt2 + 32} x2={pl2 + cw2 - 116} y2={pt2 + 32} stroke={colors.emerald} strokeWidth={2} strokeDasharray="4,3" />
        <text x={pl2 + cw2 - 112} y={pt2 + 35} fill={colors.emerald} fontSize={8}>True Test</text>
      </ChartBox>

      {/* StatBoxes */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="Mean CV Error"
          value={meanCVCurrent.toFixed(4)}
          color={colors.amber}
        />
        <StatBox
          label="CV Std Dev"
          value={stdCVCurrent.toFixed(4)}
          color={sv.text}
        />
        <StatBox
          label="Optimal Degree"
          value={data.optDeg}
          color={colors.emerald}
        />
        <StatBox
          label="Training Error"
          value={trainErrCurrent.toFixed(4)}
          color={colors.indigo}
        />
      </div>

      {/* Sliders */}
      <Sl
        label="k Folds"
        value={kFolds}
        min={2}
        max={20}
        step={1}
        onChange={setKFolds}
        fmt={(v) => v}
        color={colors.amber}
      />
      <Sl
        label="Model Complexity (Polynomial Degree)"
        value={complexity}
        min={1}
        max={15}
        step={1}
        onChange={setComplexity}
        fmt={(v) => v}
        color={colors.indigo}
      />

      {/* Button */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <PillBtn on={false} onClick={() => setSeed((s) => s + 1)}>
          New Data
        </PillBtn>
      </div>

      <QA
        items={[
          {
            q: 'Why not just use a single train/test split?',
            a: 'A single split is noisy — the error estimate depends heavily on which points land in the test set. Cross-validation averages over multiple splits, giving a more stable and reliable estimate of how your model will perform on unseen data.',
          },
          {
            q: 'How do I choose the right number of folds?',
            a: 'k=5 or k=10 are the most common choices and work well in practice. Smaller k (like 2-3) has higher bias because each training set is smaller. Larger k (approaching n, i.e. LOOCV) has low bias but high variance — each fold differs by only one observation, so errors are highly correlated.',
          },
          {
            q: 'Why does training error always decrease with complexity?',
            a: 'A more complex model has more parameters and can fit the training data more closely — eventually memorizing it perfectly. But this does not mean it generalizes. Cross-validation catches this by evaluating on held-out data, revealing the point where adding complexity starts hurting.',
          },
        ]}
      />
      <TechNote>
        k-fold CV partitions the data into k roughly equal subsets. For each fold f, the model trains
        on the k-1 other folds and predicts the held-out fold. CV error = (1/k) * sum of per-fold
        test errors. The variance of the CV estimate depends on both k and the correlation between
        fold errors. LOOCV (k=n) is nearly unbiased but can have high variance because the training
        sets overlap by n-2 points, making fold errors strongly correlated.
      </TechNote>
      <Insight>
        CV error tracks true test error much better than training error ever will. Notice how the
        training error curve plummets toward zero as complexity grows, while CV error turns back up —
        correctly warning you about overfitting. Also note that LOOCV (k=n) has high variance; the
        sweet spot is typically k=5 to k=10, balancing bias and variance of the error estimate itself.
      </Insight>
    </div>
  );
}
