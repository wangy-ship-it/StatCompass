import { useState, useMemo } from 'react';
import { sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, StatBox, Sl, QA, TechNote, Insight } from '../ui';

export default function M29CumulativeGains() {
  const [modelQuality, setModelQuality] = useState(0.8);
  const [targetPct, setTargetPct] = useState(20);
  const [baseRate, setBaseRate] = useState(10);

  const data = useMemo(() => {
    const nTotal = 1000;
    const nPos = Math.max(1, Math.round(nTotal * baseRate / 100));
    const separation = (modelQuality - 0.5) * 4;

    // Generate scores: positives get higher scores, negatives get lower
    const units = Array.from({ length: nTotal }, (_, i) => {
      const isPos = i < nPos;
      const base = isPos ? separation * 0.5 : -separation * 0.5;
      const noise = ((sR(i * 37 + 123) + sR(i * 41 + 456) + sR(i * 53 + 789)) / 3 - 0.5) * 2;
      const dampedNoise = noise * (1 - separation * 0.35);
      return { score: base + dampedNoise, isPos };
    }).sort((a, b) => b.score - a.score);

    // Compute cumulative gains at each percentile
    const gains = [{ pct: 0, captured: 0 }];
    let posFound = 0;
    const step = Math.max(1, Math.floor(nTotal / 100));
    for (let i = 0; i < nTotal; i++) {
      if (units[i].isPos) posFound++;
      if ((i + 1) % step === 0 || i === nTotal - 1) {
        gains.push({ pct: (i + 1) / nTotal * 100, captured: nPos > 0 ? posFound / nPos * 100 : 0 });
      }
    }
    if (gains[gains.length - 1].pct < 100) {
      gains.push({ pct: 100, captured: 100 });
    }

    // Find captured % at target
    const atTarget = gains.reduce((best, g) => Math.abs(g.pct - targetPct) < Math.abs(best.pct - targetPct) ? g : best, gains[0]);
    const capturedAtTarget = atTarget.captured;
    const liftAtTarget = targetPct > 0 ? capturedAtTarget / targetPct : 0;
    const advantagePP = Math.max(0, capturedAtTarget - targetPct);

    // Area between model and random (Gini)
    let areaModel = 0, areaRandom = 0;
    for (let i = 1; i < gains.length; i++) {
      const dx = (gains[i].pct - gains[i - 1].pct) / 100;
      areaModel += dx * (gains[i].captured + gains[i - 1].captured) / 200;
      areaRandom += dx * (gains[i].pct + gains[i - 1].pct) / 200;
    }
    const gini = areaRandom > 0 ? (areaModel - areaRandom) / (0.5 - areaRandom) : 0;

    // How much budget random needs to match model at targetPct
    const randomPctNeeded = Math.min(100, capturedAtTarget);
    const budgetSavings = randomPctNeeded > 0 ? Math.max(0, (1 - targetPct / randomPctNeeded) * 100) : 0;

    return { gains, capturedAtTarget, liftAtTarget, gini: Math.max(0, gini), advantagePP, randomPctNeeded, budgetSavings };
  }, [modelQuality, targetPct, baseRate]);

  // ── Chart ──
  const W = 600, H = 300, pl = 48, pr = 20, pt = 20, pb = 36;
  const toX = (pct) => pl + (pct / 100) * (W - pl - pr);
  const toY = (pct) => H - pb - (pct / 100) * (H - pt - pb);

  // Model curve path
  let modelPath = '';
  data.gains.forEach((g, i) => {
    modelPath += (i === 0 ? 'M' : 'L') + toX(g.pct) + ',' + toY(g.captured);
  });

  // Model advantage fill (between model curve and diagonal)
  let advantageFill = '';
  data.gains.forEach((g, i) => {
    advantageFill += (i === 0 ? 'M' : 'L') + toX(g.pct) + ',' + toY(g.captured);
  });
  // Close back along the diagonal (random line)
  for (let i = data.gains.length - 1; i >= 0; i--) {
    advantageFill += 'L' + toX(data.gains[i].pct) + ',' + toY(data.gains[i].pct);
  }
  advantageFill += 'Z';

  // Perfect model path
  const perfectTurnPct = Math.min(100, baseRate);
  const perfectPath = 'M' + toX(0) + ',' + toY(0) + 'L' + toX(perfectTurnPct) + ',' + toY(100) + 'L' + toX(100) + ',' + toY(100);

  return (
    <div>
      <Hdr sub="Model & Evaluate">Cumulative Gains</Hdr>
      <Desc>
        If you can only contact 20% of your customers, which 20% should you pick? The cumulative gains
        curve shows what fraction of all positive outcomes you capture at each targeting level. The
        further the curve bows above the diagonal, the more value the model adds over random selection.
      </Desc>

      <Sl label="Model Quality" value={modelQuality} min={0.5} max={0.95} step={0.01} onChange={setModelQuality}
        fmt={(v) => (v * 100).toFixed(0) + '%'} color={colors.indigo} />
      <Sl label="Targeting Level" value={targetPct} min={5} max={100} step={5} onChange={setTargetPct}
        fmt={(v) => 'Top ' + v + '% of customers'} color={colors.amber} />
      <Sl label="Base Rate (% positive)" value={baseRate} min={1} max={30} step={1} onChange={setBaseRate}
        fmt={(v) => v + '%'} color={colors.emerald} />

      {/* ── Targeting Comparison ── */}
      <div className="bg-app-surface rounded-2xl p-5 mb-5 ring-1 ring-[var(--color-border-subtle)]">
        <div className="text-[11px] text-[var(--svg-text)] text-center mb-4 font-bold uppercase tracking-widest">
          Targeting Comparison
        </div>
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--svg-text-faint)] uppercase tracking-wider">Random targeting</span>
              <span className="text-[13px] font-bold" style={{ color: sv.textFaint }}>
                captures {targetPct}%
              </span>
            </div>
            <div className="h-5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
              <div className="h-full rounded-full transition-all duration-200" style={{ width: targetPct + '%', background: sv.textFaint, opacity: 0.4 }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--svg-text-faint)] uppercase tracking-wider">Model targeting</span>
              <span className="text-[13px] font-bold" style={{ color: colors.indigo }}>
                captures {data.capturedAtTarget.toFixed(0)}%
              </span>
            </div>
            <div className="h-5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
              <div className="h-full rounded-full transition-all duration-200" style={{ width: data.capturedAtTarget + '%', background: colors.indigo, opacity: 0.7 }} />
            </div>
          </div>
          {data.advantagePP > 2 ? (
            <div className="text-center text-[12px] font-semibold pt-1" style={{ color: colors.emerald }}>
              Model captures {data.advantagePP.toFixed(0)}pp more — your budget works {data.liftAtTarget.toFixed(1)}x harder
            </div>
          ) : (
            <div className="text-center text-[12px] font-semibold pt-1" style={{ color: sv.textFaint }}>
              At 100% targeting, model and random are the same
            </div>
          )}
        </div>
      </div>

      {/* ── Cumulative Gains Chart ── */}
      <div className="bg-app-surface rounded-2xl p-6 mb-5 ring-1 ring-[var(--color-border-subtle)]">
        <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
          Cumulative Gains Curve
        </div>
        <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ maxHeight: H, display: 'block' }}>
          <defs>
            <linearGradient id="m29-adv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.18" />
              <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={toX(v)} y1={pt} x2={toX(v)} y2={H - pb} stroke={sv.grid} strokeWidth={0.5} />
              <line x1={pl} y1={toY(v)} x2={W - pr} y2={toY(v)} stroke={sv.grid} strokeWidth={0.5} />
              <text x={toX(v)} y={H - pb + 14} fill={sv.textFaint} fontSize={8} textAnchor="middle">{v}%</text>
              <text x={pl - 6} y={toY(v) + 3} fill={sv.textFaint} fontSize={8} textAnchor="end">{v}%</text>
            </g>
          ))}

          {/* Random baseline (diagonal) */}
          <line x1={toX(0)} y1={toY(0)} x2={toX(100)} y2={toY(100)} stroke={sv.axis} strokeWidth={1.5} strokeDasharray="6,4" />
          <text x={toX(78)} y={toY(74)} fill={sv.textFaint} fontSize={9} opacity={0.6}>Random</text>

          {/* Perfect model */}
          <path d={perfectPath} fill="none" stroke={colors.emerald} strokeWidth={1.5} strokeDasharray="4,3" opacity={0.5} />
          <text x={toX(Math.min(50, perfectTurnPct + 8))} y={toY(100) + 14} fill={colors.emerald} fontSize={9} opacity={0.6}>Perfect</text>

          {/* Model advantage shaded area (between curve and diagonal) */}
          <path d={advantageFill} fill="url(#m29-adv)" />

          {/* Model curve */}
          <path d={modelPath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />

          {/* Targeting vertical line */}
          <line x1={toX(targetPct)} y1={pt} x2={toX(targetPct)} y2={H - pb} stroke={colors.amber} strokeWidth={2} strokeDasharray="6,3" />
          <text x={toX(targetPct)} y={pt - 6} fill={colors.amber} fontSize={9} textAnchor="middle" fontWeight="600">
            Top {targetPct}%
          </text>

          {/* Horizontal guide from model capture point to y-axis */}
          <line x1={pl} y1={toY(data.capturedAtTarget)} x2={toX(targetPct)} y2={toY(data.capturedAtTarget)}
            stroke={colors.indigo} strokeWidth={1} strokeDasharray="3,2" opacity={0.4} />

          {/* Vertical connector between random and model at targeting level */}
          <line x1={toX(targetPct)} y1={toY(targetPct)} x2={toX(targetPct)} y2={toY(data.capturedAtTarget)}
            stroke={colors.amber} strokeWidth={3} opacity={0.3} />

          {/* Random point at targeting level */}
          <circle cx={toX(targetPct)} cy={toY(targetPct)} r={4} fill={sv.textFaint} opacity={0.5} />

          {/* Model capture point */}
          <circle cx={toX(targetPct)} cy={toY(data.capturedAtTarget)} r={6} fill={colors.indigo} stroke="#fff" strokeWidth={2} />

          {/* Advantage annotation */}
          {data.advantagePP > 5 && (
            <g>
              <line
                x1={toX(targetPct) + 8}
                y1={(toY(targetPct) + toY(data.capturedAtTarget)) / 2}
                x2={toX(targetPct) + 50}
                y2={(toY(targetPct) + toY(data.capturedAtTarget)) / 2}
                stroke={colors.amber} strokeWidth={1} opacity={0.6}
              />
              <text
                x={toX(targetPct) + 54}
                y={(toY(targetPct) + toY(data.capturedAtTarget)) / 2 + 3}
                fill={colors.amber} fontSize={10} fontWeight="700"
              >
                +{data.advantagePP.toFixed(0)}pp advantage
              </text>
            </g>
          )}

          {/* "Model advantage" label inside shaded area */}
          {data.gini > 0.1 && (
            <text
              x={toX(55)} y={toY(45)}
              fill={colors.indigo} fontSize={9} opacity={0.4}
              textAnchor="middle" fontWeight="600"
            >
              Model Advantage
            </text>
          )}

          {/* Axes */}
          <line x1={pl} y1={pt} x2={pl} y2={H - pb} stroke={sv.axis} />
          <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />
          <text x={W / 2} y={H - 4} fill={sv.textFaint} fontSize={9} textAnchor="middle">% of Customers Targeted (sorted by model score)</text>
          <text x={14} y={(H - pt - pb) / 2 + pt} fill={sv.textFaint} fontSize={9} textAnchor="middle"
            transform={'rotate(-90,14,' + ((H - pt - pb) / 2 + pt) + ')'}>% of Conversions Captured</text>
        </svg>
      </div>

      <div className="flex gap-3 flex-wrap mb-5">
        <StatBox label="Captured" value={data.capturedAtTarget.toFixed(0) + '%'} color={colors.indigo} />
        <StatBox label={'Lift @ ' + targetPct + '%'} value={data.liftAtTarget.toFixed(1) + 'x'} color={colors.amber} />
        <StatBox label="vs Random" value={'+' + data.advantagePP.toFixed(0) + 'pp'} color={colors.emerald} />
        <StatBox label="Budget Efficiency" value={data.liftAtTarget >= 1 ? data.liftAtTarget.toFixed(1) + 'x' : '—'} color={data.liftAtTarget >= 2 ? colors.emerald : colors.indigo} />
      </div>

      <QA
        items={[
          {
            q: "We're spending $100K on marketing. How much more effective is model-based targeting?",
            a: 'Read the chart at your budget\'s coverage level. If your budget covers 20% of customers: random targeting captures ~20% of conversions, but model targeting might capture 60%. That is a 3x lift — your $100K works like $300K.',
          },
          {
            q: 'Should we target more customers to capture more positives?',
            a: 'There is a tradeoff. The curve flattens as you target more — each additional customer yields fewer additional conversions. The optimal level depends on your cost per contact versus value per conversion.',
          },
        ]}
      />
      <TechNote>
        The cumulative gains curve plots TPR against the fraction of population targeted (sorted by
        descending model score). Lift at percentile p = gains(p) / p. The Gini coefficient measures
        area between the model curve and the random diagonal, normalized by the area between perfect
        and random. Gini = 2 * AUC - 1 for binary classifiers.
      </TechNote>
      <Insight>
        This is the most business-friendly model visualization. Unlike AUC or F1, it directly answers:
        "How much more effective is our targeting at a specific budget level?" Use this chart in
        stakeholder meetings to justify model investment in language everyone understands — dollars
        and efficiency, not statistical abstractions.
      </Insight>
    </div>
  );
}
