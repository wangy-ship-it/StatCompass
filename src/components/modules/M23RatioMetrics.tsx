import { useMemo, useCallback } from 'react';
import { nPDF, sRNormal, ratioCI, naiveRatioVar } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const presets: Record<string, { label: string; muX: number; muY: number; corr: number }> = {
  revenue: { label: 'Revenue/User', muX: 25, muY: 1, corr: 0.3 },
  clicks: { label: 'Clicks/Impression', muX: 5, muY: 100, corr: 0.6 },
  orders: { label: 'Orders/Session', muX: 0.8, muY: 1, corr: 0.4 },
};

const defaults = { presetKey: 'revenue', sampleSize: 1000, correlation: 30, noiseLevel: 50 };

export default function M31RatioMetrics() {
  const [p, set] = useAnimatedParams(defaults);
  const { presetKey, sampleSize, correlation, noiseLevel } = p;
  const setPresetKey = (v: string) => set('presetKey', v);
  const setSampleSize = (v: number) => set('sampleSize', v);
  const setCorrelation = (v: number) => set('correlation', v);
  const setNoiseLevel = (v: number) => set('noiseLevel', v);

  const data = useMemo(() => {
    const preset = presets[presetKey as string] || presets.revenue;
    const { muX, muY } = preset;
    const corr = (correlation as number) / 100;
    const noise = (noiseLevel as number) / 100;
    const n = sampleSize as number;

    const varX = muX * noise;
    const varY = muY * noise;
    const covXY = corr * Math.sqrt(varX * varY);

    const ci = ratioCI(muX, muY, varX, varY, covXY, n);
    const nVar = naiveRatioVar(muX, muY, varX, varY, n);

    const ratio = muY !== 0 ? muX / muY : 0;
    const naiveSE = Math.sqrt(Math.max(0, nVar));
    const deltaSE = ci.se;
    const correctionFactor = naiveSE > 0 ? deltaSE / naiveSE : 1;

    // Generate scatter data (correlated pairs)
    const nPoints = 80;
    const points: { x: number; y: number }[] = [];
    const sdX = Math.sqrt(varX);
    const sdY = Math.sqrt(varY);
    for (let i = 0; i < nPoints; i++) {
      const z1 = sRNormal(i * 7 + 42);
      const z2 = sRNormal(i * 7 + 43);
      // Correlated: y = corr*z1 + sqrt(1-corr^2)*z2
      const zCorr = corr * z1 + Math.sqrt(Math.max(0, 1 - corr * corr)) * z2;
      const px = muY + sdY * z1; // denominator
      const py = muX + sdX * zCorr; // numerator
      points.push({ x: px, y: py });
    }

    return {
      preset,
      muX,
      muY,
      varX,
      varY,
      covXY,
      ratio,
      naiveSE,
      deltaSE,
      correctionFactor,
      ci,
      points,
      n,
      corr,
    };
  }, [presetKey, sampleSize, correlation, noiseLevel]);

  // ── Chart 1: Scatter Plot ──
  const W = 600,
    H1 = 220,
    pl = 50,
    pr = 40,
    pt1 = 24,
    pb1 = 36;

  const scatterData = useMemo(() => {
    const pts = data.points;
    const xVals = pts.map((p) => p.x);
    const yVals = pts.map((p) => p.y);
    const xMin = Math.min(...xVals) - 0.5;
    const xMax = Math.max(...xVals) + 0.5;
    const yMin = Math.min(...yVals) - 0.5;
    const yMax = Math.max(...yVals) + 0.5;

    const toX = (v: number) => pl + ((v - xMin) / (xMax - xMin)) * (W - pl - pr);
    const toY = (v: number) => H1 - pb1 - ((v - yMin) / (yMax - yMin)) * (H1 - pt1 - pb1);

    // Ratio slope line: y = (muX/muY) * x, from origin through data range
    const slopeX0 = Math.max(0, xMin);
    const slopeX1 = xMax;
    const slopeY0 = data.ratio * slopeX0;
    const slopeY1 = data.ratio * slopeX1;

    const mapped = pts.map((p) => ({ sx: toX(p.x), sy: toY(p.y), rawX: p.x, rawY: p.y }));

    return {
      mapped,
      slopeX0: toX(slopeX0),
      slopeY0: toY(slopeY0),
      slopeX1: toX(slopeX1),
      slopeY1: toY(slopeY1),
      xMin,
      xMax,
      yMin,
      yMax,
      toX,
      toY,
    };
  }, [data.points, data.ratio]);

  const tooltipScatter = useCallback(
    (vbX: number) => {
      if (vbX < pl || vbX > W - pr) return null;
      const { mapped } = scatterData;
      // Find closest point
      let closest = mapped[0];
      let minDist = Infinity;
      for (const m of mapped) {
        const d = Math.abs(m.sx - vbX);
        if (d < minDist) {
          minDist = d;
          closest = m;
        }
      }
      return {
        x: closest.sx,
        y: closest.sy,
        lines: [
          { label: 'Denominator', value: closest.rawX.toFixed(2), color: colors.indigo },
          { label: 'Numerator', value: closest.rawY.toFixed(2), color: colors.emerald },
          { label: 'Ratio', value: (closest.rawY / closest.rawX).toFixed(3), color: colors.amber },
        ],
        markers: [{ y: closest.sy, color: colors.indigo }],
      };
    },
    [scatterData],
  );

  // ── Chart 2: Variance Comparison ──
  const H2 = 200,
    pt2 = 24,
    pb2 = 36;

  const distData = useMemo(() => {
    const ratio = data.ratio;
    const naiveSE = data.naiveSE;
    const deltaSE = data.deltaSE;
    // Ensure positive SEs for the distribution
    const seN = Math.max(naiveSE, 0.001);
    const seD = Math.max(deltaSE, 0.001);
    const range = Math.max(seN, seD) * 4;
    const xMin = ratio - range;
    const xMax = ratio + range;

    const toX2 = (v: number) => pl + ((v - xMin) / (xMax - xMin)) * (W - pl - pr);
    const steps = 200;
    const dx = (xMax - xMin) / steps;

    let maxY = 0;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      maxY = Math.max(maxY, nPDF(x, ratio, seN), nPDF(x, ratio, seD));
    }
    const toY2 = (v: number) => H2 - pb2 - (v / maxY) * (H2 - pt2 - pb2);

    let naivePath = '',
      deltaPath = '';
    let naiveFill = `M${toX2(xMin)},${toY2(0)}`;
    let deltaFill = `M${toX2(xMin)},${toY2(0)}`;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      const yN = nPDF(x, ratio, seN);
      const yD = nPDF(x, ratio, seD);
      const cmd = i === 0 ? 'M' : 'L';
      naivePath += `${cmd}${toX2(x)},${toY2(yN)}`;
      deltaPath += `${cmd}${toX2(x)},${toY2(yD)}`;
      naiveFill += `L${toX2(x)},${toY2(yN)}`;
      deltaFill += `L${toX2(x)},${toY2(yD)}`;
    }
    naiveFill += `L${toX2(xMax)},${toY2(0)}Z`;
    deltaFill += `L${toX2(xMax)},${toY2(0)}Z`;

    return {
      naivePath,
      deltaPath,
      naiveFill,
      deltaFill,
      ratioX: toX2(ratio),
      baseY: toY2(0),
      xMin,
      xMax,
      maxY,
      seN,
      seD,
      toX2,
      toY2,
    };
  }, [data.ratio, data.naiveSE, data.deltaSE]);

  const tooltipDist = useCallback(
    (vbX: number) => {
      if (vbX < pl || vbX > W - pr) return null;
      const { xMin, xMax, seN, seD, toX2, toY2 } = distData;
      const xVal = xMin + ((vbX - pl) / (W - pl - pr)) * (xMax - xMin);
      const yN = nPDF(xVal, data.ratio, seN);
      const yD = nPDF(xVal, data.ratio, seD);
      const syN = toY2(yN);
      const syD = toY2(yD);
      return {
        x: toX2(xVal),
        y: Math.min(syN, syD),
        lines: [
          { label: 'Naive', value: yN.toFixed(4), color: colors.red },
          { label: 'Delta Method', value: yD.toFixed(4), color: colors.emerald },
        ],
        markers: [
          { y: syN, color: colors.red },
          { y: syD, color: colors.emerald },
        ],
      };
    },
    [distData, data.ratio],
  );

  return (
    <div>
      <Hdr sub="Analyze">Ratio Metrics &amp; Delta Method</Hdr>
      <Desc>
        Many key metrics are ratios: revenue per user, clicks per impression, orders per session.
        The naive approach of dividing totals gives the right point estimate but the wrong variance
        — it ignores the correlation between numerator and denominator. The delta method fixes this
        by using a Taylor expansion to properly account for covariance.
      </Desc>

      {/* Chart 1: Scatter Plot */}
      <ChartBox
        h={H1}
        label="Scatter plot of numerator versus denominator showing the ratio slope and correlation between the two variables"
        tooltipLookup={tooltipScatter}
      >
        <defs>
          <linearGradient id="grad-scatter-31" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="clip-scatter-31">
            <rect x={pl} y={pt1} width={W - pl - pr} height={H1 - pt1 - pb1} />
          </clipPath>
        </defs>
        {/* Grid lines */}
        <line x1={pl} y1={H1 - pb1} x2={W - pr} y2={H1 - pb1} stroke={sv.axis} />
        <line x1={pl} y1={pt1} x2={pl} y2={H1 - pb1} stroke={sv.axis} />
        {/* Ratio slope line (clipped to plot area) */}
        <line
          x1={scatterData.slopeX0}
          y1={scatterData.slopeY0}
          x2={scatterData.slopeX1}
          y2={scatterData.slopeY1}
          stroke={colors.emerald}
          strokeWidth={2}
          strokeDasharray="6,4"
          opacity={0.8}
          clipPath="url(#clip-scatter-31)"
        />
        {/* Data points */}
        {scatterData.mapped.map((m, i) => (
          <circle key={i} cx={m.sx} cy={m.sy} r={3} fill={colors.indigo} opacity={0.6} />
        ))}
        {/* Axis labels */}
        <text x={W / 2} y={H1 - 6} fill={sv.textFaint} fontSize={10} textAnchor="middle">
          Denominator
        </text>
        <text
          x={14}
          y={(H1 - pt1 - pb1) / 2 + pt1}
          fill={sv.textFaint}
          fontSize={10}
          textAnchor="middle"
          transform={`rotate(-90,14,${(H1 - pt1 - pb1) / 2 + pt1})`}
        >
          Numerator
        </text>
        {/* Legend */}
        <circle cx={pl + 16} cy={pt1 + 4} r={3} fill={colors.indigo} opacity={0.6} />
        <text x={pl + 24} y={pt1 + 8} fill={colors.indigo} fontSize={10}>
          Observations
        </text>
        <line
          x1={pl + 110}
          y1={pt1 + 4}
          x2={pl + 130}
          y2={pt1 + 4}
          stroke={colors.emerald}
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        <text x={pl + 135} y={pt1 + 8} fill={colors.emerald} fontSize={10}>
          Ratio = {data.ratio.toFixed(2)}
        </text>
      </ChartBox>

      {/* Chart 2: Variance Comparison */}
      <ChartBox
        h={H2}
        label="Comparison of naive and delta method variance estimates showing how ignoring covariance leads to incorrect confidence intervals"
        tooltipLookup={tooltipDist}
      >
        <defs>
          <linearGradient id="grad-naive-31" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.red} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.red} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="grad-delta-31" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Fills */}
        <path d={distData.naiveFill} fill="url(#grad-naive-31)" />
        <path d={distData.deltaFill} fill="url(#grad-delta-31)" />
        {/* Curves */}
        <path
          d={distData.naivePath}
          fill="none"
          stroke={colors.red}
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        <path d={distData.deltaPath} fill="none" stroke={colors.emerald} strokeWidth={2.5} />
        {/* Vertical line at ratio estimate */}
        <line
          x1={distData.ratioX}
          y1={pt2}
          x2={distData.ratioX}
          y2={distData.baseY}
          stroke={sv.axis}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
        {/* Axis */}
        <line x1={pl} y1={distData.baseY} x2={W - pr} y2={distData.baseY} stroke={sv.axis} />
        {/* Legend */}
        <line
          x1={pl + 10}
          y1={pt2 + 4}
          x2={pl + 30}
          y2={pt2 + 4}
          stroke={colors.red}
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        <text x={pl + 35} y={pt2 + 8} fill={colors.red} fontSize={10}>
          Naive (wrong)
        </text>
        <line
          x1={pl + 140}
          y1={pt2 + 4}
          x2={pl + 160}
          y2={pt2 + 4}
          stroke={colors.emerald}
          strokeWidth={2.5}
        />
        <text x={pl + 165} y={pt2 + 8} fill={colors.emerald} fontSize={10}>
          Delta Method (correct)
        </text>
      </ChartBox>

      {/* StatBoxes */}
      <div className="flex gap-3 flex-wrap mb-5">
        <StatBox label="Ratio Estimate" value={data.ratio.toFixed(3)} color={colors.indigo} />
        <StatBox label="Naive SE" value={data.naiveSE.toFixed(4)} color={colors.red} />
        <StatBox label="Delta Method SE" value={data.deltaSE.toFixed(4)} color={colors.emerald} />
        <StatBox
          label="Correction Factor"
          value={data.correctionFactor.toFixed(2) + 'x'}
          color={colors.amber}
        />
        <StatBox
          label="95% CI"
          value={'[' + data.ci.lo.toFixed(3) + ', ' + data.ci.hi.toFixed(3) + ']'}
          color={colors.emerald}
        />
      </div>

      {/* Sliders */}
      <Sl
        label="Sample Size"
        value={sampleSize}
        min={50}
        max={10000}
        step={50}
        onChange={setSampleSize}
        fmt={(v: number) => v.toLocaleString()}
        color={colors.indigo}
      />
      <Sl
        label="Correlation (\u03C1)"
        value={correlation}
        min={0}
        max={95}
        step={1}
        onChange={setCorrelation}
        fmt={(v: number) => (v / 100).toFixed(2)}
        color={colors.emerald}
      />
      <Sl
        label="Noise Level"
        value={noiseLevel}
        min={10}
        max={100}
        step={1}
        onChange={setNoiseLevel}
        fmt={(v: number) => v.toFixed(0) + '%'}
        color={colors.amber}
      />

      {/* Preset PillBtns */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(presets).map(([key, preset]) => (
          <PillBtn key={key} on={presetKey === key} onClick={() => setPresetKey(key)}>
            {preset.label}
          </PillBtn>
        ))}
      </div>

      <QA
        items={[
          {
            q: "Why can't I just divide the totals and use a standard t-test?",
            a: 'Dividing totals gives the correct ratio, but a standard t-test assumes each observation is independent. For ratio metrics, the numerator and denominator are correlated \u2014 users who browse more pages (denominator) also tend to click more (numerator). Ignoring this correlation makes your confidence interval too narrow, leading to inflated false positive rates.',
          },
          {
            q: 'When does the delta method matter most?',
            a: 'The correction is largest when (1) the denominator has high variance relative to its mean, (2) the numerator-denominator correlation is not accounted for, and (3) the sample size is moderate. For large samples with a nearly-constant denominator (like sessions per user \u2248 1), the correction is minimal.',
          },
        ]}
      />
      <TechNote>
        The delta method approximates Var(X/Y) &asymp; (1/&mu;Y&sup2;)(&sigma;X&sup2; &minus;
        2(&mu;X/&mu;Y)&sigma;XY + (&mu;X/&mu;Y)&sup2;&sigma;Y&sup2;) using a first-order Taylor
        expansion. This is asymptotically valid for large samples. The naive estimate only uses
        &sigma;X&sup2;/&mu;Y&sup2;, missing the covariance and denominator variance terms.
      </TechNote>
      <Insight>
        When the correlation between numerator and denominator is high, the delta method SE can be
        substantially different from the naive SE. In practice, this means your experiment may be
        more or less sensitive than you think — the correction factor tells you exactly how much.
      </Insight>
    </div>
  );
}
