import { useState, useMemo, useCallback } from 'react';
import { sR, nCDF, bonferroni, benjaminiHochberg } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, PillBtn, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const paramDefaults = { nTests: 20, trueEffects: 3, correction: 'none' };

export default function M16MultipleTesting() {
  const [p, set] = useAnimatedParams(paramDefaults);
  const { nTests, trueEffects, correction } = p;
  const setNTests = (v) => set('nTests', v);
  const setTrueEffects = (v) => set('trueEffects', v);
  const setCorrection = (v) => set('correction', v);
  const [seed, setSeed] = useState(1);
  const alpha = 0.05;

  const data = useMemo(() => {
    const pValues = [];
    const isTrue = [];

    for (let i = 0; i < nTests; i++) {
      const hasEffect = i < trueEffects;
      isTrue.push(hasEffect);
      if (hasEffect) {
        const z = 2.5 + (sR(i * 37 + seed * 71) - 0.5) * 2;
        pValues.push(2 * (1 - nCDF(Math.abs(z), 0, 1)));
      } else {
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

  // ── Sorted visualization data (sorted by p-value, smallest first) ──
  const sorted = useMemo(() => {
    return data.pValues
      .map((p, i) => ({
        p,
        i,
        isTrue: data.isTrue[i],
        sig: data.significant[i],
        wouldBeSig: p < alpha,
      }))
      .sort((a, b) => a.p - b.p);
  }, [data]);

  // ── Chart layout (-log₁₀ scale: tall bars = more significant) ──
  const W = 600, H = 280, pl = 52, pr = 20, pt = 24, pb = 44;
  const negLogAlpha = -Math.log10(alpha);
  const negLogThresh = -Math.log10(Math.max(data.threshold, 1e-10));
  const maxNLP = Math.max(
    ...sorted.map((s) => -Math.log10(Math.max(s.p, 1e-8))),
    correction === 'bonferroni' ? negLogThresh + 0.5 : negLogAlpha + 0.5,
    negLogAlpha + 1.5
  );
  const yMax = Math.ceil(maxNLP);
  const barW = Math.max(4, Math.min(16, (W - pl - pr) / sorted.length - 2));
  const toX = (rank) => pl + ((rank + 0.5) / sorted.length) * (W - pl - pr);
  const toY = (nlp) => H - pb - (nlp / yMax) * (H - pt - pb);

  const fpPrevented = correction !== 'none'
    ? sorted.filter((s) => s.wouldBeSig && !s.sig && !s.isTrue).length
    : 0;

  const tooltipLookup = useCallback((vbX) => {
    if (vbX < pl || vbX > W - pr) return null;
    const rank = Math.floor(((vbX - pl) / (W - pl - pr)) * sorted.length);
    const idx = Math.max(0, Math.min(sorted.length - 1, rank));
    const s = sorted[idx];
    if (!s) return null;
    const nlp = -Math.log10(Math.max(s.p, 1e-8));
    const cx = pl + ((idx + 0.5) / sorted.length) * (W - pl - pr);
    const cy = H - pb - (nlp / yMax) * (H - pt - pb);
    const barColorVal = s.sig
      ? (s.isTrue ? colors.emerald : colors.red)
      : sv.textFaint;
    return {
      x: cx,
      y: cy,
      lines: [
        { label: 'p-value', value: s.p < 0.0001 ? '<0.0001' : s.p.toFixed(4), color: barColorVal },
        { label: 'Status', value: s.sig ? (s.isTrue ? 'True Positive' : 'False Positive') : 'Not Sig.', color: barColorVal },
        { label: 'True Effect', value: s.isTrue ? 'Yes' : 'No', color: s.isTrue ? colors.emerald : sv.textFaint },
      ],
      markers: [{ y: cy, color: barColorVal }],
    };
  }, [sorted, yMax]);

  return (
    <div>
      <Hdr sub="Analyze">Multiple Testing & Corrections</Hdr>
      <Desc>
        Test 20 metrics and on average 1 will be "significant" by pure chance alone. The more tests
        you run, the more false positives you collect. Correction methods raise the significance bar —
        demanding stronger evidence to account for multiple comparisons.
      </Desc>

      <Sl label="Number of Tests" value={nTests} min={1} max={50} step={1} onChange={setNTests} color={colors.indigo} />
      <Sl label="True Effects" value={trueEffects} min={0} max={Math.min(10, nTests)} step={1} onChange={setTrueEffects} color={colors.emerald} />

      <div className="flex gap-2 mb-5 flex-wrap">
        <PillBtn on={correction === 'none'} onClick={() => setCorrection('none')}>No Correction</PillBtn>
        <PillBtn on={correction === 'bonferroni'} onClick={() => setCorrection('bonferroni')}>Bonferroni</PillBtn>
        <PillBtn on={correction === 'bh'} onClick={() => setCorrection('bh')}>BH-FDR</PillBtn>
        <PillBtn on={false} onClick={() => setSeed((s) => s + 1)}>Re-simulate</PillBtn>
      </div>

      <ChartBox h={H} label="Multiple testing results showing p-values sorted by significance with correction thresholds" tooltipLookup={tooltipLookup}>
          {/* Y-axis gridlines with p-value labels */}
          {Array.from({ length: yMax }, (_, k) => k + 1).map((v) => (
            <g key={v}>
              <line x1={pl} y1={toY(v)} x2={W - pr} y2={toY(v)} stroke={sv.grid} />
              <text x={pl - 6} y={toY(v) + 3} fill={sv.textFaint} fontSize={8} textAnchor="end">
                {'p = ' + (1 / Math.pow(10, v)).toFixed(Math.min(v, 4))}
              </text>
            </g>
          ))}

          {/* Original α reference line (shown when correction is active) */}
          {correction !== 'none' && (
            <>
              <line x1={pl} y1={toY(negLogAlpha)} x2={W - pr} y2={toY(negLogAlpha)}
                stroke={sv.textFaint} strokeWidth={1} strokeDasharray="4,3" opacity={0.4} />
              <text x={W - pr + 2} y={toY(negLogAlpha) + 3} fill={sv.textFaint} fontSize={8} opacity={0.6}>
                Original α = 0.05
              </text>
            </>
          )}

          {/* Active threshold line */}
          {correction !== 'bh' && (
            <>
              <line
                x1={pl} y1={toY(correction === 'bonferroni' ? negLogThresh : negLogAlpha)}
                x2={W - pr} y2={toY(correction === 'bonferroni' ? negLogThresh : negLogAlpha)}
                stroke={colors.amber} strokeWidth={2} strokeDasharray="8,4"
              />
              <text
                x={pl + 4} y={toY(correction === 'bonferroni' ? negLogThresh : negLogAlpha) - 6}
                fill={colors.amber} fontSize={9} fontWeight="600"
              >
                {correction === 'bonferroni'
                  ? 'Bonferroni: α/' + nTests + ' = ' + data.threshold.toFixed(4)
                  : 'Significance threshold: α = ' + alpha}
              </text>
            </>
          )}

          {/* BH stepped threshold */}
          {correction === 'bh' && (() => {
            let bhPath = '';
            for (let k = 0; k < sorted.length; k++) {
              const thr = -Math.log10(((k + 1) / nTests) * alpha);
              const x0 = pl + (k / sorted.length) * (W - pl - pr);
              const x1 = pl + ((k + 1) / sorted.length) * (W - pl - pr);
              bhPath += (k === 0 ? 'M' : 'L') + x0 + ',' + toY(thr) + 'L' + x1 + ',' + toY(thr);
            }
            return (
              <>
                <path d={bhPath} fill="none" stroke={colors.amber} strokeWidth={2} strokeDasharray="6,3" />
                <text x={pl + 4} y={toY(-Math.log10(alpha / nTests)) - 6} fill={colors.amber} fontSize={9} fontWeight="600">
                  BH stepped threshold
                </text>
              </>
            );
          })()}

          {/* Bars (sorted by p-value, tallest = most significant on left) */}
          {sorted.map((s, rank) => {
            const nlp = -Math.log10(Math.max(s.p, 1e-8));
            const barH = Math.max(1, toY(0) - toY(nlp));
            let barColor, barOpacity;
            if (s.sig) {
              barColor = s.isTrue ? colors.emerald : colors.red;
              barOpacity = 0.85;
            } else if (s.wouldBeSig && correction !== 'none') {
              barColor = s.isTrue ? colors.emerald : colors.red;
              barOpacity = 0.25;
            } else {
              barColor = sv.textFaint;
              barOpacity = 0.2;
            }

            return (
              <g key={s.i}>
                <rect
                  x={toX(rank) - barW / 2}
                  y={toY(nlp)}
                  width={barW}
                  height={barH}
                  rx={2}
                  fill={barColor}
                  opacity={barOpacity}
                />
                {/* Dashed outline for bars caught by correction */}
                {!s.sig && s.wouldBeSig && correction !== 'none' && (
                  <rect
                    x={toX(rank) - barW / 2 - 1}
                    y={toY(nlp) - 1}
                    width={barW + 2}
                    height={barH + 2}
                    rx={3}
                    fill="none"
                    stroke={s.isTrue ? colors.amber : colors.red}
                    strokeWidth={1}
                    strokeDasharray="3,2"
                    opacity={0.5}
                  />
                )}
                {/* Solid outline for significant false positives */}
                {s.sig && !s.isTrue && (
                  <rect
                    x={toX(rank) - barW / 2 - 1}
                    y={toY(nlp) - 1}
                    width={barW + 2}
                    height={barH + 2}
                    rx={3}
                    fill="none"
                    stroke={colors.red}
                    strokeWidth={1.5}
                  />
                )}
                {/* True effect indicator below x-axis */}
                {s.isTrue && (
                  <circle cx={toX(rank)} cy={H - pb + 12} r={3} fill={colors.emerald} opacity={0.7} />
                )}
              </g>
            );
          })}

          {/* Axes */}
          <line x1={pl} y1={pt} x2={pl} y2={H - pb} stroke={sv.axis} />
          <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />

          {/* Axis labels */}
          <text x={W / 2} y={H - 4} fill={sv.textFaint} fontSize={9} textAnchor="middle">
            Tests sorted by p-value (most significant → least) · green dots = true effects
          </text>
          <text x={14} y={(H - pt - pb) / 2 + pt} fill={sv.textFaint} fontSize={9} textAnchor="middle"
            transform={'rotate(-90,14,' + ((H - pt - pb) / 2 + pt) + ')'}>
            ← More significant
          </text>

          {/* Summary annotation */}
          <text x={W - pr} y={pt - 4} fill={sv.text} fontSize={10} textAnchor="end" fontWeight="600">
            {data.tp + data.fp > 0
              ? (data.tp + data.fp) + ' significant: ' + data.tp + ' true, ' + data.fp + ' false'
              : 'No significant results'}
          </text>
      </ChartBox>

        {/* Legend below chart */}
        <div className="flex items-center justify-end gap-4 mt-2 mb-5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colors.emerald, opacity: 0.8 }} />
            <span className="text-[11px]" style={{ color: sv.text }}>True Positive</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colors.red, opacity: 0.8 }} />
            <span className="text-[11px]" style={{ color: sv.text }}>False Positive</span>
          </span>
          {correction !== 'none' && fpPrevented > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm border border-dashed" style={{ borderColor: colors.red, opacity: 0.6 }} />
              <span className="text-[11px]" style={{ color: sv.text }}>Caught by correction</span>
            </span>
          )}
        </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox label="True Positives" value={data.tp} color={colors.emerald} />
        <StatBox label="False Positives" value={data.fp} color={colors.red} />
        <StatBox label="FWER" value={data.fwer ? 'Yes' : 'No'} color={data.fwer ? colors.red : colors.emerald} />
        <StatBox label="FDR" value={(data.fdr * 100).toFixed(0) + '%'} color={data.fdr > 0.05 ? colors.red : colors.emerald} />
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
