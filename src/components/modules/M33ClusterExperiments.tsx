import { useMemo, useCallback } from 'react';
import {
  nCDF,
  zInv,
  designEffect,
  clusterAdjustedN,
  clusterAdjustedSE,
  switchbackPower,
} from '../../utils/math';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const designs: Record<string, { label: string; desc: string }> = {
  cluster: { label: 'Cluster RCT', desc: 'Randomize clusters to treatment/control' },
  switchback: { label: 'Switchback', desc: 'Alternate treatment across time periods' },
  stepped: { label: 'Stepped Wedge', desc: 'Gradually roll out treatment to all clusters' },
};

const defaults = { designKey: 'cluster', nClusters: 20, clusterSize: 50, icc: 5, effectSize: 30 };

export default function M33ClusterExperiments() {
  const [p, set] = useAnimatedParams(defaults);
  const { designKey, nClusters, clusterSize, icc, effectSize } = p;
  const setDesignKey = (v: string) => set('designKey', v);
  const setNClusters = (v: number) => set('nClusters', v);
  const setClusterSize = (v: number) => set('clusterSize', v);
  const setICC = (v: number) => set('icc', v);
  const setEffectSize = (v: number) => set('effectSize', v);

  const computed = useMemo(() => {
    const iccVal = (icc as number) / 100;
    const effVal = (effectSize as number) / 100;
    const nc = Math.round(nClusters as number);
    const cs = Math.round(clusterSize as number);
    const totalN = nc * cs;
    const deff = designEffect(iccVal, cs);
    const effN = clusterAdjustedN(totalN, iccVal, cs);
    const baseSE = 1 / Math.sqrt(totalN / 2);
    const adjSE = clusterAdjustedSE(baseSE, iccVal, cs);
    const userPower = nCDF(effVal / baseSE - zInv(0.05), 0, 1);
    const clusterPower = switchbackPower(cs, nc, effVal, iccVal);

    // Find minimum clusters for 80% power
    let minClusters = nc;
    for (let c = 2; c <= 500; c += 2) {
      const pw = switchbackPower(cs, c, effVal, iccVal);
      if (pw >= 0.8) {
        minClusters = c;
        break;
      }
      if (c >= 500) {
        minClusters = 500;
      }
    }

    // Power curves for varying total sample size
    const maxTotalN = totalN * 3;
    const curveSteps = 80;
    const userCurve: { n: number; pw: number }[] = [];
    const clusterCurve: { n: number; pw: number }[] = [];

    for (let i = 0; i <= curveSteps; i++) {
      const sampleN = 100 + (i / curveSteps) * (maxTotalN - 100);
      const se = 1 / Math.sqrt(sampleN / 2);
      const pwUser = nCDF(effVal / se - zInv(0.05), 0, 1);
      userCurve.push({ n: sampleN, pw: Math.min(pwUser, 1) });

      // Cluster power: distribute sampleN across clusters of size cs
      const effClusters = Math.max(2, Math.round(sampleN / cs));
      const pwCluster = switchbackPower(cs, effClusters, effVal, iccVal);
      clusterCurve.push({ n: sampleN, pw: Math.min(pwCluster, 1) });
    }

    // Find N for 80% power for each curve
    const userN80 = userCurve.find((pt) => pt.pw >= 0.8);
    const clusterN80 = clusterCurve.find((pt) => pt.pw >= 0.8);

    return {
      iccVal,
      effVal,
      totalN,
      deff,
      effN,
      baseSE,
      adjSE,
      userPower,
      clusterPower,
      minClusters,
      userCurve,
      clusterCurve,
      userN80,
      clusterN80,
      maxTotalN,
      nc,
      cs,
    };
  }, [nClusters, clusterSize, icc, effectSize]);

  // ── Chart 1: Cluster Grid / Timeline ──
  const G_W = 600,
    G_H = 220;
  const gpl = 72,
    gpr = 20,
    gpt = 28,
    gpb = 28;
  const nPeriods = 7;
  const showRows = Math.min(Math.round(computed.nc), 10);
  const cellW = (G_W - gpl - gpr) / nPeriods;
  const cellH = (G_H - gpt - gpb) / showRows;
  const cellGap = 2;

  const getColor = (row: number, col: number): string => {
    if (designKey === 'cluster') {
      return row % 2 === 0 ? colors.emerald : colors.indigo;
    } else if (designKey === 'switchback') {
      return (row + col) % 2 === 0 ? colors.emerald : colors.indigo;
    } else {
      // stepped wedge: treatment starts earlier for later rows
      const treatmentStart = nPeriods - 1 - row;
      return col >= treatmentStart ? colors.emerald : colors.indigo;
    }
  };

  // ── Chart 2: Power Curve Comparison ──
  const P_W = 600,
    P_H = 220;
  const ppl = 48,
    ppr = 20,
    ppt = 16,
    ppb = 38;
  const pcw = useMemo(() => P_W - ppl - ppr, []);
  const pch = useMemo(() => P_H - ppt - ppb, []);

  const pToX = useCallback(
    (n: number) => ppl + ((n - 100) / (computed.maxTotalN - 100)) * pcw,
    [computed.maxTotalN, pcw],
  );
  const pToY = useCallback((pw: number) => P_H - ppb - pw * pch, [pch]);

  const userLine = computed.userCurve
    .map((pt, i) => (i === 0 ? 'M' : 'L') + pToX(pt.n) + ',' + pToY(pt.pw))
    .join('');
  const clusterLine = computed.clusterCurve
    .map((pt, i) => (i === 0 ? 'M' : 'L') + pToX(pt.n) + ',' + pToY(pt.pw))
    .join('');

  // Area fill under user curve
  const userArea =
    userLine +
    'L' +
    pToX(computed.maxTotalN) +
    ',' +
    pToY(0) +
    'L' +
    pToX(100) +
    ',' +
    pToY(0) +
    'Z';

  // X-axis ticks
  const xTickCount = 5;
  const xTicks: number[] = [];
  for (let i = 0; i <= xTickCount; i++) {
    xTicks.push(Math.round(100 + (i / xTickCount) * (computed.maxTotalN - 100)));
  }

  const fmtN = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
    return n.toString();
  };

  const tooltipLookup = useCallback(
    (vbX: number) => {
      if (vbX < ppl || vbX > P_W - ppr) return null;
      const n = 100 + ((vbX - ppl) / pcw) * (computed.maxTotalN - 100);
      const closestUser = computed.userCurve.reduce((best, pt2) =>
        Math.abs(pt2.n - n) < Math.abs(best.n - n) ? pt2 : best,
      );
      const closestCluster = computed.clusterCurve.reduce((best, pt2) =>
        Math.abs(pt2.n - n) < Math.abs(best.n - n) ? pt2 : best,
      );
      return {
        x: pToX(closestUser.n),
        y: pToY(closestUser.pw),
        lines: [
          { label: 'N', value: fmtN(Math.round(closestUser.n)), color: colors.emerald },
          {
            label: 'User-level',
            value: (closestUser.pw * 100).toFixed(1) + '%',
            color: colors.emerald,
          },
          {
            label: 'Cluster-level',
            value: (closestCluster.pw * 100).toFixed(1) + '%',
            color: colors.red,
          },
        ],
        markers: [
          { y: pToY(closestUser.pw), color: colors.emerald },
          { y: pToY(closestCluster.pw), color: colors.red },
        ],
      };
    },
    [computed.userCurve, computed.clusterCurve, computed.maxTotalN, pToX, pToY, pcw],
  );

  return (
    <div>
      <Hdr sub="Design">Switchback &amp; Cluster Experiments</Hdr>
      <Desc>
        When you cannot randomize individual users — such as in marketplace experiments, logistics
        changes, or pricing tests — you randomize clusters: cities, time periods, or geographic
        regions. This dramatically reduces your effective sample size due to within-cluster
        correlation. The design effect quantifies exactly how much power you lose.
      </Desc>

      {/* Design type selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(designs).map(([key, { label }]) => (
          <PillBtn key={key} on={designKey === key} onClick={() => setDesignKey(key)}>
            {label}
          </PillBtn>
        ))}
      </div>

      {designKey !== 'cluster' && designKey !== 'switchback' && designKey !== 'stepped' ? null : (
        <div className="bg-app-surface rounded-xl p-3 mb-4 text-center">
          <span className="text-sm text-[var(--svg-text)]">
            {designs[designKey as string]?.desc}
          </span>
        </div>
      )}

      {/* Chart 1: Cluster Grid / Timeline */}
      <ChartBox
        h={G_H}
        label="Visual grid showing treatment assignment across clusters and time periods for the selected experimental design"
      >
        {/* Period labels */}
        {Array.from({ length: nPeriods }, (_, col) => (
          <text
            key={'period-' + col}
            x={gpl + col * cellW + cellW / 2}
            y={gpt - 10}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {'P' + (col + 1)}
          </text>
        ))}

        {/* Cluster labels */}
        {Array.from({ length: showRows }, (_, row) => (
          <text
            key={'cluster-' + row}
            x={gpl - 6}
            y={gpt + row * cellH + cellH / 2 + 3}
            fill={sv.text}
            fontSize={9}
            textAnchor="end"
          >
            {'Cluster ' + (row + 1)}
          </text>
        ))}

        {/* Grid cells */}
        {Array.from({ length: showRows }, (_, row) =>
          Array.from({ length: nPeriods }, (_, col) => {
            const fill = getColor(row, col);
            return (
              <rect
                key={row + '-' + col}
                x={gpl + col * cellW + cellGap / 2}
                y={gpt + row * cellH + cellGap / 2}
                width={cellW - cellGap}
                height={cellH - cellGap}
                rx={3}
                fill={fill}
                opacity={0.55}
              />
            );
          }),
        )}

        {/* Legend */}
        <rect
          x={G_W - gpr - 140}
          y={G_H - gpb + 8}
          width={10}
          height={10}
          rx={2}
          fill={colors.emerald}
          opacity={0.55}
        />
        <text x={G_W - gpr - 126} y={G_H - gpb + 17} fill={sv.text} fontSize={9}>
          Treatment
        </text>
        <rect
          x={G_W - gpr - 65}
          y={G_H - gpb + 8}
          width={10}
          height={10}
          rx={2}
          fill={colors.indigo}
          opacity={0.55}
        />
        <text x={G_W - gpr - 51} y={G_H - gpb + 17} fill={sv.text} fontSize={9}>
          Control
        </text>
      </ChartBox>

      {/* Chart 2: Power Curve Comparison */}
      <ChartBox
        h={P_H}
        label="Power curve comparing user-level randomization versus cluster-level randomization showing the power penalty from clustering"
        tooltipLookup={tooltipLookup}
      >
        <defs>
          <linearGradient id="userPowerGrad-33" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
          <g key={v}>
            <line x1={ppl} y1={pToY(v)} x2={P_W - ppr} y2={pToY(v)} stroke={sv.grid} />
            <text x={ppl - 5} y={pToY(v) + 3} fill={sv.text} fontSize={9} textAnchor="end">
              {v * 100 + '%'}
            </text>
          </g>
        ))}

        {/* X-axis ticks */}
        {xTicks.map((v) => (
          <text
            key={v}
            x={pToX(v)}
            y={P_H - ppb + 14}
            fill={sv.text}
            fontSize={9}
            textAnchor="middle"
          >
            {fmtN(v)}
          </text>
        ))}

        {/* 80% power horizontal dashed line */}
        <line
          x1={ppl}
          y1={pToY(0.8)}
          x2={P_W - ppr}
          y2={pToY(0.8)}
          stroke={colors.amber}
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />
        <text x={P_W - ppr} y={pToY(0.8) - 4} fill={colors.amber} fontSize={9} textAnchor="end">
          80% power target
        </text>

        {/* User-level area fill */}
        <path d={userArea} fill="url(#userPowerGrad-33)" />

        {/* User-level power curve (solid emerald) */}
        <path d={userLine} fill="none" stroke={colors.emerald} strokeWidth={2.5} />

        {/* Cluster-level power curve (dashed red) */}
        <path
          d={clusterLine}
          fill="none"
          stroke={colors.red}
          strokeWidth={2.5}
          strokeDasharray="8,4"
        />

        {/* Vertical dashed line for user-level N at 80% */}
        {computed.userN80 && (
          <g>
            <line
              x1={pToX(computed.userN80.n)}
              y1={pToY(0)}
              x2={pToX(computed.userN80.n)}
              y2={pToY(0.8)}
              stroke={colors.emerald}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            <circle cx={pToX(computed.userN80.n)} cy={pToY(0.8)} r={4} fill={colors.emerald} />
            <text
              x={pToX(computed.userN80.n)}
              y={pToY(0) + 14}
              fill={colors.emerald}
              fontSize={10}
              textAnchor="middle"
              fontWeight="700"
            >
              {'n=' + fmtN(Math.round(computed.userN80.n))}
            </text>
          </g>
        )}

        {/* Vertical dashed line for cluster-level N at 80% */}
        {computed.clusterN80 && (
          <g>
            <line
              x1={pToX(computed.clusterN80.n)}
              y1={pToY(0)}
              x2={pToX(computed.clusterN80.n)}
              y2={pToY(0.8)}
              stroke={colors.red}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            <circle cx={pToX(computed.clusterN80.n)} cy={pToY(0.8)} r={4} fill={colors.red} />
            <text
              x={pToX(computed.clusterN80.n)}
              y={pToY(0) + 26}
              fill={colors.red}
              fontSize={10}
              textAnchor="middle"
              fontWeight="700"
            >
              {'n=' + fmtN(Math.round(computed.clusterN80.n))}
            </text>
          </g>
        )}

        {/* X-axis line */}
        <line x1={ppl} y1={pToY(0)} x2={P_W - ppr} y2={pToY(0)} stroke={sv.axis} />
        <text x={P_W / 2} y={P_H - 4} fill={sv.text} fontSize={9} textAnchor="middle">
          Total Sample Size
        </text>

        {/* Legend */}
        <line
          x1={ppl + 8}
          y1={ppt + 4}
          x2={ppl + 28}
          y2={ppt + 4}
          stroke={colors.emerald}
          strokeWidth={2.5}
        />
        <text x={ppl + 32} y={ppt + 7} fill={sv.text} fontSize={8}>
          User-level
        </text>
        <line
          x1={ppl + 100}
          y1={ppt + 4}
          x2={ppl + 120}
          y2={ppt + 4}
          stroke={colors.red}
          strokeWidth={2.5}
          strokeDasharray="8,4"
        />
        <text x={ppl + 124} y={ppt + 7} fill={sv.text} fontSize={8}>
          Cluster-level
        </text>
      </ChartBox>

      {/* StatBoxes */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatBox label="Design Effect" value={computed.deff.toFixed(1)} color={colors.indigo} />
        <StatBox
          label="Effective N"
          value={Math.round(computed.effN).toLocaleString()}
          color={colors.emerald}
        />
        <StatBox
          label="Required Clusters"
          value={computed.minClusters.toString()}
          color={colors.amber}
        />
        <StatBox
          label="Power"
          value={(computed.clusterPower * 100).toFixed(1) + '%'}
          color={computed.clusterPower >= 0.8 ? colors.emerald : colors.red}
        />
      </div>

      {/* Sliders */}
      <Sl
        label="Number of Clusters"
        value={nClusters as number}
        min={4}
        max={100}
        step={2}
        onChange={setNClusters}
        color={colors.indigo}
      />
      <Sl
        label="Cluster Size"
        value={clusterSize as number}
        min={10}
        max={500}
        step={10}
        onChange={setClusterSize}
        color={colors.emerald}
      />
      <Sl
        label="ICC (\u03C1)"
        value={icc as number}
        min={0}
        max={50}
        step={1}
        onChange={setICC}
        fmt={(v: number) => (v / 100).toFixed(2)}
        color={colors.amber}
      />
      <Sl
        label="Effect Size (d)"
        value={effectSize as number}
        min={5}
        max={100}
        step={5}
        onChange={setEffectSize}
        fmt={(v: number) => (v / 100).toFixed(2)}
        color={colors.red}
      />

      <QA
        items={[
          {
            q: 'Why does clustering reduce power so dramatically?',
            a: 'Because observations within a cluster are correlated. If ICC = 0.05 and cluster size = 100, the design effect is 1 + 99 \u00D7 0.05 = 5.95 \u2014 your 1,000 users behave like only 168 independent observations. The effective sample size is N/DEFF, so even a small ICC with large clusters destroys power.',
          },
          {
            q: 'How do I choose between cluster RCT and switchback?',
            a: 'Cluster RCT is simpler but requires more clusters. Switchback reuses clusters across time periods (each cluster serves as its own control), gaining power but requiring that treatment effects don\u2019t carry over between periods. Use switchback when you have few clusters but many time periods, like a marketplace with 10 cities but 30 days of data.',
          },
        ]}
      />
      <TechNote>
        The design effect DEFF = 1 + (m {'\u2212'} 1) {'\u00D7'} ICC, where m is the cluster size
        and ICC is the intra-cluster correlation coefficient. The effective sample size is N/DEFF.
        For switchback designs, the within-cluster comparison reduces the effective ICC, but
        temporal autocorrelation introduces new complications. The stepped wedge design is most
        efficient when the number of clusters is very limited.
      </TechNote>
      <Insight>
        The most common mistake in cluster experiments is ignoring the design effect entirely —
        analyzing as if users were independently randomized. This inflates the false positive rate
        dramatically. An ICC of just 0.01 with clusters of 200 users means your p-values are about 3
        {'\u00D7'} too small.
      </Insight>
    </div>
  );
}
