import { useState, useMemo } from 'react';
import { sR } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, StatBox, Sl, PillBtn, QA, TechNote, Insight } from '../ui';

const featureDefs = [
  { name: 'Purchase History', w: 0.32 },
  { name: 'Page Views (7d)', w: 0.24 },
  { name: 'Cart Abandons', w: 0.21 },
  { name: 'Days Since Visit', w: -0.18 },
  { name: 'Time on Site', w: 0.15 },
  { name: 'Support Tickets', w: -0.13 },
  { name: 'Referral Source', w: 0.11 },
  { name: 'Email Opens', w: 0.09 },
  { name: 'Account Age', w: 0.07 },
  { name: 'Device: Mobile', w: -0.05 },
  { name: 'Browser Type', w: 0.04 },
  { name: 'Weekend Visit', w: 0.03 },
];

export default function M26FeatureImportance() {
  const [view, setView] = useState('global');
  const [nFeatures, setNFeatures] = useState(8);
  const [dataPoint, setDataPoint] = useState(1);

  const baseValue = 0.35;

  const data = useMemo(() => {
    const features = featureDefs.slice(0, nFeatures);
    const nPts = 20;

    const allContribs = Array.from({ length: nPts }, (_, i) =>
      features.map((f, j) => ({
        name: f.name,
        value: f.w * ((sR(i * 41 + j * 17 + 123) - 0.5) * 1.6),
      }))
    );

    // Global: mean |contribution| across data points
    const global = features
      .map((f, j) => ({
        name: f.name,
        importance: allContribs.reduce((s, c) => s + Math.abs(c[j].value), 0) / nPts,
        positive: f.w > 0,
      }))
      .sort((a, b) => b.importance - a.importance);

    // Individual waterfall for selected data point
    const ind = [...(allContribs[dataPoint - 1] || allContribs[0])].sort(
      (a, b) => Math.abs(b.value) - Math.abs(a.value)
    );

    // Build waterfall
    let running = baseValue;
    const waterfall = [{ name: 'Base value', start: 0, end: baseValue, type: 'base', runAfter: baseValue }];
    ind.forEach((f) => {
      const s = Math.min(running, running + f.value);
      const e = Math.max(running, running + f.value);
      running += f.value;
      waterfall.push({ name: f.name, start: s, end: e, type: f.value >= 0 ? 'pos' : 'neg', value: f.value, runAfter: running });
    });
    const finalPred = Math.max(0, Math.min(1, running));
    waterfall.push({ name: 'Prediction', start: 0, end: finalPred, type: 'result', runAfter: finalPred });

    return { global, waterfall, prediction: finalPred, topFeature: global[0] };
  }, [nFeatures, dataPoint]);

  // ── Chart dimensions ──
  const W = 600, pl = 130, pr = 50, rowH = 28, pt = 10, pb = 24;
  const globalH = pt + data.global.length * rowH + pb;
  const waterfallH = pt + data.waterfall.length * rowH + pb;
  const H = view === 'global' ? globalH : waterfallH;

  // Global: bar width scale
  const maxImp = Math.max(...data.global.map((g) => g.importance));

  // Waterfall: x-position scale
  const wfVals = data.waterfall.flatMap((w) => [w.start, w.end]);
  const wfMin = Math.min(0, ...wfVals) - 0.03;
  const wfMax = Math.max(...wfVals) + 0.06;
  const wfToX = (v) => pl + ((v - wfMin) / (wfMax - wfMin)) * (W - pl - pr);

  return (
    <div>
      <Hdr sub="Model & Evaluate">Feature Importance & Interpretability</Hdr>
      <Desc>
        When a model makes a prediction, stakeholders want to know why. Feature importance shows which
        inputs drive the output — like revealing which ingredients matter most in a recipe. The global
        view shows what matters overall; the individual view explains a specific prediction.
      </Desc>

      <div className="flex gap-2 mb-5 flex-wrap">
        <PillBtn on={view === 'global'} onClick={() => setView('global')}>Global Importance</PillBtn>
        <PillBtn on={view === 'individual'} onClick={() => setView('individual')}>Explain Prediction</PillBtn>
      </div>

      <Sl label="Number of Features" value={nFeatures} min={4} max={12} step={1} onChange={setNFeatures} color={colors.indigo} />
      {view === 'individual' && (
        <Sl label="Data Point" value={dataPoint} min={1} max={20} step={1} onChange={setDataPoint} fmt={(v) => 'Customer #' + v} color={colors.amber} />
      )}

      <div className="bg-app-surface rounded-2xl p-6 mb-5 ring-1 ring-[var(--color-border-subtle)]">
        <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ maxHeight: H, display: 'block' }}>
          {view === 'global' ? (
            <>
              {data.global.map((g, i) => {
                const y = pt + i * rowH;
                const bw = (g.importance / maxImp) * (W - pl - pr);
                return (
                  <g key={g.name}>
                    <text x={pl - 8} y={y + rowH / 2 + 3} fill={sv.text} fontSize={10} textAnchor="end">{g.name}</text>
                    <rect x={pl} y={y + 5} width={bw} height={rowH - 10} rx={4}
                      fill={g.positive ? colors.emerald : colors.red} opacity={0.7} />
                    <text x={pl + bw + 6} y={y + rowH / 2 + 3} fill={sv.text} fontSize={9}>
                      {g.importance.toFixed(3)}
                    </text>
                  </g>
                );
              })}
              <text x={W / 2} y={H - 4} fill={sv.textFaint} fontSize={9} textAnchor="middle">
                Mean |SHAP value| — green: pushes positive · red: pushes negative
              </text>
            </>
          ) : (
            <>
              {/* X-axis scale ticks */}
              {[0, 0.25, 0.5, 0.75, 1.0].filter((v) => v >= wfMin && v <= wfMax).map((v) => (
                <g key={v}>
                  <line x1={wfToX(v)} y1={pt} x2={wfToX(v)} y2={H - pb} stroke={sv.grid} strokeWidth={0.5} />
                  <text x={wfToX(v)} y={H - pb + 14} fill={sv.textFaint} fontSize={8} textAnchor="middle">{v}</text>
                </g>
              ))}

              {data.waterfall.map((w, i) => {
                const y = pt + i * rowH;
                const x1 = wfToX(w.start);
                const x2 = wfToX(w.end);
                const barColor = w.type === 'base' ? colors.slate500
                  : w.type === 'result' ? colors.indigo
                  : w.type === 'pos' ? colors.emerald : colors.red;
                const barOpacity = w.type === 'base' || w.type === 'result' ? 0.5 : 0.7;

                return (
                  <g key={i}>
                    <text x={pl - 8} y={y + rowH / 2 + 3} fill={sv.text} fontSize={10} textAnchor="end">
                      {w.name}
                    </text>
                    <rect x={Math.min(x1, x2)} y={y + 5} width={Math.abs(x2 - x1)} height={rowH - 10} rx={4}
                      fill={barColor} opacity={barOpacity} />
                    {w.type !== 'base' && w.type !== 'result' && (
                      <text x={Math.max(x1, x2) + 4} y={y + rowH / 2 + 3} fill={barColor} fontSize={9} fontWeight="600">
                        {(w.value >= 0 ? '+' : '') + w.value.toFixed(3)}
                      </text>
                    )}
                    {w.type === 'result' && (
                      <text x={x2 + 4} y={y + rowH / 2 + 3} fill={colors.indigo} fontSize={10} fontWeight="700">
                        {(data.prediction * 100).toFixed(1) + '%'}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Connector lines between waterfall rows */}
              {data.waterfall.slice(0, -1).map((w, i) => {
                const y1 = pt + i * rowH + rowH - 3;
                const y2 = pt + (i + 1) * rowH + 5;
                return (
                  <line key={'c' + i} x1={wfToX(w.runAfter)} y1={y1} x2={wfToX(w.runAfter)} y2={y2}
                    stroke={sv.axis} strokeWidth={1} strokeDasharray="2,2" />
                );
              })}

              <text x={W / 2} y={H - 4} fill={sv.textFaint} fontSize={9} textAnchor="middle">
                Prediction probability
              </text>
            </>
          )}
        </svg>
      </div>

      <div className="flex gap-3 flex-wrap mb-5">
        <StatBox label="Top Feature" value={data.topFeature.name} color={colors.indigo} />
        <StatBox label="Top Impact" value={data.topFeature.importance.toFixed(3)} color={colors.indigo} />
        {view === 'individual' && (
          <StatBox label="Prediction" value={(data.prediction * 100).toFixed(1) + '%'} color={data.prediction > 0.5 ? colors.emerald : colors.red} />
        )}
        <StatBox label="Features Used" value={nFeatures} color={colors.slate400} />
      </div>

      <QA
        items={[
          {
            q: 'The model rejected a loan application — can we explain why?',
            a: 'Yes. The waterfall chart breaks down exactly how much each feature pushed the prediction toward approval or rejection. In regulated industries, this kind of explainability is not optional — it is required.',
          },
          {
            q: 'Which features should we invest in improving?',
            a: 'Focus on the top features in the global importance chart. Improving data quality for high-importance features has the biggest impact on model performance. Low-importance features may not be worth the collection cost.',
          },
        ]}
      />
      <TechNote>
        SHAP (SHapley Additive exPlanations) values satisfy three properties: local accuracy
        (contributions sum to the prediction), missingness (absent features contribute zero), and
        consistency. They are based on cooperative game theory — each feature's marginal contribution
        averaged over all possible feature orderings.
      </TechNote>
      <Insight>
        A model you cannot explain is a model you cannot trust — or defend. Feature importance turns
        a black box into a glass box, enabling data scientists to validate the model makes sense and
        stakeholders to understand why it makes specific decisions.
      </Insight>
    </div>
  );
}
