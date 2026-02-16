import { useState, useMemo } from 'react';
import { betaPDF, nPDF, nCDF, zInv } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';

const priors = {
  uninformative: { label: 'Uninformative', a: 1, b: 1 },
  weak: { label: 'Weak (α=2, β=8)', a: 2, b: 8 },
  strong: { label: 'Strong (α=20, β=80)', a: 20, b: 80 },
};

export default function M4BayesianFrequentist() {
  const [priorKey, setPriorKey] = useState('uninformative');
  const [observed, setObserved] = useState(100);
  const trueRate = 0.25;

  const data = useMemo(() => {
    const prior = priors[priorKey];
    const successes = Math.round(observed * trueRate);
    const failures = observed - successes;

    // Posterior: Beta(a + successes, b + failures)
    const postA = prior.a + successes;
    const postB = prior.b + failures;
    const postMean = postA / (postA + postB);
    const postVar = (postA * postB) / ((postA + postB) ** 2 * (postA + postB + 1));
    const postSD = Math.sqrt(postVar);

    // Frequentist: point estimate + CI
    const pHat = successes / observed;
    const se = Math.sqrt((pHat * (1 - pHat)) / observed);
    const z = zInv(0.05);
    const freqCI = [pHat - z * se, pHat + z * se];

    // Bayesian credible interval (approximate from beta quantiles via normal approx)
    const bayesCI = [postMean - 1.96 * postSD, postMean + 1.96 * postSD];

    return { prior, postA, postB, postMean, postSD, pHat, se, freqCI, bayesCI, successes, failures };
  }, [priorKey, observed]);

  // Bayesian panel
  const W = 280, H = 180, pl = 8, pr = 8, pt = 20, pb = 24;
  const xMin = 0, xMax = 0.6;
  const toX = (v) => pl + ((v - xMin) / (xMax - xMin)) * (W - pl - pr);
  const priorPts = [], postPts = [];
  let maxY = 0;
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    const yPr = betaPDF(x, data.prior.a, data.prior.b);
    const yPo = betaPDF(x, data.postA, data.postB);
    maxY = Math.max(maxY, yPr, yPo);
    priorPts.push({ x, yPr, yPo });
  }
  const toY = (v) => H - pb - (v / (maxY || 1)) * (H - pt - pb);
  let priorPath = '', postPath = '', postArea = '';
  priorPts.forEach((p, i) => {
    priorPath += (i === 0 ? 'M' : 'L') + toX(p.x) + ',' + toY(p.yPr);
    postPath += (i === 0 ? 'M' : 'L') + toX(p.x) + ',' + toY(p.yPo);
    if (i === 0) postArea = 'M' + toX(p.x) + ',' + toY(0);
    postArea += 'L' + toX(p.x) + ',' + toY(p.yPo);
  });
  postArea += 'L' + toX(xMax) + ',' + toY(0) + 'Z';

  // Frequentist panel
  const fW = 280, fH = 180;
  const fToX = (v) => pl + ((v - xMin) / (xMax - xMin)) * (fW - pl - pr);
  const fse = data.se || 0.05;
  let fMaxY = 0;
  const fPts = [];
  for (let i = 0; i <= 200; i++) {
    const x = xMin + (i / 200) * (xMax - xMin);
    const y = nPDF(x, data.pHat, fse);
    fMaxY = Math.max(fMaxY, y);
    fPts.push({ x, y });
  }
  const fToY = (v) => fH - pb - (v / (fMaxY || 1)) * (fH - pt - pb);
  let fPath = '', fArea = '';
  fPts.forEach((p, i) => {
    fPath += (i === 0 ? 'M' : 'L') + fToX(p.x) + ',' + fToY(p.y);
    if (i === 0) fArea = 'M' + fToX(p.x) + ',' + fToY(0);
    fArea += 'L' + fToX(p.x) + ',' + fToY(p.y);
  });
  fArea += 'L' + fToX(xMax) + ',' + fToY(0) + 'Z';

  // Significance
  const zStat = (data.pHat - 0.2) / (data.se || 0.001);
  const pVal = 2 * (1 - nCDF(Math.abs(zStat), 0, 1));
  const sig = pVal < 0.05;

  return (
    <div>
      <Hdr sub="Foundations">Bayesian vs Frequentist</Hdr>
      <Desc>
        Two philosophies, one question. Frequentists ask "how surprising is this data if H0 is true?"
        Bayesians ask "given this data, what do I believe now?" Watch how prior beliefs and data
        combine to form the posterior — and how it converges with the frequentist answer as data grows.
      </Desc>

      <div className="flex gap-4 flex-wrap mb-5">
        {/* Bayesian panel */}
        <div className="flex-1 min-w-[260px] bg-app-surface rounded-2xl p-6 ring-1 ring-[var(--color-border-subtle)]">
          <div className="text-[11px] text-[var(--svg-text)] uppercase tracking-widest mb-2 font-bold text-center">Bayesian</div>
          <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ maxHeight: H, display: 'block', overflow: 'visible' }}>
            <path d={postArea} fill={sv.fillIndigo} />
            <path d={priorPath} fill="none" stroke={sv.text} strokeWidth={1.5} strokeDasharray="5,3" />
            <path d={postPath} fill="none" stroke={colors.indigo} strokeWidth={2.5} />
            <line x1={toX(data.postMean)} y1={pt} x2={toX(data.postMean)} y2={H - pb} stroke={colors.indigo} strokeWidth={1} strokeDasharray="3,3" />
            <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />
            {[0, 0.1, 0.2, 0.3, 0.4, 0.5].map((v) => (
              <text key={v} x={toX(v)} y={H - pb + 12} fill={sv.text} fontSize={8} textAnchor="middle">{v}</text>
            ))}
            <text x={pl + 4} y={pt - 4} fill={sv.text} fontSize={8}>Prior (dashed)</text>
            <text x={W - pr - 4} y={pt - 4} fill={colors.indigo} fontSize={8} textAnchor="end" fontWeight="600">Posterior</text>
          </svg>
          <div className="text-center mt-2">
            <span className="text-xs text-[var(--svg-text)]">Posterior mean: </span>
            <span className="text-sm font-bold font-mono" style={{ color: colors.indigo }}>{data.postMean.toFixed(3)}</span>
            <span className="text-xs text-[var(--svg-text)] ml-3">95% credible: </span>
            <span className="text-xs font-mono text-[var(--svg-text)]">[{data.bayesCI[0].toFixed(3)}, {data.bayesCI[1].toFixed(3)}]</span>
          </div>
        </div>

        {/* Frequentist panel */}
        <div className="flex-1 min-w-[260px] bg-app-surface rounded-2xl p-6 ring-1 ring-[var(--color-border-subtle)]">
          <div className="text-[11px] text-[var(--svg-text)] uppercase tracking-widest mb-2 font-bold text-center">Frequentist</div>
          <svg viewBox={'0 0 ' + fW + ' ' + fH} width="100%" style={{ maxHeight: fH, display: 'block', overflow: 'visible' }}>
            <path d={fArea} fill={sv.fillEmerald} />
            <path d={fPath} fill="none" stroke={colors.emerald} strokeWidth={2.5} />
            <line x1={fToX(data.pHat)} y1={pt} x2={fToX(data.pHat)} y2={fH - pb} stroke={colors.emerald} strokeWidth={1} strokeDasharray="3,3" />

            {/* CI bar */}
            <line x1={fToX(data.freqCI[0])} y1={fH - pb - 10} x2={fToX(data.freqCI[1])} y2={fH - pb - 10} stroke={colors.emerald} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
            <circle cx={fToX(data.pHat)} cy={fH - pb - 10} r={3} fill={colors.emerald} />

            <line x1={pl} y1={fH - pb} x2={fW - pr} y2={fH - pb} stroke={sv.axis} />
            {[0, 0.1, 0.2, 0.3, 0.4, 0.5].map((v) => (
              <text key={v} x={fToX(v)} y={fH - pb + 12} fill={sv.text} fontSize={8} textAnchor="middle">{v}</text>
            ))}
            <text x={fW - pr - 4} y={pt - 4} fill={colors.emerald} fontSize={8} textAnchor="end" fontWeight="600">Sampling Distribution</text>
          </svg>
          <div className="text-center mt-2">
            <span className="text-xs text-[var(--svg-text)]">Point estimate: </span>
            <span className="text-sm font-bold font-mono" style={{ color: colors.emerald }}>{data.pHat.toFixed(3)}</span>
            <span className="text-xs text-[var(--svg-text)] ml-3">95% CI: </span>
            <span className="text-xs font-mono text-[var(--svg-text)]">[{data.freqCI[0].toFixed(3)}, {data.freqCI[1].toFixed(3)}]</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox label="Posterior Mean" value={data.postMean.toFixed(3)} color={colors.indigo} />
        <StatBox label="Freq. Estimate" value={data.pHat.toFixed(3)} color={colors.emerald} />
        <StatBox label="P-value (H0: p=0.2)" value={pVal < 0.0001 ? '< 0.0001' : pVal.toFixed(4)} color={sig ? colors.emerald : sv.textFaint} />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(priors).map(([key, p]) => (
          <PillBtn key={key} on={priorKey === key} onClick={() => setPriorKey(key)}>
            {p.label}
          </PillBtn>
        ))}
      </div>

      <Sl label="Observed Data (n)" value={observed} min={10} max={1000} step={10} onChange={setObserved} fmt={(v) => v + ' observations'} color={colors.indigo} />

      <QA
        items={[
          {
            q: 'Which approach is "right"?',
            a: "Both are mathematically valid — they answer different questions. Frequentist: 'How often would I be wrong using this procedure?' Bayesian: 'What should I believe given this data and prior knowledge?' With enough data, they converge to the same answer.",
          },
          {
            q: "Isn't choosing a prior subjective?",
            a: "Yes, but that's a feature, not a bug. Priors encode domain knowledge (e.g., 'conversion rates are usually 1-10%'). With weak or uninformative priors, the data dominates anyway. Strong priors require justification but can improve estimates in small samples.",
          },
        ]}
      />
      <TechNote>
        The beta-binomial model is conjugate: Beta(α,β) prior + Binomial data → Beta(α+s, β+f)
        posterior. This is exact, not an approximation. The posterior mean is a weighted average
        of the prior mean and the MLE, with weights proportional to the effective sample sizes.
      </TechNote>
      <Insight>
        With enough data, the prior doesn't matter — the posterior converges to the true value
        regardless of where you started. This is why the Bayesian vs Frequentist debate matters
        less in practice than in philosophy: both work well with sufficient data.
      </Insight>
    </div>
  );
}
