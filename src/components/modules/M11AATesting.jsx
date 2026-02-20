import { useState, useMemo, useCallback } from 'react';
import { sR, nCDF } from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const paramDefaults = { nSims: 500, alpha: 0.05 };

export default function M11AATesting() {
  const [p, set] = useAnimatedParams(paramDefaults);
  const { nSims, alpha } = p;
  const setNSims = (v) => set('nSims', v);
  const setAlpha = (v) => set('alpha', v);
  const [seed, setSeed] = useState(1);

  const data = useMemo(() => {
    const nBins = 20;
    const binWidth = 1 / nBins;
    const bins = new Array(nBins).fill(0);
    let falsePositives = 0;

    // Generate uniform p-values (A/A test: both groups identical)
    for (let i = 0; i < nSims; i++) {
      const pValue = sR(seed * 1000 + i * 71 + 200);
      const binIdx = Math.min(Math.floor(pValue / binWidth), nBins - 1);
      bins[binIdx]++;
      if (pValue < alpha) falsePositives++;
    }

    const expectedPerBin = nSims / nBins;
    const observedFPR = falsePositives / nSims;

    // Chi-square uniformity test
    let chiSq = 0;
    for (let b = 0; b < nBins; b++) {
      chiSq += Math.pow(bins[b] - expectedPerBin, 2) / expectedPerBin;
    }
    // Wilson-Hilferty approximation for chi-sq CDF with df=19
    const df = nBins - 1;
    const chiPValue = 1 - nCDF(Math.sqrt(2 * chiSq) - Math.sqrt(2 * df - 1), 0, 1);

    return { bins, expectedPerBin, falsePositives, observedFPR, chiSq, chiPValue };
  }, [nSims, alpha, seed]);

  const W = 600, H = 240, pl = 44, pr = 20, pt = 20, pb = 36;
  const nBins = 20;
  const binWidth = 1 / nBins;
  const maxCount = Math.max(...data.bins, data.expectedPerBin * 1.5);
  const barGap = 2;
  const totalBarArea = W - pl - pr;
  const barW = (totalBarArea - barGap * (nBins - 1)) / nBins;

  const toX = (binIdx) => pl + binIdx * (barW + barGap);
  const toY = (count) => H - pb - (count / maxCount) * (H - pt - pb);

  const tooltipLookup = useCallback((vbX) => {
    if (vbX < pl || vbX > W - pr) return null;
    const bIdx = Math.floor((vbX - pl) / (barW + barGap));
    if (bIdx < 0 || bIdx >= nBins) return null;
    const count = data.bins[bIdx];
    const binStart = bIdx * binWidth;
    const isBelow = binStart + binWidth <= alpha + 1e-9;
    const cx = pl + bIdx * (barW + barGap) + barW / 2;
    const cy = H - pb - (count / maxCount) * (H - pt - pb);
    return {
      x: cx,
      y: cy,
      lines: [
        { label: 'p-value', value: binStart.toFixed(2) + '\u2013' + (binStart + binWidth).toFixed(2), color: isBelow ? colors.red : colors.indigo },
        { label: 'Count', value: count.toString(), color: isBelow ? colors.red : colors.indigo },
      ],
      markers: [{ y: cy, color: isBelow ? colors.red : colors.indigo }],
    };
  }, [data.bins, alpha, barW, barGap, maxCount]);

  return (
    <div>
      <Hdr sub="Validate & Run">A/A Testing</Hdr>
      <Desc>
        An A/A test compares two identical groups — there is no real effect. If your testing
        framework is working correctly, p-values should be uniformly distributed and only ~alpha%
        of tests should appear "significant." This is the sanity check before running real experiments.
      </Desc>

      <ChartBox h={H} label="A/A test results showing distribution of p-values across simulated tests to verify the testing system produces expected false positive rates" tooltipLookup={tooltipLookup}>
        {/* Expected frequency dashed line */}
        <line
          x1={pl}
          y1={toY(data.expectedPerBin)}
          x2={W - pr}
          y2={toY(data.expectedPerBin)}
          stroke={colors.amber}
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />
        <text
          x={W - pr}
          y={toY(data.expectedPerBin) - 5}
          fill={colors.amber}
          fontSize={9}
          textAnchor="end"
          fontWeight="600"
        >
          {'Expected = ' + data.expectedPerBin.toFixed(1)}
        </text>

        {/* Alpha threshold vertical line */}
        {(() => {
          const alphaX = pl + (alpha / 1) * totalBarArea;
          return (
            <>
              <line
                x1={alphaX}
                y1={pt}
                x2={alphaX}
                y2={H - pb}
                stroke={colors.red}
                strokeWidth={1.5}
                strokeDasharray="4,3"
                opacity={0.6}
              />
              <text
                x={alphaX + 4}
                y={pt + 10}
                fill={colors.red}
                fontSize={9}
                fontWeight="600"
                opacity={0.8}
              >
                {'\u03B1 = ' + alpha.toFixed(2)}
              </text>
            </>
          );
        })()}

        {/* Histogram bars */}
        {data.bins.map((count, i) => {
          const binStart = i * binWidth;
          const isBelow = binStart + binWidth <= alpha + 1e-9;
          const barColor = isBelow ? colors.red : colors.indigo;
          const barOpacity = isBelow ? 0.75 : 0.5;
          const barHeight = Math.max(1, (H - pt - pb) * (count / maxCount));
          return (
            <g key={i}>
              <rect
                x={toX(i)}
                y={H - pb - barHeight}
                width={barW}
                height={barHeight}
                rx={2}
                fill={barColor}
                opacity={barOpacity}
              />
              {/* Count label on taller bars */}
              {count > 0 && (
                <text
                  x={toX(i) + barW / 2}
                  y={H - pb - barHeight - 4}
                  fill={isBelow ? colors.red : sv.text}
                  fontSize={8}
                  textAnchor="middle"
                  fontWeight={isBelow ? '700' : '400'}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}

        {/* X-axis */}
        <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke={sv.axis} />
        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
          <text
            key={v}
            x={pl + v * totalBarArea}
            y={H - pb + 14}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {v.toFixed(1)}
          </text>
        ))}
        <text x={pl + totalBarArea / 2} y={H - 2} fill={sv.text} fontSize={9} textAnchor="middle">
          p-value
        </text>

        {/* Y-axis label */}
        <text x={pl - 4} y={pt + 4} fill={sv.text} fontSize={9} textAnchor="end">
          Count
        </text>
        {/* Y-axis ticks */}
        {[0, Math.round(maxCount / 2), Math.round(maxCount)].map((v) => (
          <text
            key={v}
            x={pl - 6}
            y={toY(v) + 3}
            fill={sv.text}
            fontSize={8}
            textAnchor="end"
          >
            {v}
          </text>
        ))}

        {/* Legend */}
        <rect x={W - pr - 130} y={pt} width={10} height={10} rx={2} fill={colors.red} opacity={0.75} />
        <text x={W - pr - 116} y={pt + 9} fill={sv.text} fontSize={9}>False Positives</text>
        <rect x={W - pr - 130} y={pt + 16} width={10} height={10} rx={2} fill={colors.indigo} opacity={0.5} />
        <text x={W - pr - 116} y={pt + 25} fill={sv.text} fontSize={9}>Not Significant</text>
      </ChartBox>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox
          label="Observed FP Rate"
          value={(data.observedFPR * 100).toFixed(1) + '%'}
          color={Math.abs(data.observedFPR - alpha) > alpha * 0.5 ? colors.amber : colors.emerald}
        />
        <StatBox
          label="Expected Rate"
          value={(alpha * 100).toFixed(1) + '%'}
          color={colors.indigo}
        />
        <StatBox
          label="Uniformity p-value"
          value={data.chiPValue < 0.001 ? '< 0.001' : data.chiPValue.toFixed(3)}
          color={data.chiPValue < 0.05 ? colors.red : colors.emerald}
        />
      </div>

      <Sl
        label="Number of Simulations"
        value={nSims}
        min={100}
        max={2000}
        step={100}
        onChange={setNSims}
        color={colors.indigo}
      />
      <Sl
        label="Alpha Level"
        value={alpha}
        min={0.01}
        max={0.20}
        step={0.01}
        onChange={setAlpha}
        fmt={(v) => v.toFixed(2)}
        color={colors.amber}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <PillBtn on={false} onClick={() => setSeed((s) => s + 1)}>Re-simulate</PillBtn>
      </div>

      <QA
        items={[
          {
            q: 'We ran an A/A test and got a significant result — is the tool broken?',
            a: "Not necessarily. Even with identical groups, you expect ~5% of tests to appear significant at \u03B1=0.05. That is exactly what the false positive rate controls. One significant A/A result is normal. But if your false positive rate is consistently much higher than alpha, your randomization, logging, or statistical test may have a problem.",
          },
          {
            q: 'How many A/A simulations do I need to trust the result?',
            a: "More is better. With 100 simulations you will see noisy estimates of the false positive rate. At 500+ you get a reasonably stable picture. At 1000+ you can confidently assess whether your observed FP rate matches alpha. The histogram should look approximately flat — any strong pattern signals trouble.",
          },
          {
            q: 'The histogram is not perfectly flat. Is something wrong?',
            a: "Random variation means the histogram will never be perfectly flat — just approximately so. The chi-square uniformity test gives you a formal answer: if that p-value is above 0.05, the deviation from uniform is within expected random noise. If it is below 0.05, the distribution may genuinely not be uniform, which warrants investigation.",
          },
        ]}
      />
      <TechNote>
        Under the null hypothesis (no true difference), p-values follow a Uniform(0,1) distribution.
        The chi-square goodness-of-fit test checks this by comparing observed bin counts to the
        expected count (nSims/20). The test statistic uses df=19 (20 bins minus 1). The p-value is
        approximated via the Wilson-Hilferty normal approximation to the chi-square CDF.
      </TechNote>
      <Insight>
        A/A tests are the immune system of experimentation. Run them before every major experiment to
        confirm your pipeline, randomization, and metrics are healthy. If identical groups show a
        "significant" difference more than alpha% of the time, your real A/B test results cannot be
        trusted — you are measuring noise, not signal.
      </Insight>
    </div>
  );
}
