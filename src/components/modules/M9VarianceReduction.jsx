import { useState, useMemo } from 'react';
import { nPDF, nCDF, zInv, cupedVariance, effectiveN } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, QA, TechNote, Insight } from '../ui';

export default function M9VarianceReduction() {
  const [rho, setRho] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(5000);
  const [trueEffect, setTrueEffect] = useState(5);

  const data = useMemo(() => {
    const originalVar = 1;
    const adjustedVar = cupedVariance(originalVar, rho);
    const effN = effectiveN(sampleSize, rho);
    const reductionPct = (1 - adjustedVar / originalVar) * 100;
    const multiplier = effN / sampleSize;

    const origSD = Math.sqrt(originalVar);
    const adjSD = Math.sqrt(adjustedVar);

    const effectFrac = trueEffect / 100;
    const alpha = 0.05;
    const zAlpha = zInv(alpha);
    const zBeta = (p) => -zInv((1 - p) * 2);

    // Power curves
    const powerPoints = [];
    const nSteps = 50;
    for (let i = 0; i <= nSteps; i++) {
      const n = 500 + (i / nSteps) * (sampleSize * 2 - 500);
      const seOrig = origSD * Math.sqrt(2 / n);
      const seAdj = adjSD * Math.sqrt(2 / n);
      const zOrig = effectFrac / seOrig - zAlpha;
      const zAdj = effectFrac / seAdj - zAlpha;
      const powOrig = nCDF(zOrig, 0, 1);
      const powAdj = nCDF(zAdj, 0, 1);
      powerPoints.push({ n, powOrig: Math.max(0, Math.min(1, powOrig)), powAdj: Math.max(0, Math.min(1, powAdj)) });
    }

    return { originalVar, adjustedVar, reductionPct, multiplier, effN, origSD, adjSD, powerPoints };
  }, [rho, sampleSize, trueEffect]);

  // Distribution chart
  const W = 600, H1 = 200, pl = 50, pr = 50, pt = 30, pb = 36;
  const distRange = 4 * data.origSD;
  const toX = (v) => pl + ((v + distRange) / (2 * distRange)) * (W - pl - pr);
  const distSteps = 200;
  const dx = (2 * distRange) / distSteps;
  let maxY = 0;
  for (let i = 0; i <= distSteps; i++) {
    const x = -distRange + i * dx;
    maxY = Math.max(maxY, nPDF(x, 0, data.origSD), nPDF(x, 0, data.adjSD));
  }
  const toY = (v) => H1 - pb - (v / maxY) * (H1 - pt - pb);

  let origPath = '', adjPath = '';
  let origFill = `M${toX(-distRange)},${toY(0)}`;
  let adjFill = `M${toX(-distRange)},${toY(0)}`;
  for (let i = 0; i <= distSteps; i++) {
    const x = -distRange + i * dx;
    const yO = nPDF(x, 0, data.origSD);
    const yA = nPDF(x, 0, data.adjSD);
    const cmd = i === 0 ? 'M' : 'L';
    origPath += `${cmd}${toX(x)},${toY(yO)}`;
    adjPath += `${cmd}${toX(x)},${toY(yA)}`;
    origFill += `L${toX(x)},${toY(yO)}`;
    adjFill += `L${toX(x)},${toY(yA)}`;
  }
  origFill += `L${toX(distRange)},${toY(0)}Z`;
  adjFill += `L${toX(distRange)},${toY(0)}Z`;

  // Power curve chart
  const H2 = 200;
  const pToX = (n) => pl + ((n - 500) / (data.powerPoints[data.powerPoints.length - 1].n - 500)) * (W - pl - pr);
  const pToY = (p) => H2 - pb - p * (H2 - pt - pb);
  let powOrigPath = '', powAdjPath = '';
  data.powerPoints.forEach((pt2, i) => {
    const cmd = i === 0 ? 'M' : 'L';
    powOrigPath += `${cmd}${pToX(pt2.n)},${pToY(pt2.powOrig)}`;
    powAdjPath += `${cmd}${pToX(pt2.n)},${pToY(pt2.powAdj)}`;
  });

  return (
    <div>
      <Hdr sub="Design">Variance Reduction (CUPED)</Hdr>
      <Desc>
        CUPED (Controlled-experiment Using Pre-Experiment Data) uses pre-experiment covariates to
        remove predictable variance. The result: dramatically increased statistical power without
        needing more users. If the covariate correlates with your metric, CUPED shrinks confidence
        intervals as if you had a much larger sample.
      </Desc>

      {/* Variance reduction factor display */}
      <div className="text-center mb-6">
        <div className="text-[13px] text-[var(--svg-text-faint)] mb-1">Variance Reduction Factor</div>
        <div className="text-[36px] font-bold font-mono transition-all duration-300" style={{ color: colors.emerald }}>
          {(1 - rho * rho).toFixed(3)}
        </div>
        <div className="text-[12px] text-[var(--svg-text-faint)]">1 - ρ² = remaining variance fraction</div>
      </div>

      {/* Distribution comparison */}
      <ChartBox h={H1} label="Distribution comparison showing how CUPED reduces variance by using pre-experiment covariate data">
        <defs>
          <linearGradient id="grad-orig-9" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="grad-adj-9" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={origFill} fill="url(#grad-orig-9)" />
        <path d={adjFill} fill="url(#grad-adj-9)" />
        <path d={origPath} fill="none" stroke={colors.indigo} strokeWidth={2} strokeDasharray="6,4" />
        <path d={adjPath} fill="none" stroke={colors.emerald} strokeWidth={2.5} />
        <line x1={toX(0)} y1={pt} x2={toX(0)} y2={H1 - pb} stroke={sv.axis} strokeWidth={1} strokeDasharray="3,3" />
        <line x1={pl} y1={H1 - pb} x2={W - pr} y2={H1 - pb} stroke={sv.axis} />
        {/* Legend */}
        <line x1={pl + 10} y1={pt + 4} x2={pl + 30} y2={pt + 4} stroke={colors.indigo} strokeWidth={2} strokeDasharray="6,4" />
        <text x={pl + 35} y={pt + 8} fill={colors.indigo} fontSize={10}>Original</text>
        <line x1={pl + 110} y1={pt + 4} x2={pl + 130} y2={pt + 4} stroke={colors.emerald} strokeWidth={2.5} />
        <text x={pl + 135} y={pt + 8} fill={colors.emerald} fontSize={10}>CUPED-adjusted</text>
      </ChartBox>

      {/* Power curve comparison */}
      <ChartBox h={H2} label="Power curves comparing original and CUPED-adjusted experiments, showing how variance reduction increases power at every sample size">
        {/* Grid lines */}
        {[0.2, 0.4, 0.6, 0.8].map((p) => (
          <g key={p}>
            <line x1={pl} y1={pToY(p)} x2={W - pr} y2={pToY(p)} stroke={sv.grid} strokeWidth={0.5} />
            <text x={pl - 8} y={pToY(p) + 3} fill={sv.textFaint} fontSize={9} textAnchor="end">{(p * 100).toFixed(0)}%</text>
          </g>
        ))}
        {/* 80% power threshold */}
        <line x1={pl} y1={pToY(0.8)} x2={W - pr} y2={pToY(0.8)} stroke={colors.amber} strokeWidth={1} strokeDasharray="4,4" opacity={0.6} />
        <text x={W - pr + 4} y={pToY(0.8) + 3} fill={colors.amber} fontSize={9}>80%</text>
        {/* Power curves */}
        <path d={powOrigPath} fill="none" stroke={colors.indigo} strokeWidth={2} strokeDasharray="6,4" />
        <path d={powAdjPath} fill="none" stroke={colors.emerald} strokeWidth={2.5} />
        <line x1={pl} y1={H2 - pb} x2={W - pr} y2={H2 - pb} stroke={sv.axis} />
        <line x1={pl} y1={pt} x2={pl} y2={H2 - pb} stroke={sv.axis} />
        <text x={W / 2} y={H2 - 6} fill={sv.textFaint} fontSize={10} textAnchor="middle">Sample Size</text>
        <text x={14} y={(H2 - pt - pb) / 2 + pt} fill={sv.textFaint} fontSize={10} textAnchor="middle" transform={`rotate(-90,14,${(H2 - pt - pb) / 2 + pt})`}>Power</text>
        {/* Legend */}
        <line x1={pl + 10} y1={pt + 4} x2={pl + 30} y2={pt + 4} stroke={colors.indigo} strokeWidth={2} strokeDasharray="6,4" />
        <text x={pl + 35} y={pt + 8} fill={colors.indigo} fontSize={10}>Original</text>
        <line x1={pl + 110} y1={pt + 4} x2={pl + 130} y2={pt + 4} stroke={colors.emerald} strokeWidth={2.5} />
        <text x={pl + 135} y={pt + 8} fill={colors.emerald} fontSize={10}>CUPED-adjusted</text>
      </ChartBox>

      <Sl label="Pre-experiment Covariate Correlation (ρ)" value={rho} min={0} max={0.95} step={0.01} onChange={setRho} fmt={(v) => v.toFixed(2)} color={colors.emerald} />
      <Sl label="Original Sample Size" value={sampleSize} min={100} max={100000} step={100} onChange={setSampleSize} fmt={(v) => v.toLocaleString()} color={colors.indigo} />
      <Sl label="True Effect Size (%)" value={trueEffect} min={0.1} max={10} step={0.1} onChange={setTrueEffect} fmt={(v) => v.toFixed(1) + '%'} color={colors.amber} />

      <div className="flex gap-3 flex-wrap mt-6">
        <StatBox label="Original Var" value={data.originalVar.toFixed(2)} color={colors.indigo} />
        <StatBox label="Adjusted Var" value={data.adjustedVar.toFixed(3)} color={colors.emerald} />
        <StatBox label="Reduction" value={data.reductionPct.toFixed(1) + '%'} color={colors.amber} />
        <StatBox label="N Multiplier" value={data.multiplier.toFixed(2) + 'x'} color={colors.emerald} />
      </div>

      <QA
        items={[
          {
            q: 'Where do we get the covariate?',
            a: 'Use pre-experiment values of the same metric. For example, if you are measuring conversion rate, use each user\'s conversion rate from the previous week. The stronger the correlation between pre and post values, the more variance you remove.',
          },
          {
            q: 'How much improvement is realistic?',
            a: 'Correlations of 0.3-0.7 between pre and post metrics are common in practice, giving 10-50% variance reduction. For highly stable metrics like revenue per user, correlations can exceed 0.8, giving 60%+ reduction — equivalent to running a test 2-3x longer.',
          },
        ]}
      />
      <TechNote>
        CUPED computes Y_adjusted = Y - θ·X where θ = Cov(Y,X)/Var(X) and X is the pre-experiment
        covariate. The variance reduction factor is exactly 1 - ρ², making a sample of size n
        behave like n/(1-ρ²) users. This is mathematically equivalent to regression adjustment.
      </TechNote>
      <Insight>
        CUPED is one of the highest-leverage improvements for an experimentation platform. It does
        not require any changes to experiment design or user allocation — just historical data. Teams
        that implement CUPED typically cut required test durations by 30-50%.
      </Insight>
    </div>
  );
}
