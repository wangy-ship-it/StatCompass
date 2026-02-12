import { useState, useMemo } from 'react';
import { sR, nCDF, bonferroni, benjaminiHochberg } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, StatBox, Sl, PillBtn, QA, TechNote, Insight } from '../ui';

export default function M11MultipleTesting() {
  const [nTests, setNTests] = useState(20);
  const [trueEffects, setTrueEffects] = useState(3);
  const [correction, setCorrection] = useState('none');
  const [seed, setSeed] = useState(1);
  const alpha = 0.05;

  const data = useMemo(() => {
    const pValues = [];
    const isTrue = [];

    for (let i = 0; i < nTests; i++) {
      const hasEffect = i < trueEffects;
      isTrue.push(hasEffect);
      if (hasEffect) {
        // True effect: generate z-score with shift
        const z = 2.5 + (sR(i * 37 + seed * 71) - 0.5) * 2;
        pValues.push(2 * (1 - nCDF(Math.abs(z), 0, 1)));
      } else {
        // Null: uniform p-value
        pValues.push(sR(i * 53 + seed * 97 + 500));
      }
    }

    let threshold = alpha;
    let significant;
    let bhThresholds = null;

    if (correction === 'bonferroni') {
      threshold = bonferroni(alpha, nTests);
      significant = pValues.map((p) => p < threshold);
    } else if (correction === 'bh') {
      const bh = benjaminiHochberg(pValues, alpha);
      significant = bh.results;
      bhThresholds = bh.sortedPValues.map((sp, k) => ({
        rank: k + 1,
        threshold: ((k + 1) / nTests) * alpha,
        p: sp.p,
        idx: sp.i,
      }));
    } else {
      significant = pValues.map((p) => p < alpha);
    }

    const tp = significant.filter((s, i) => s && isTrue[i]).length;
    const fp = significant.filter((s, i) => s && !isTrue[i]).length;
    const fn = significant.filter((s, i) => !s && isTrue[i]).length;
    const totalSig = significant.filter(Boolean).length;
    const fwer = fp > 0 ? 1 : 0;
    const fdr = totalSig > 0 ? fp / totalSig : 0;

    return { pValues, isTrue, significant, threshold, bhThresholds, tp, fp, fn, fwer, fdr };
  }, [nTests, trueEffects, correction, seed]);

  const W = 600, H = 240, pl = 36, pr = 20, pt = 30, pb = 36;
  const barW = Math.min(16, (W - pl - pr - nTests * 2) / nTests);
  const toX = (i) => pl + (i / nTests) * (W - pl - pr) + barW / 2;
  const toY = (p) => pt + p * (H - pt - pb);

  return (
    <div>
      <Hdr sub="Analyze">Multiple Testing & Corrections</Hdr>
      <Desc>
        Test 20 metrics and 1 will be "significant" by pure chance. The more tests you run, the
        more false positives you get. Correction methods raise the bar to account for multiple
        comparisons — keeping false discoveries under control.
      </Desc>

      <div className="bg-app-surface rounded-2xl p-6 mb-7 ring-1 ring-[var(--color-border-subtle)]">
        <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ maxHeight: H, display: 'block', overflow: 'visible' }}>
          {/* Threshold line(s) */}
          {correction !== 'bh' && (
            <>
              <line x1={pl} y1={toY(data.threshold)} x2={W - pr} y2={toY(data.threshold)} stroke={colors.amber} strokeWidth={1.5} strokeDasharray="6,4" />
              <text x={W - pr} y={toY(data.threshold) - 4} fill={colors.amber} fontSize={9} textAnchor="end" fontWeight="600">
                {'α' + (correction === 'bonferroni' ? '/' + nTests : '') + ' = ' + data.threshold.toFixed(4)}
              </text>
            </>
          )}

          {/* BH stepped threshold */}
          {correction === 'bh' && data.bhThresholds && (() => {
            let bhPath = '';
            data.bhThresholds.forEach((bt, k) => {
              const x0 = pl + (k / nTests) * (W - pl - pr);
              const x1 = pl + ((k + 1) / nTests) * (W - pl - pr);
              bhPath += (k === 0 ? 'M' : 'L') + x0 + ',' + toY(bt.threshold) + 'L' + x1 + ',' + toY(bt.threshold);
            });
            return <path d={bhPath} fill="none" stroke={colors.amber} strokeWidth={1.5} strokeDasharray="4,3" />;
          })()}

          {/* P-value bars */}
          {data.pValues.map((p, i) => {
            const isSig = data.significant[i];
            const isTP = isSig && data.isTrue[i];
            const isFP = isSig && !data.isTrue[i];
            const barColor = isTP ? colors.emerald : isFP ? colors.red : isSig ? colors.emerald : colors.slate500;
            const barOpacity = isSig ? 0.8 : 0.3;
            return (
              <g key={i}>
                <rect
                  x={toX(i) - barW / 2}
                  y={toY(0)}
                  width={barW}
                  height={Math.max(1, toY(p) - toY(0))}
                  rx={2}
                  fill={barColor}
                  opacity={barOpacity}
                />
                {isFP && (
                  <rect
                    x={toX(i) - barW / 2 - 1}
                    y={toY(0) - 1}
                    width={barW + 2}
                    height={Math.max(3, toY(p) - toY(0) + 2)}
                    rx={3}
                    fill="none"
                    stroke={colors.red}
                    strokeWidth={1.5}
                  />
                )}
                {data.isTrue[i] && (
                  <circle cx={toX(i)} cy={H - pb + 10} r={2.5} fill={colors.emerald} />
                )}
              </g>
            );
          })}

          {/* Axis */}
          <line x1={pl} y1={toY(0)} x2={W - pr} y2={toY(0)} stroke={sv.axis} />
          <text x={pl - 4} y={toY(0) + 3} fill={sv.text} fontSize={9} textAnchor="end">0</text>
          <text x={pl - 4} y={toY(0.5) + 3} fill={sv.text} fontSize={9} textAnchor="end">0.5</text>
          <text x={pl - 4} y={toY(1) + 3} fill={sv.text} fontSize={9} textAnchor="end">1.0</text>
          <text x={W / 2} y={H - 2} fill={sv.text} fontSize={9} textAnchor="middle">
            {'Tests (green dots = true effects)'}
          </text>
          <text x={pl} y={pt - 8} fill={sv.text} fontSize={9}>p-value</text>

          {/* Legend */}
          <rect x={W - pr - 120} y={pt - 8} width={10} height={10} rx={2} fill={colors.emerald} opacity={0.8} />
          <text x={W - pr - 106} y={pt} fill={sv.text} fontSize={9}>True Positive</text>
          <rect x={W - pr - 120} y={pt + 6} width={10} height={10} rx={2} fill={colors.red} opacity={0.8} />
          <text x={W - pr - 106} y={pt + 14} fill={sv.text} fontSize={9}>False Positive</text>
        </svg>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox label="True Positives" value={data.tp} color={colors.emerald} />
        <StatBox label="False Positives" value={data.fp} color={colors.red} />
        <StatBox label="FWER" value={data.fwer ? 'Yes' : 'No'} color={data.fwer ? colors.red : colors.emerald} />
        <StatBox label="FDR" value={(data.fdr * 100).toFixed(0) + '%'} color={data.fdr > 0.05 ? colors.red : colors.emerald} />
      </div>

      <Sl label="Number of Tests" value={nTests} min={1} max={50} step={1} onChange={setNTests} color={colors.indigo} />
      <Sl label="True Effects" value={trueEffects} min={0} max={Math.min(10, nTests)} step={1} onChange={setTrueEffects} color={colors.emerald} />

      <div className="flex gap-2 mb-4 flex-wrap">
        <PillBtn on={correction === 'none'} onClick={() => setCorrection('none')}>No Correction</PillBtn>
        <PillBtn on={correction === 'bonferroni'} onClick={() => setCorrection('bonferroni')}>Bonferroni</PillBtn>
        <PillBtn on={correction === 'bh'} onClick={() => setCorrection('bh')}>BH-FDR</PillBtn>
        <PillBtn on={false} onClick={() => setSeed((s) => s + 1)}>Re-simulate</PillBtn>
      </div>

      <QA
        items={[
          {
            q: 'We tested 10 metrics and 2 were significant — great, right?',
            a: "Maybe not. With 10 tests at α=0.05, you'd expect ~0.5 false positives by chance. Two significant results could easily include one or more false positives. Apply Bonferroni or BH correction and re-check which survive.",
          },
          {
            q: 'What is the Bonferroni correction?',
            a: "The simplest approach: divide your significance threshold by the number of tests. Testing 20 metrics? Use α = 0.05/20 = 0.0025. It's conservative (may miss real effects) but guarantees the family-wise error rate stays below 5%.",
          },
        ]}
      />
      <TechNote>
        Bonferroni controls FWER (probability of ANY false positive) — conservative for many tests.
        Benjamini-Hochberg controls FDR (expected proportion of false positives among discoveries) —
        more powerful but allows some false positives. Choose based on cost of false positives vs
        false negatives.
      </TechNote>
      <Insight>
        The multiple testing problem is everywhere: dashboards with many metrics, feature flags with
        multiple variants, post-hoc segmentation analysis. If you looked at 20 things and report
        only the significant ones, you're doing exactly what this module warns about.
      </Insight>
    </div>
  );
}
