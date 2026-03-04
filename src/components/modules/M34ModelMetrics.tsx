import { useMemo, useCallback } from 'react';
import { sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const defaults = { thr: 0.5 };

export default function M23ModelMetrics() {
  const [p, set] = useAnimatedParams(defaults);
  const { thr } = p;
  const setThr = (v: number) => set('thr', v);

  const data = useMemo(() => {
    const pts = Array.from({ length: 200 }, (_, i) => {
      const act = i < 100 ? 1 : 0;
      const sc = act === 1 ? 0.25 + sR(i * 17) * 0.65 : sR(i * 31 + 7) * 0.55;
      return { act, sc, pred: sc >= thr ? 1 : 0 };
    });
    const tp = pts.filter((p) => p.act === 1 && p.pred === 1).length;
    const fp = pts.filter((p) => p.act === 0 && p.pred === 1).length;
    const fn = pts.filter((p) => p.act === 1 && p.pred === 0).length;
    const tn = pts.filter((p) => p.act === 0 && p.pred === 0).length;
    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
    // ROC: sort all points by score descending, walk to build proper monotonic curve
    const sortedPts = [...pts].sort((a, b) => b.sc - a.sc);
    const nPos = pts.filter((p) => p.act === 1).length;
    const nNeg = pts.filter((p) => p.act === 0).length;
    const roc = [{ fpr: 0, tpr: 0 }];
    let tpCount = 0,
      fpCount = 0;
    for (let k = 0; k < sortedPts.length; k++) {
      if (sortedPts[k].act === 1) tpCount++;
      else fpCount++;
      // Only add a point when the score changes (or at the end) to avoid duplicates
      if (k === sortedPts.length - 1 || sortedPts[k].sc !== sortedPts[k + 1].sc) {
        roc.push({ fpr: fpCount / nNeg, tpr: tpCount / nPos });
      }
    }
    let auc = 0;
    for (let i = 1; i < roc.length; i++)
      auc += ((roc[i].fpr - roc[i - 1].fpr) * (roc[i].tpr + roc[i - 1].tpr)) / 2;
    // PR curve: walk sorted points, track precision and recall
    const pr: { recall: number; precision: number }[] = [];
    let tpC2 = 0,
      fpC2 = 0;
    for (let k = 0; k < sortedPts.length; k++) {
      if (sortedPts[k].act === 1) tpC2++;
      else fpC2++;
      if (k === sortedPts.length - 1 || sortedPts[k].sc !== sortedPts[k + 1].sc) {
        const recall = tpC2 / nPos;
        const precision = tpC2 / (tpC2 + fpC2);
        pr.push({ recall, precision });
      }
    }
    let prAuc = 0;
    for (let i = 1; i < pr.length; i++)
      prAuc += ((pr[i].recall - pr[i - 1].recall) * (pr[i].precision + pr[i - 1].precision)) / 2;
    // Current threshold's precision/recall on the PR curve
    const curPrec = prec;
    const curRec = rec;
    return {
      tp,
      fp,
      fn,
      tn,
      prec,
      rec,
      f1,
      roc,
      auc,
      pr,
      prAuc,
      curPrec,
      curRec,
      curTPR: pts.filter((p) => p.act === 1 && p.sc >= thr).length / 100,
      curFPR: pts.filter((p) => p.act === 0 && p.sc >= thr).length / 100,
    };
  }, [thr]);

  const RW = 600,
    RH = 300,
    rpl = 48,
    rpr = 20,
    rpt = 20,
    rpb = 36;
  const rToX = (v: number) => rpl + v * (RW - rpl - rpr);
  const rToY = (v: number) => RH - rpb - v * (RH - rpt - rpb);
  const rocP = data.roc
    .map((p, i) => (i === 0 ? 'M' : 'L') + rToX(p.fpr) + ',' + rToY(p.tpr))
    .join('');
  const rocFill =
    rocP +
    'L' +
    rToX(data.roc[data.roc.length - 1].fpr) +
    ',' +
    rToY(0) +
    'L' +
    rToX(0) +
    ',' +
    rToY(0) +
    'Z';

  const rocTooltipLookup = useCallback(
    (vbX: number, _vbY: number) => {
      if (vbX < rpl || vbX > RW - rpr) return null;
      // Snap to nearest ROC point by FPR
      const fpr = (vbX - rpl) / (RW - rpl - rpr);
      let best = null,
        bestDist = Infinity;
      for (const pt of data.roc) {
        const d = Math.abs(pt.fpr - fpr);
        if (d < bestDist) {
          bestDist = d;
          best = pt;
        }
      }
      if (!best) return null;
      return {
        x: rToX(best.fpr),
        y: rToY(best.tpr),
        markers: [{ y: rToY(best.tpr), color: colors.indigo }],
        lines: [
          { label: 'FPR', value: best.fpr.toFixed(3), color: colors.red },
          { label: 'TPR', value: best.tpr.toFixed(3), color: colors.emerald },
        ],
      };
    },
    [data.roc, rpl, rpr, RW],
  );

  // PR curve geometry
  const prP = data.pr
    .map((pt, i) => (i === 0 ? 'M' : 'L') + rToX(pt.recall) + ',' + rToY(pt.precision))
    .join('');
  const prFill =
    prP.length > 0
      ? prP +
        'L' +
        rToX(data.pr[data.pr.length - 1].recall) +
        ',' +
        rToY(0) +
        'L' +
        rToX(0) +
        ',' +
        rToY(0) +
        'Z'
      : '';

  const prTooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < rpl || vbX > RW - rpr) return null;
      const recall = (vbX - rpl) / (RW - rpl - rpr);
      let best = null as { recall: number; precision: number } | null,
        bestDist = Infinity;
      for (const pt of data.pr) {
        const d = Math.abs(pt.recall - recall);
        if (d < bestDist) {
          bestDist = d;
          best = pt;
        }
      }
      if (!best) return null;
      return {
        x: rToX(best.recall),
        y: rToY(best.precision),
        markers: [{ y: rToY(best.precision), color: colors.emerald }],
        lines: [
          { label: 'Recall', value: best.recall.toFixed(3), color: colors.emerald },
          { label: 'Precision', value: best.precision.toFixed(3), color: colors.indigo },
        ],
      };
    },
    [data.pr, rpl, rpr, RW],
  );

  return (
    <div>
      <Hdr sub="Model & Evaluate">Precision, Recall, F1 and ROC/AUC</Hdr>
      <Desc>
        How good is our model at catching the right things without too many false alarms? Drag the
        threshold to see the tradeoff — like adjusting how tight a fishing net is. Tighter catches
        fewer but more accurately; wider catches more but with more debris.
      </Desc>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="Precision"
          value={Math.round(data.prec * 100) + '%'}
          color={colors.indigo}
        />
        <StatBox label="Recall" value={Math.round(data.rec * 100) + '%'} color={colors.emerald} />
        <StatBox label="F1" value={data.f1.toFixed(3)} color={colors.indigo} />
        <StatBox label="ROC-AUC" value={data.auc.toFixed(3)} color={colors.amber} />
        <StatBox label="PR-AUC" value={data.prAuc.toFixed(3)} color={colors.emerald} />
      </div>

      <div className="flex gap-4 flex-wrap mb-5">
        {/* Confusion Matrix */}
        <div className="flex-1 min-w-[200px] bg-app-surface rounded-2xl p-6 ring-1 ring-[var(--color-border-subtle)]">
          <div className="text-[11px] text-[var(--svg-text)] text-center mb-3 font-bold uppercase tracking-widest">
            Confusion Matrix
          </div>
          <div className="grid gap-2 text-center" style={{ gridTemplateColumns: 'auto 1fr 1fr' }}>
            <div />
            <div className="text-[9px] text-[var(--svg-text)] p-1">Pred +</div>
            <div className="text-[9px] text-[var(--svg-text)] p-1">Pred −</div>
            <div className="text-[9px] text-[var(--svg-text)] p-1 text-right">Act +</div>
            <div className="rounded-lg py-3 px-2" style={{ background: sv.fillEmerald }}>
              <div className="font-extrabold text-lg" style={{ color: colors.emerald }}>
                {data.tp}
              </div>
              <div className="text-[var(--svg-text)] text-[9px]">True Pos</div>
            </div>
            <div className="rounded-lg py-3 px-2" style={{ background: sv.fillRed }}>
              <div className="font-extrabold text-lg" style={{ color: colors.red }}>
                {data.fn}
              </div>
              <div className="text-[var(--svg-text)] text-[9px]">False Neg</div>
            </div>
            <div className="text-[9px] text-[var(--svg-text)] p-1 text-right">Act −</div>
            <div className="rounded-lg py-3 px-2" style={{ background: sv.fillRed }}>
              <div className="font-extrabold text-lg" style={{ color: colors.red }}>
                {data.fp}
              </div>
              <div className="text-[var(--svg-text)] text-[9px]">False Pos</div>
            </div>
            <div className="rounded-lg py-3 px-2" style={{ background: sv.fillEmerald }}>
              <div className="font-extrabold text-lg" style={{ color: colors.emerald }}>
                {data.tn}
              </div>
              <div className="text-[var(--svg-text)] text-[9px]">True Neg</div>
            </div>
          </div>
        </div>

        {/* ROC Curve */}
        <div className="flex-1 min-w-[240px]">
          <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
            ROC Curve
          </div>
          <ChartBox
            h={RH}
            className="bg-app-surface rounded-2xl p-6 ring-1 ring-[var(--color-border-subtle)]"
            tooltipLookup={rocTooltipLookup}
            label="Confusion matrix and ROC curve showing model classification performance"
          >
            <defs>
              <linearGradient id="m34-roc-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.indigo} stopOpacity="0.18" />
                <stop offset="100%" stopColor={colors.indigo} stopOpacity="0.03" />
              </linearGradient>
            </defs>
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line
                  x1={rToX(v)}
                  y1={rToY(0) + 2}
                  x2={rToX(v)}
                  y2={rToY(1)}
                  stroke={sv.grid}
                  strokeWidth={0.5}
                />
                <text x={rToX(v)} y={RH - rpb + 12} fill={sv.text} fontSize={8} textAnchor="middle">
                  {v}
                </text>
                <line
                  x1={rToX(0)}
                  y1={rToY(v)}
                  x2={rToX(1)}
                  y2={rToY(v)}
                  stroke={sv.grid}
                  strokeWidth={0.5}
                />
                <text x={rpl - 3} y={rToY(v) + 3} fill={sv.text} fontSize={8} textAnchor="end">
                  {v}
                </text>
              </g>
            ))}
            {/* Random classifier diagonal */}
            <line
              x1={rToX(0)}
              y1={rToY(0)}
              x2={rToX(1)}
              y2={rToY(1)}
              stroke={sv.axis}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            {/* AUC fill + ROC curve */}
            <path d={rocFill} fill="url(#m34-roc-fill)" />
            <path d={rocP} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
            {/* Current threshold marker */}
            <circle
              cx={rToX(data.curFPR)}
              cy={rToY(data.curTPR)}
              r={5}
              fill={colors.amber}
              stroke={sv.appBg}
              strokeWidth={2}
            />
            {/* Labels */}
            <text x={RW / 2} y={RH - 4} fill={sv.text} fontSize={8} textAnchor="middle">
              False Positive Rate
            </text>
            <text
              x={6}
              y={RH / 2}
              fill={sv.text}
              fontSize={8}
              textAnchor="middle"
              transform={'rotate(-90,6,' + RH / 2 + ')'}
            >
              True Positive Rate
            </text>
            <text
              x={rToX(0.55)}
              y={rToY(0.25)}
              fill={colors.indigo}
              fontSize={14}
              fontWeight="800"
              opacity={0.6}
            >
              {'AUC = ' + data.auc.toFixed(2)}
            </text>
          </ChartBox>
        </div>
      </div>

      {/* PR Curve */}
      <div className="mb-5">
        <div className="text-[11px] text-[var(--svg-text)] text-center mb-2 font-bold uppercase tracking-widest">
          Precision-Recall Curve
        </div>
        <ChartBox
          h={RH}
          tooltipLookup={prTooltipLookup}
          label="Precision-Recall curve showing tradeoff between precision and recall at different thresholds"
        >
          <defs>
            <linearGradient id="m23-pr-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.18" />
              <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line
                x1={rToX(v)}
                y1={rToY(0) + 2}
                x2={rToX(v)}
                y2={rToY(1)}
                stroke={sv.grid}
                strokeWidth={0.5}
              />
              <text x={rToX(v)} y={RH - rpb + 12} fill={sv.text} fontSize={8} textAnchor="middle">
                {v}
              </text>
              <line
                x1={rToX(0)}
                y1={rToY(v)}
                x2={rToX(1)}
                y2={rToY(v)}
                stroke={sv.grid}
                strokeWidth={0.5}
              />
              <text x={rpl - 3} y={rToY(v) + 3} fill={sv.text} fontSize={8} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {prFill && <path d={prFill} fill="url(#m23-pr-fill)" />}
          {prP && <path d={prP} fill="none" stroke={colors.emerald} strokeWidth={2.5} />}
          <circle
            cx={rToX(data.curRec)}
            cy={rToY(data.curPrec)}
            r={5}
            fill={colors.amber}
            stroke={sv.appBg}
            strokeWidth={2}
          />
          <text x={RW / 2} y={RH - 4} fill={sv.text} fontSize={8} textAnchor="middle">
            Recall
          </text>
          <text
            x={6}
            y={RH / 2}
            fill={sv.text}
            fontSize={8}
            textAnchor="middle"
            transform={'rotate(-90,6,' + RH / 2 + ')'}
          >
            Precision
          </text>
          <text
            x={rToX(0.55)}
            y={rToY(0.25)}
            fill={colors.emerald}
            fontSize={14}
            fontWeight="800"
            opacity={0.6}
          >
            {'PR-AUC = ' + data.prAuc.toFixed(2)}
          </text>
        </ChartBox>
      </div>

      <Sl
        label="Classification Threshold"
        value={thr}
        min={0.05}
        max={0.95}
        step={0.01}
        onChange={setThr}
        fmt={(v) => v.toFixed(2)}
        color={colors.amber}
      />

      <QA
        items={[
          {
            q: 'The model is 85% accurate — is that good?',
            a: "It depends on class balance. If 90% of cases are negative, always predicting 'no' gives 90% accuracy. That is why we use precision, recall, and AUC — they reveal whether the model is actually learning, not just exploiting class imbalance.",
          },
          {
            q: 'Should we optimize for precision or recall?',
            a: 'It depends on the cost of mistakes. Fraud detection? Optimize recall — missing fraud is expensive. Spam filter? Optimize precision — blocking real email is bad. F1 balances both when costs are roughly equal.',
          },
        ]}
      />
      <TechNote>
        AUC measures ranking quality across all thresholds (0.5 = random, 1.0 = perfect). For
        imbalanced datasets, prefer precision-recall AUC over ROC AUC. Calibration matters too — a
        well-calibrated model's predicted probabilities match observed frequencies.
      </TechNote>
      <Insight>
        The threshold slider is the key decision. Every threshold is a business tradeoff between
        catching more positives (recall) and being more precise about what you flag (precision).
        There is no universally "right" answer — it depends on the cost of each type of mistake in
        your specific context.
      </Insight>
    </div>
  );
}
