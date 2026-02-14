import { useState, useMemo } from 'react';
import { sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, QA, TechNote, Insight } from '../ui';

export default function M27ModelDrift() {
  const [driftRate, setDriftRate] = useState(0.5);
  const [retrainFreq, setRetrainFreq] = useState(0);

  const basePerf = 0.92;
  const months = 24;

  const data = useMemo(() => {
    const points = [];
    for (let m = 0; m <= months; m++) {
      const msr = retrainFreq > 0 ? m % retrainFreq : m;
      const degradation = driftRate * 0.025 * Math.pow(msr, 1.3);
      const noise = (sR(m * 37 + 123) - 0.5) * 0.015;
      const perf = Math.max(0.5, basePerf - degradation + noise);
      points.push({ month: m, perf, msr });
    }

    const currentPerf = points[months].perf;
    const gap = basePerf - currentPerf;
    const gapPct = (gap / basePerf) * 100;
    const lastRetrain = retrainFreq > 0 ? months - (months % retrainFreq) : 0;
    const monthsSinceRetrain = months - lastRetrain;

    return { points, currentPerf, gap, gapPct, monthsSinceRetrain };
  }, [driftRate, retrainFreq]);

  // ── Performance chart ──
  const W = 600, H = 220, pl = 48, pr = 20, pt = 24, pb = 36;
  const toX = (m) => pl + (m / months) * (W - pl - pr);
  const toY = (p) => H - pb - ((p - 0.45) / (1.0 - 0.45)) * (H - pt - pb);

  let perfPath = '';
  data.points.forEach((p, i) => {
    perfPath += (i === 0 ? 'M' : 'L') + toX(p.month) + ',' + toY(p.perf);
  });

  // Retrain markers (where the sawtooth jumps back)
  const retrainMarkers = [];
  if (retrainFreq > 0) {
    for (let m = retrainFreq; m <= months; m += retrainFreq) {
      retrainMarkers.push(m);
    }
  }

  // ── Distribution shift chart ──
  const DW = 600, DH = 120, dpl = 40, dpr = 20, dpt = 10, dpb = 24;
  const driftOffset = driftRate * 0.15 * data.monthsSinceRetrain;
  const gauss = (x, mu) => Math.exp(-0.5 * Math.pow((x - mu) / 0.8, 2));
  const xRange = [-3, 3 + Math.max(driftOffset, 0.5)];
  const dToX = (x) => dpl + ((x - xRange[0]) / (xRange[1] - xRange[0])) * (DW - dpl - dpr);
  const dToY = (y) => DH - dpb - y * (DH - dpt - dpb);

  const makePath = (mu) => {
    let path = '';
    for (let i = 0; i <= 100; i++) {
      const x = xRange[0] + (xRange[1] - xRange[0]) * i / 100;
      const y = gauss(x, mu);
      path += (i === 0 ? 'M' : 'L') + dToX(x) + ',' + dToY(y);
    }
    return path;
  };
  const makeFill = (mu) => {
    const path = makePath(mu);
    return path + 'L' + dToX(xRange[1]) + ',' + dToY(0) + 'L' + dToX(xRange[0]) + ',' + dToY(0) + 'Z';
  };

  const trainPath = makePath(0);
  const currentPath = makePath(driftOffset);
  const trainFill = makeFill(0);
  const currentFill = makeFill(driftOffset);

  return (
    <div>
      <Hdr sub="Model & Evaluate">Model Drift & Monitoring</Hdr>
      <Desc>
        A model trained on historical data assumes the world stays the same. It does not. Customer
        behavior shifts, markets change, and what worked last quarter gradually stops working. This is
        why machine learning requires ongoing investment — not just a one-time build.
      </Desc>

      <Sl label="Drift Rate" value={driftRate} min={0.1} max={1.0} step={0.05} onChange={setDriftRate}
        fmt={(v) => v.toFixed(2)} color={colors.red} />
      <Sl label="Retrain Frequency" value={retrainFreq} min={0} max={12} step={1} onChange={setRetrainFreq}
        fmt={(v) => v === 0 ? 'Never' : 'Every ' + v + ' months'} color={colors.emerald} />

      {/* Performance over time */}
      <div className="bg-app-surface rounded-2xl p-6 mb-5 ring-1 ring-[var(--color-border-subtle)]">
        <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
          Model Performance Over Time
        </div>
        <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ maxHeight: H, display: 'block' }}>
          {/* Grid */}
          {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((v) => (
            <g key={v}>
              <line x1={pl} y1={toY(v)} x2={W - pr} y2={toY(v)} stroke={sv.grid} />
              <text x={pl - 6} y={toY(v) + 3} fill={sv.textFaint} fontSize={8} textAnchor="end">{v.toFixed(1)}</text>
            </g>
          ))}
          {[0, 6, 12, 18, 24].map((m) => (
            <text key={m} x={toX(m)} y={H - pb + 14} fill={sv.textFaint} fontSize={8} textAnchor="middle">M{m}</text>
          ))}

          {/* Random baseline */}
          <line x1={pl} y1={toY(0.5)} x2={W - pr} y2={toY(0.5)} stroke={colors.red} strokeWidth={1} strokeDasharray="4,3" opacity={0.4} />
          <text x={W - pr + 2} y={toY(0.5) + 3} fill={colors.red} fontSize={7} opacity={0.5}>Random</text>

          {/* Deploy performance reference */}
          <line x1={pl} y1={toY(basePerf)} x2={W - pr} y2={toY(basePerf)} stroke={colors.emerald} strokeWidth={1} strokeDasharray="4,3" opacity={0.4} />
          <text x={W - pr + 2} y={toY(basePerf) + 3} fill={colors.emerald} fontSize={7} opacity={0.5}>Deploy</text>

          {/* Retrain markers */}
          {retrainMarkers.map((m) => (
            <g key={m}>
              <line x1={toX(m)} y1={pt} x2={toX(m)} y2={H - pb} stroke={colors.emerald} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
              <text x={toX(m)} y={pt - 4} fill={colors.emerald} fontSize={7} textAnchor="middle" opacity={0.7}>retrain</text>
            </g>
          ))}

          {/* Performance line */}
          <path d={perfPath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />

          {/* Current month marker */}
          <circle cx={toX(months)} cy={toY(data.currentPerf)} r={5} fill={colors.indigo} stroke="#fff" strokeWidth={2} />

          {/* Axes */}
          <line x1={pl} y1={pt} x2={pl} y2={H - pb} stroke={sv.axis} />
          <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />
          <text x={W / 2} y={H - 4} fill={sv.textFaint} fontSize={9} textAnchor="middle">Months since deployment</text>
          <text x={14} y={(H - pt - pb) / 2 + pt} fill={sv.textFaint} fontSize={9} textAnchor="middle"
            transform={'rotate(-90,14,' + ((H - pt - pb) / 2 + pt) + ')'}>AUC</text>
        </svg>
      </div>

      {/* Distribution shift */}
      <div className="bg-app-surface rounded-2xl p-6 mb-5 ring-1 ring-[var(--color-border-subtle)]">
        <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
          Data Distribution Shift
        </div>
        <svg viewBox={'0 0 ' + DW + ' ' + DH} width="100%" style={{ maxHeight: DH, display: 'block' }}>
          <line x1={dpl} y1={DH - dpb} x2={DW - dpr} y2={DH - dpb} stroke={sv.axis} />

          {/* Training distribution */}
          <path d={trainFill} fill={colors.indigo} opacity={0.12} />
          <path d={trainPath} fill="none" stroke={colors.indigo} strokeWidth={2} />

          {/* Current distribution */}
          <path d={currentFill} fill={colors.red} opacity={0.12} />
          <path d={currentPath} fill="none" stroke={colors.red} strokeWidth={2} strokeDasharray="6,3" />

          {/* Labels */}
          <text x={dToX(0)} y={dpt + 4} fill={colors.indigo} fontSize={9} textAnchor="middle" fontWeight="600">Training</text>
          <text x={dToX(driftOffset)} y={dpt + 4} fill={colors.red} fontSize={9} textAnchor="middle" fontWeight="600">Current</text>
          <text x={DW / 2} y={DH - 4} fill={sv.textFaint} fontSize={9} textAnchor="middle">Feature distribution</text>
        </svg>
      </div>

      <div className="flex gap-3 flex-wrap mb-5">
        <StatBox label="Deploy AUC" value={basePerf.toFixed(2)} color={colors.emerald} />
        <StatBox label="Current AUC" value={data.currentPerf.toFixed(2)} color={data.gapPct > 10 ? colors.red : colors.indigo} />
        <StatBox label="Degradation" value={data.gapPct.toFixed(1) + '%'} color={data.gapPct > 10 ? colors.red : colors.amber} />
        <StatBox label="Since Retrain" value={data.monthsSinceRetrain + ' mo'} color={colors.slate400} />
      </div>

      <QA
        items={[
          {
            q: 'We built this model 6 months ago and it worked great. Why is it failing now?',
            a: 'The data the model learned from no longer represents today\'s reality. Like a map of a city that keeps changing — it was accurate when drawn but becomes less useful over time. Regular retraining keeps the model aligned with current patterns.',
          },
          {
            q: 'How often should we retrain?',
            a: 'It depends on how fast your domain changes. E-commerce models might need monthly updates; infrastructure models might last a year. The key metric is the performance gap — set a threshold (e.g., 5% degradation) and retrain when you cross it.',
          },
        ]}
      />
      <TechNote>
        Model drift has two forms: covariate drift (input distributions shift) and concept drift
        (the relationship between inputs and outputs changes). Both degrade predictions. Monitoring
        typically tracks PSI (Population Stability Index) for covariate drift and accuracy/AUC on
        labeled samples for concept drift.
      </TechNote>
      <Insight>
        Every model is a depreciating asset. The initial build is only the beginning — monitoring and
        retraining are ongoing operational costs. Teams that deploy models without monitoring plans
        are flying blind. Use the retrain frequency slider to see the cost of neglect versus regular
        maintenance.
      </Insight>
    </div>
  );
}
