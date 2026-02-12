import { useState, useMemo } from 'react';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, PillBtn, StatBox, QA, TechNote, Insight } from '../ui';

const presets = {
  medical:    { label: 'Medical',    segRatio: 75, seg1RateA: 80, seg1RateB: 78, seg2RateA: 70, seg2RateB: 65 },
  admissions: { label: 'Admissions', segRatio: 80, seg1RateA: 85, seg1RateB: 80, seg2RateA: 30, seg2RateB: 25 },
  batting:    { label: 'Batting',    segRatio: 80, seg1RateA: 35, seg1RateB: 33, seg2RateA: 35, seg2RateB: 30 },
};

const N = 400;

export default function M14SimpsonsParadox() {
  const [preset, setPreset] = useState('medical');
  const [segRatio, setSegRatio] = useState(75);
  const [seg1RateA, setSeg1RateA] = useState(80);
  const [seg1RateB, setSeg1RateB] = useState(78);
  const [seg2RateA, setSeg2RateA] = useState(70);
  const [seg2RateB, setSeg2RateB] = useState(65);

  const applyPreset = (key) => {
    const p = presets[key];
    setPreset(key);
    setSegRatio(p.segRatio);
    setSeg1RateA(p.seg1RateA);
    setSeg1RateB(p.seg1RateB);
    setSeg2RateA(p.seg2RateA);
    setSeg2RateB(p.seg2RateB);
  };

  /* --- Derived calculations --- */
  const calc = useMemo(() => {
    // Group A is mostly assigned to HARD cases (inverted allocation)
    // Group B is mostly assigned to EASY cases
    const nEasyA = N * (100 - segRatio) / 100;
    const nHardA = N * segRatio / 100;
    const nEasyB = N * segRatio / 100;
    const nHardB = N * (100 - segRatio) / 100;

    // Success counts
    const succEasyA = nEasyA * seg1RateA / 100;
    const succHardA = nHardA * seg2RateA / 100;
    const succEasyB = nEasyB * seg1RateB / 100;
    const succHardB = nHardB * seg2RateB / 100;

    // Overall rates
    const overallA = (succEasyA + succHardA) / N;
    const overallB = (succEasyB + succHardB) / N;

    // Segment rates (just the input percentages as decimals)
    const s1A = seg1RateA / 100;
    const s1B = seg1RateB / 100;
    const s2A = seg2RateA / 100;
    const s2B = seg2RateB / 100;

    // Determine segment winners
    const aWinsSeg1 = s1A > s1B;
    const aWinsSeg2 = s2A > s2B;
    const aWinsOverall = overallA > overallB;

    // Paradox: A wins BOTH segments but B wins overall, or vice versa
    const aWinsBoth = aWinsSeg1 && aWinsSeg2;
    const bWinsBoth = !aWinsSeg1 && !aWinsSeg2;
    const paradoxActive = (aWinsBoth && !aWinsOverall) || (bWinsBoth && aWinsOverall);

    // Confounding strength: how much the aggregate misleads
    const confounding = paradoxActive ? Math.abs(overallA - overallB) : 0;

    return {
      overallA, overallB,
      s1A, s1B, s2A, s2B,
      nEasyA, nHardA, nEasyB, nHardB,
      aWinsOverall, aWinsSeg1, aWinsSeg2,
      paradoxActive, confounding,
    };
  }, [segRatio, seg1RateA, seg1RateB, seg2RateA, seg2RateB]);

  const {
    overallA, overallB,
    s1A, s1B, s2A, s2B,
    nEasyA, nHardA, nEasyB, nHardB,
    aWinsOverall, aWinsSeg1, aWinsSeg2,
    paradoxActive, confounding,
  } = calc;

  /* --- Chart constants --- */
  const W = 600;
  const pl = 110, pr = 60;

  /* === Chart 1: Aggregate View === */
  const aggMax = Math.max(overallA, overallB, 0.01) * 1.25;
  const aggToX = (v) => pl + (v / aggMax) * (W - pl - pr);
  const barH = 24;
  const aggY1 = 42;
  const aggY2 = aggY1 + barH + 20;
  const aggWinLabel = aWinsOverall ? 'Group A wins overall' : 'Group B wins overall';
  const aggWinColor = aWinsOverall ? colors.indigo : colors.emerald;

  /* === Chart 2: Segmented View === */
  const segMax = Math.max(s1A, s1B, s2A, s2B, 0.01) * 1.25;
  const segToX = (v) => pl + (v / segMax) * (W - pl - pr);
  const segBarH = 20;
  const seg1Y = 36;
  const seg2Y = 110;

  return (
    <div>
      <Hdr sub="Interpret & Decide">Simpson's Paradox</Hdr>
      <Desc>
        A trend in aggregate data can reverse when you split by subgroups.
        Drag the sliders to control segment ratios and success rates, and watch
        the paradox emerge and vanish in real-time. Both views are shown
        simultaneously so you can see the reversal as it happens.
      </Desc>

      {/* Preset buttons */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {Object.entries(presets).map(([key, p]) => (
          <PillBtn key={key} on={preset === key} onClick={() => applyPreset(key)}>
            {p.label}
          </PillBtn>
        ))}
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mb-6">
        <Sl
          label="Segment Ratio (% Easy Cases)"
          value={segRatio} min={10} max={90} step={5}
          onChange={(v) => { setSegRatio(v); setPreset(null); }}
          fmt={(v) => v + '% easy / ' + (100 - v) + '% hard'}
          color={colors.slate400}
        />
        <div />
        <Sl
          label="Group A - Easy Segment Rate"
          value={seg1RateA} min={20} max={95} step={1}
          onChange={(v) => { setSeg1RateA(v); setPreset(null); }}
          fmt={(v) => v + '%'}
          color={colors.indigo}
        />
        <Sl
          label="Group B - Easy Segment Rate"
          value={seg1RateB} min={20} max={95} step={1}
          onChange={(v) => { setSeg1RateB(v); setPreset(null); }}
          fmt={(v) => v + '%'}
          color={colors.emerald}
        />
        <Sl
          label="Group A - Hard Segment Rate"
          value={seg2RateA} min={5} max={80} step={1}
          onChange={(v) => { setSeg2RateA(v); setPreset(null); }}
          fmt={(v) => v + '%'}
          color={colors.indigo}
        />
        <Sl
          label="Group B - Hard Segment Rate"
          value={seg2RateB} min={5} max={80} step={1}
          onChange={(v) => { setSeg2RateB(v); setPreset(null); }}
          fmt={(v) => v + '%'}
          color={colors.emerald}
        />
      </div>

      {/* Paradox indicator banner */}
      {paradoxActive && (
        <div className="rounded-xl p-4 mb-6 bg-amber-500/[0.08] border border-amber-500/20 flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: colors.amber, boxShadow: '0 0 8px ' + colors.amber }}
          />
          <div className="text-sm text-[var(--color-text-primary)] leading-relaxed">
            <span className="font-bold" style={{ color: colors.amber }}>Paradox Active</span>
            {' \u2014 '}
            {aWinsSeg1 && aWinsSeg2
              ? 'Group A wins in BOTH segments, yet Group B wins overall!'
              : 'Group B wins in BOTH segments, yet Group A wins overall!'}
          </div>
        </div>
      )}

      {/* Chart 1: Aggregate View */}
      <div className="text-[11px] uppercase tracking-widest mb-2 font-bold text-[var(--svg-text)] px-1">
        Aggregate View
      </div>
      <ChartBox h={140}>
        <text x={W / 2} y={16} fill={aggWinColor} fontSize={11} textAnchor="middle" fontWeight="700">
          {aggWinLabel}
        </text>

        {/* Group A bar */}
        <text x={pl - 8} y={aggY1 + barH / 2 + 4} fill={colors.indigo} fontSize={11} textAnchor="end" fontWeight="600">
          Group A
        </text>
        <rect x={pl} y={aggY1} width={Math.max(aggToX(overallA) - pl, 2)} height={barH} rx={6} fill={colors.indigo} opacity={0.75} />
        <text x={aggToX(overallA) + 8} y={aggY1 + barH / 2 + 4} fill={colors.indigo} fontSize={12} fontWeight="700">
          {(overallA * 100).toFixed(1) + '%'}
        </text>

        {/* Group B bar */}
        <text x={pl - 8} y={aggY2 + barH / 2 + 4} fill={colors.emerald} fontSize={11} textAnchor="end" fontWeight="600">
          Group B
        </text>
        <rect x={pl} y={aggY2} width={Math.max(aggToX(overallB) - pl, 2)} height={barH} rx={6} fill={colors.emerald} opacity={0.75} />
        <text x={aggToX(overallB) + 8} y={aggY2 + barH / 2 + 4} fill={colors.emerald} fontSize={12} fontWeight="700">
          {(overallB * 100).toFixed(1) + '%'}
        </text>

        {/* Axis */}
        <line x1={pl} y1={128} x2={W - pr} y2={128} stroke={sv.axis} />
        <text x={W / 2} y={138} fill={sv.text} fontSize={9} textAnchor="middle">
          Overall Success Rate
        </text>
      </ChartBox>

      {/* Chart 2: Segmented View */}
      <div className="text-[11px] uppercase tracking-widest mb-2 font-bold text-[var(--svg-text)] px-1">
        Segmented View
      </div>
      <ChartBox h={180}>
        {/* --- Segment 1: Easy --- */}
        <text x={pl / 2} y={seg1Y - 8} fill={sv.text} fontSize={10} textAnchor="middle" fontWeight="700">
          Easy Segment
        </text>
        <text x={pl / 2} y={seg1Y + 4} fill={sv.text} fontSize={8} textAnchor="middle">
          {'(A: ' + Math.round(nEasyA) + '  B: ' + Math.round(nEasyB) + ')'}
        </text>

        {/* A in easy */}
        <text x={pl - 8} y={seg1Y + segBarH / 2 + 16} fill={colors.indigo} fontSize={9} textAnchor="end">A</text>
        <rect x={pl} y={seg1Y + 10} width={Math.max(segToX(s1A) - pl, 2)} height={segBarH} rx={5} fill={colors.indigo} opacity={0.7} />
        <text x={segToX(s1A) + 6} y={seg1Y + 10 + segBarH / 2 + 4} fill={colors.indigo} fontSize={10} fontWeight="700">
          {seg1RateA + '%'}
        </text>
        {aWinsSeg1 && (
          <text x={segToX(s1A) + 42} y={seg1Y + 10 + segBarH / 2 + 4} fill={colors.indigo} fontSize={8} opacity={0.6}>
            {'\u2713'}
          </text>
        )}

        {/* B in easy */}
        <text x={pl - 8} y={seg1Y + segBarH + 40} fill={colors.emerald} fontSize={9} textAnchor="end">B</text>
        <rect x={pl} y={seg1Y + segBarH + 26} width={Math.max(segToX(s1B) - pl, 2)} height={segBarH} rx={5} fill={colors.emerald} opacity={0.7} />
        <text x={segToX(s1B) + 6} y={seg1Y + segBarH + 26 + segBarH / 2 + 4} fill={colors.emerald} fontSize={10} fontWeight="700">
          {seg1RateB + '%'}
        </text>
        {!aWinsSeg1 && (
          <text x={segToX(s1B) + 42} y={seg1Y + segBarH + 26 + segBarH / 2 + 4} fill={colors.emerald} fontSize={8} opacity={0.6}>
            {'\u2713'}
          </text>
        )}

        {/* Divider */}
        <line x1={20} y1={seg2Y - 10} x2={W - 20} y2={seg2Y - 10} stroke={sv.axis} strokeDasharray="4,4" />

        {/* --- Segment 2: Hard --- */}
        <text x={pl / 2} y={seg2Y + 2} fill={sv.text} fontSize={10} textAnchor="middle" fontWeight="700">
          Hard Segment
        </text>
        <text x={pl / 2} y={seg2Y + 14} fill={sv.text} fontSize={8} textAnchor="middle">
          {'(A: ' + Math.round(nHardA) + '  B: ' + Math.round(nHardB) + ')'}
        </text>

        {/* A in hard */}
        <text x={pl - 8} y={seg2Y + segBarH / 2 + 26} fill={colors.indigo} fontSize={9} textAnchor="end">A</text>
        <rect x={pl} y={seg2Y + 20} width={Math.max(segToX(s2A) - pl, 2)} height={segBarH} rx={5} fill={colors.indigo} opacity={0.7} />
        <text x={segToX(s2A) + 6} y={seg2Y + 20 + segBarH / 2 + 4} fill={colors.indigo} fontSize={10} fontWeight="700">
          {seg2RateA + '%'}
        </text>
        {aWinsSeg2 && (
          <text x={segToX(s2A) + 42} y={seg2Y + 20 + segBarH / 2 + 4} fill={colors.indigo} fontSize={8} opacity={0.6}>
            {'\u2713'}
          </text>
        )}

        {/* B in hard */}
        <text x={pl - 8} y={seg2Y + segBarH + 50} fill={colors.emerald} fontSize={9} textAnchor="end">B</text>
        <rect x={pl} y={seg2Y + segBarH + 36} width={Math.max(segToX(s2B) - pl, 2)} height={segBarH} rx={5} fill={colors.emerald} opacity={0.7} />
        <text x={segToX(s2B) + 6} y={seg2Y + segBarH + 36 + segBarH / 2 + 4} fill={colors.emerald} fontSize={10} fontWeight="700">
          {seg2RateB + '%'}
        </text>
        {!aWinsSeg2 && (
          <text x={segToX(s2B) + 42} y={seg2Y + segBarH + 36 + segBarH / 2 + 4} fill={colors.emerald} fontSize={8} opacity={0.6}>
            {'\u2713'}
          </text>
        )}

        {/* Axis */}
        <line x1={pl} y1={170} x2={W - pr} y2={170} stroke={sv.axis} />
        <text x={W / 2} y={179} fill={sv.text} fontSize={9} textAnchor="middle">
          Segment Success Rate
        </text>
      </ChartBox>

      {/* StatBoxes */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <StatBox label="Overall A" value={(overallA * 100).toFixed(1) + '%'} color={colors.indigo} />
        <StatBox label="Overall B" value={(overallB * 100).toFixed(1) + '%'} color={colors.emerald} />
        <StatBox
          label="Paradox Active"
          value={paradoxActive ? 'Yes' : 'No'}
          color={paradoxActive ? colors.amber : colors.emerald}
        />
        <StatBox
          label="Confounding Strength"
          value={paradoxActive ? (confounding * 100).toFixed(1) + ' pp' : '\u2014'}
          color={paradoxActive ? colors.red : colors.slate500}
        />
      </div>

      {/* Allocation summary */}
      <div className="rounded-xl p-5 mb-6 bg-app-glass ring-1 ring-[var(--color-border-subtle)]">
        <div className="text-[11px] uppercase tracking-widest mb-3 font-bold text-[var(--svg-text)]">
          Sample Allocation (N = {N} per group)
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-[var(--color-text-primary)]">
          <div>
            <span className="font-semibold" style={{ color: colors.indigo }}>Group A:</span>{' '}
            {Math.round(nEasyA)} easy, {Math.round(nHardA)} hard
            <span className="text-[var(--svg-text)] text-xs ml-1">(mostly hard)</span>
          </div>
          <div>
            <span className="font-semibold" style={{ color: colors.emerald }}>Group B:</span>{' '}
            {Math.round(nEasyB)} easy, {Math.round(nHardB)} hard
            <span className="text-[var(--svg-text)] text-xs ml-1">(mostly easy)</span>
          </div>
        </div>
      </div>

      <QA
        items={[
          {
            q: 'How can A win in every group but lose overall?',
            a: "Because group sizes differ. If A is tested mostly on the hard cases and B on easy cases, B's overall average is inflated by having more easy wins. The aggregate masks the confounding variable (case difficulty).",
          },
          {
            q: 'Which result should I trust \u2014 aggregate or segmented?',
            a: 'Usually the segmented result, because it controls for the confounding variable. But it depends on your question. If you want to know "which treatment is better for a given patient," look at segments. If you want the population average effect, you need causal analysis.',
          },
          {
            q: 'What does "Confounding Strength" measure?',
            a: 'It shows how far apart the aggregate rates are when the paradox is active \u2014 the bigger the gap, the more misleading the aggregate. It is measured in percentage points (pp).',
          },
        ]}
      />
      <TechNote>
        Simpson's Paradox arises from confounding: a lurking variable that influences both the grouping and the outcome.
        It's a special case of omitted variable bias. The key trick here is that Group A is disproportionately assigned to
        the hard segment while Group B gets the easy segment, creating an imbalanced comparison. The solution is
        stratification, matching, or regression adjustment to control for confounders.
      </TechNote>
      <Insight>
        Simpson's Paradox is a powerful reminder that aggregate data can be deeply misleading.
        Whenever you see a surprising result, ask: "What if I split this by a key variable?"
        The answer might reverse your conclusion entirely. Use the sliders to find the exact
        tipping point where the paradox appears and disappears.
      </Insight>
    </div>
  );
}
