import { useMemo } from 'react';
import { sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, StatBox, Sl, PillBtn, QA, TechNote, Insight } from '../ui';
import useModuleParams from '../../hooks/useModuleParams';

function calibrate(p, calType, strength) {
  if (calType === 'well') return p;
  const deviation = p - 0.5;
  const factor = calType === 'over' ? (1 - strength * 0.6) : (1 + strength * 0.8);
  return Math.max(0.001, Math.min(0.999, 0.5 + deviation * factor));
}

const paramDefaults = { calType: 'over', strength: 0.5, nBins: 10, probe: 0.8 };

export default function M24Calibration() {
  const [p, set] = useModuleParams(paramDefaults);
  const { calType, strength, nBins, probe } = p;
  const setCalType = (v) => set('calType', v);
  const setStrength = (v) => set('strength', v);
  const setNBins = (v) => set('nBins', v);
  const setProbe = (v) => set('probe', v);

  const probeActual = calibrate(probe, calType, strength);
  const probeGap = Math.abs(probe - probeActual);

  const data = useMemo(() => {
    const nSamples = 1000;
    const predictions = Array.from({ length: nSamples }, (_, i) => sR(i * 37 + 123));
    const outcomes = predictions.map((p, i) => sR(i * 53 + 456) < calibrate(p, calType, strength) ? 1 : 0);

    const binWidth = 1 / nBins;
    const bins = [];
    for (let b = 0; b < nBins; b++) {
      const lo = b * binWidth;
      const hi = (b + 1) * binWidth;
      const items = [];
      predictions.forEach((p, i) => {
        if (p >= lo && (b === nBins - 1 ? p <= hi : p < hi)) {
          items.push({ p, y: outcomes[i] });
        }
      });
      if (items.length > 0) {
        const meanPred = items.reduce((s, x) => s + x.p, 0) / items.length;
        const actualRate = items.reduce((s, x) => s + x.y, 0) / items.length;
        bins.push({ lo, hi, meanPred, actualRate, count: items.length, gap: Math.abs(meanPred - actualRate) });
      }
    }

    const brier = predictions.reduce((s, p, i) => s + Math.pow(p - outcomes[i], 2), 0) / nSamples;
    const ece = bins.reduce((s, b) => s + (b.count / nSamples) * b.gap, 0);
    const maxCE = Math.max(...bins.map((b) => b.gap));
    const worstBin = bins.reduce((w, b) => b.gap > w.gap ? b : w, bins[0]);

    return { bins, brier, ece, maxCE, worstBin, maxCount: Math.max(...bins.map((b) => b.count)) };
  }, [calType, strength, nBins]);

  // ── Reliability diagram ──
  const W = 600, H = 260, pl = 48, pr = 20, pt = 20, pb = 36;
  const toX = (v) => pl + v * (W - pl - pr);
  const toY = (v) => H - pb - v * (H - pt - pb);

  return (
    <div>
      <Hdr sub="Model & Evaluate">Calibration</Hdr>
      <Desc>
        When a model says "80% chance of conversion," is it really 80%? A well-calibrated model's
        predicted probabilities match observed reality. An overconfident model exaggerates — predicting
        90% when the truth is 70%. Drag the probe slider to test any prediction.
      </Desc>

      <div className="flex gap-2 mb-5 flex-wrap">
        <PillBtn on={calType === 'well'} onClick={() => setCalType('well')}>Well Calibrated</PillBtn>
        <PillBtn on={calType === 'over'} onClick={() => setCalType('over')}>Overconfident</PillBtn>
        <PillBtn on={calType === 'under'} onClick={() => setCalType('under')}>Underconfident</PillBtn>
      </div>

      {calType !== 'well' && (
        <Sl label="Miscalibration Strength" value={strength} min={0.1} max={1.0} step={0.05} onChange={setStrength}
          fmt={(v) => v.toFixed(2)} color={colors.amber} />
      )}

      <Sl label="Test a prediction" value={probe} min={0.1} max={0.9} step={0.05} onChange={setProbe}
        fmt={(v) => 'Model says ' + (v * 100).toFixed(0) + '%'} color={colors.amber} />

      {/* ── Prediction Translator ── */}
      <div className="bg-app-surface rounded-2xl p-5 mb-5 ring-1 ring-[var(--color-border-subtle)]">
        <div className="text-[11px] text-[var(--svg-text)] text-center mb-4 font-bold uppercase tracking-widest">
          Prediction Translator
        </div>
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--svg-text-faint)] uppercase tracking-wider">Model says</span>
              <span className="text-[13px] font-bold" style={{ color: colors.amber }}>{(probe * 100).toFixed(0)}%</span>
            </div>
            <div className="h-5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
              <div className="h-full rounded-full transition-all duration-200" style={{ width: (probe * 100) + '%', background: colors.amber, opacity: 0.7 }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--svg-text-faint)] uppercase tracking-wider">Reality</span>
              <span className="text-[13px] font-bold" style={{ color: colors.emerald }}>{(probeActual * 100).toFixed(0)}%</span>
            </div>
            <div className="h-5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
              <div className="h-full rounded-full transition-all duration-200" style={{ width: (probeActual * 100) + '%', background: colors.emerald, opacity: 0.7 }} />
            </div>
          </div>
          {probeGap > 0.015 ? (
            <div className="text-center text-[12px] font-semibold pt-1" style={{ color: colors.red }}>
              Gap: {(probeGap * 100).toFixed(0)} percentage points
              {calType === 'over' ? ' — model is overconfident' : calType === 'under' ? ' — model is underconfident' : ''}
            </div>
          ) : (
            <div className="text-center text-[12px] font-semibold pt-1" style={{ color: colors.emerald }}>
              Well calibrated — prediction matches reality
            </div>
          )}
        </div>
      </div>

      {/* ── Reliability Diagram ── */}
      <Sl label="Number of Bins" value={nBins} min={5} max={20} step={1} onChange={setNBins} color={colors.indigo} />

      <div className="bg-app-surface rounded-2xl p-6 mb-5 ring-1 ring-[var(--color-border-subtle)]">
        <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
          Reliability Diagram
        </div>
        <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ maxHeight: H, display: 'block' }}>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
            <g key={v}>
              <line x1={toX(v)} y1={pt} x2={toX(v)} y2={H - pb} stroke={sv.grid} strokeWidth={0.5} />
              <line x1={pl} y1={toY(v)} x2={W - pr} y2={toY(v)} stroke={sv.grid} strokeWidth={0.5} />
              <text x={pl - 6} y={toY(v) + 3} fill={sv.textFaint} fontSize={8} textAnchor="end">{(v * 100).toFixed(0)}%</text>
              <text x={toX(v)} y={H - pb + 14} fill={sv.textFaint} fontSize={8} textAnchor="middle">{(v * 100).toFixed(0)}%</text>
            </g>
          ))}

          {/* Perfect calibration diagonal */}
          <line x1={toX(0)} y1={toY(0)} x2={toX(1)} y2={toY(1)} stroke={colors.emerald} strokeWidth={2} strokeDasharray="6,4" opacity={0.5} />
          <text x={toX(0.92)} y={toY(0.95)} fill={colors.emerald} fontSize={9} opacity={0.5} textAnchor="end">Perfect</text>

          {/* Bin bars showing gap from diagonal to actual */}
          {data.bins.map((b, i) => {
            const gapColor = b.gap > 0.15 ? colors.red : b.gap > 0.08 ? colors.amber : colors.indigo;
            const barX = toX(b.lo) + 2;
            const barW = Math.max(4, toX(b.hi) - toX(b.lo) - 4);
            const y1 = toY(b.meanPred);
            const y2 = toY(b.actualRate);
            return (
              <g key={i}>
                {/* Gap bar from diagonal to actual */}
                <rect
                  x={barX} y={Math.min(y1, y2)}
                  width={barW} height={Math.max(2, Math.abs(y2 - y1))}
                  rx={2} fill={gapColor} opacity={0.2}
                />
                {/* Actual rate bar (short indicator) */}
                <rect
                  x={barX} y={y2 - 2}
                  width={barW} height={4}
                  rx={2} fill={gapColor} opacity={0.7}
                />
                {/* Dot at actual rate */}
                <circle cx={toX((b.lo + b.hi) / 2)} cy={y2} r={5}
                  fill={gapColor} stroke={sv.appBg} strokeWidth={1.5} />
              </g>
            );
          })}

          {/* Worst bin annotation */}
          {data.worstBin && data.worstBin.gap > 0.05 && (
            <g>
              <line
                x1={toX((data.worstBin.lo + data.worstBin.hi) / 2) + 8}
                y1={toY(data.worstBin.actualRate)}
                x2={toX((data.worstBin.lo + data.worstBin.hi) / 2) + 40}
                y2={toY(data.worstBin.actualRate) - 12}
                stroke={colors.red} strokeWidth={1} opacity={0.6}
              />
              <text
                x={toX((data.worstBin.lo + data.worstBin.hi) / 2) + 42}
                y={toY(data.worstBin.actualRate) - 14}
                fill={colors.red} fontSize={9} fontWeight="600"
              >
                {'Says ' + (data.worstBin.meanPred * 100).toFixed(0) + '% → Actually ' + (data.worstBin.actualRate * 100).toFixed(0) + '%'}
              </text>
            </g>
          )}

          {/* Probe marker on diagram */}
          <circle cx={toX(probe)} cy={toY(probe)} r={4} fill={colors.amber} opacity={0.5} />
          <circle cx={toX(probe)} cy={toY(probeActual)} r={5} fill={colors.emerald} stroke={sv.appBg} strokeWidth={1.5} />
          <line x1={toX(probe)} y1={toY(probe)} x2={toX(probe)} y2={toY(probeActual)}
            stroke={colors.amber} strokeWidth={2} strokeDasharray="3,2" opacity={0.6} />

          {/* Axes */}
          <line x1={pl} y1={pt} x2={pl} y2={H - pb} stroke={sv.axis} />
          <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />
          <text x={W / 2} y={H - 4} fill={sv.textFaint} fontSize={9} textAnchor="middle">Model's Predicted Probability</text>
          <text x={14} y={(H - pt - pb) / 2 + pt} fill={sv.textFaint} fontSize={9} textAnchor="middle"
            transform={'rotate(-90,14,' + ((H - pt - pb) / 2 + pt) + ')'}>What Actually Happened</text>
        </svg>
      </div>

      <div className="flex gap-3 flex-wrap mb-5">
        <StatBox label="Brier Score" value={data.brier.toFixed(3)} color={data.brier > 0.2 ? colors.red : colors.indigo} />
        <StatBox label="Avg. Gap (ECE)" value={(data.ece * 100).toFixed(1) + '%'} color={data.ece > 0.1 ? colors.red : colors.emerald} />
        <StatBox label="Worst Gap" value={(data.maxCE * 100).toFixed(0) + '%'} color={data.maxCE > 0.15 ? colors.red : colors.amber} />
        <StatBox label="Type" value={calType === 'well' ? 'Calibrated' : calType === 'over' ? 'Overconfident' : 'Underconfident'} color={calType === 'well' ? colors.emerald : colors.amber} />
      </div>

      <QA
        items={[
          {
            q: 'Our model says this customer has a 95% churn risk. Should we believe it?',
            a: 'Use the probe slider above to test it — set it to 95% and see what "reality" shows. If the model is overconfident, 95% might really mean 70%. The prediction translator makes the gap immediately visible.',
          },
          {
            q: 'Why does calibration matter if we just want to rank customers?',
            a: 'If you only need rankings (target the top 10%), calibration does not matter — only AUC does. But if you use the probability itself (to set a bid price, calculate expected revenue, or trigger an alert), miscalibration directly causes bad decisions.',
          },
        ]}
      />
      <TechNote>
        The Brier score = mean((predicted - actual)²) measures both calibration and discrimination.
        ECE (Expected Calibration Error) isolates calibration by weighting each bin's gap by its
        proportion of total predictions. Calibration can be fixed post-hoc with Platt scaling
        (logistic regression on logits) or isotonic regression — without affecting AUC.
      </TechNote>
      <Insight>
        Most models are overconfident out of the box — they predict more extreme probabilities than
        reality warrants. Toggle between the three modes and drag the probe slider to see the
        distortion at different prediction levels. This is fine for ranking but dangerous for
        probability-based decisions like bid pricing or risk thresholds.
      </Insight>
    </div>
  );
}
