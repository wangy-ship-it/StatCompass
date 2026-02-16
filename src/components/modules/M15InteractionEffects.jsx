import { useMemo } from 'react';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, StatBox, Sl, PillBtn, QA, TechNote, Insight } from '../ui';
import useModuleParams from '../../hooks/useModuleParams';

const paramDefaults = { effectA: 5, effectB: 3, interactionPct: 0, interType: 'none' };

export default function M15InteractionEffects() {
  const [p, set] = useModuleParams(paramDefaults);
  const { effectA, effectB, interactionPct, interType } = p;
  const setEffectA = (v) => set('effectA', v);
  const setEffectB = (v) => set('effectB', v);
  const setInteractionPct = (v) => set('interactionPct', v);
  const setInterType = (v) => set('interType', v);

  const data = useMemo(() => {
    let interaction;
    if (interType === 'synergistic') interaction = Math.abs(interactionPct);
    else if (interType === 'antagonistic') interaction = -Math.abs(interactionPct);
    else interaction = interactionPct;

    const a = effectA;
    const b = effectB;
    const interactionTerm = (a * b * interaction) / (100 * 100) * 100;
    const expectedCombined = a + b;
    const actualCombined = a + b + interactionTerm;

    const baseline = 100;
    const cells = {
      cc: baseline,
      ac: baseline + a,
      cb: baseline + b,
      ab: baseline + actualCombined,
    };

    return { a, b, interactionTerm, expectedCombined, actualCombined, cells, interaction };
  }, [effectA, effectB, interactionPct, interType]);

  // Bar chart
  const W = 600, H = 260, pl = 60, pr = 40, pt = 30, pb = 50;
  const barLabels = ['Control\n(no change)', 'A only', 'B only', 'A + B\n(actual)'];
  const barValues = [0, data.a, data.b, data.actualCombined];
  const barColors = [sv.textFaint, colors.indigo, colors.emerald, colors.amber];
  const maxBar = Math.max(...barValues.map(Math.abs), Math.abs(data.expectedCombined)) * 1.3;
  const barW = (W - pl - pr) / 5;
  const gap = barW * 0.3;
  const toY = (v) => H - pb - ((v + maxBar) / (2 * maxBar)) * (H - pt - pb);
  const zeroY = toY(0);

  // 2x2 grid dimensions
  const gridW = 240, gridH = 160;
  const cellW = gridW / 2, cellH = gridH / 2;

  return (
    <div>
      <Hdr sub="Validate & Run">Interaction Effects</Hdr>
      <Desc>
        When multiple experiments run simultaneously on the same users, their effects can interact.
        The combined impact may be more (synergistic) or less (antagonistic) than the sum of
        individual effects. Understanding interactions is critical for experiment platforms running
        dozens of concurrent tests.
      </Desc>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'none', label: 'No Interaction' },
          { key: 'synergistic', label: 'Synergistic' },
          { key: 'antagonistic', label: 'Antagonistic' },
        ].map(({ key, label }) => (
          <PillBtn key={key} on={interType === key} onClick={() => {
            setInterType(key);
            if (key === 'synergistic') setInteractionPct(50);
            else if (key === 'antagonistic') setInteractionPct(-50);
            else setInteractionPct(0);
          }}>{label}</PillBtn>
        ))}
      </div>

      {/* 2x2 Factorial Grid */}
      <div className="flex justify-center mb-8">
        <div>
          <div className="text-[11px] text-[var(--svg-text-faint)] text-center mb-2 uppercase tracking-wider">2x2 Factorial Outcomes</div>
          <div className="inline-block">
            {/* Column headers */}
            <div className="flex">
              <div className="w-[80px]" />
              <div className="w-[120px] text-center text-[12px] text-[var(--svg-text-faint)] py-1">Control B</div>
              <div className="w-[120px] text-center text-[12px] font-medium py-1" style={{ color: colors.emerald }}>Treatment B</div>
            </div>
            {/* Row 1: Control A */}
            <div className="flex">
              <div className="w-[80px] flex items-center text-[12px] text-[var(--svg-text-faint)] pr-2 justify-end">Control A</div>
              <div className="w-[120px] h-[70px] flex items-center justify-center rounded-tl-xl ring-1 ring-[var(--color-border-subtle)] bg-app-glass">
                <span className="text-[18px] font-mono font-bold" style={{ color: sv.text }}>{data.cells.cc.toFixed(1)}</span>
              </div>
              <div className="w-[120px] h-[70px] flex items-center justify-center rounded-tr-xl ring-1 ring-[var(--color-border-subtle)] bg-app-glass">
                <span className="text-[18px] font-mono font-bold" style={{ color: colors.emerald }}>{data.cells.cb.toFixed(1)}</span>
              </div>
            </div>
            {/* Row 2: Treatment A */}
            <div className="flex">
              <div className="w-[80px] flex items-center text-[12px] font-medium pr-2 justify-end" style={{ color: colors.indigo }}>Treat. A</div>
              <div className="w-[120px] h-[70px] flex items-center justify-center rounded-bl-xl ring-1 ring-[var(--color-border-subtle)] bg-app-glass">
                <span className="text-[18px] font-mono font-bold" style={{ color: colors.indigo }}>{data.cells.ac.toFixed(1)}</span>
              </div>
              <div className="w-[120px] h-[70px] flex items-center justify-center rounded-br-xl ring-1 ring-[var(--color-border-subtle)]"
                style={{ background: data.interactionTerm > 0 ? sv.fillEmerald : data.interactionTerm < 0 ? sv.fillRed : 'var(--color-app-glass)' }}>
                <span className="text-[18px] font-mono font-bold" style={{ color: colors.amber }}>{data.cells.ab.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <ChartBox h={H} label="Interaction effects between simultaneous experiments, showing how treatments can amplify, cancel, or reverse each other">
        {/* Zero line */}
        <line x1={pl} y1={zeroY} x2={W - pr} y2={zeroY} stroke={sv.axis} strokeWidth={1} />

        {/* Expected combined (dashed) */}
        <line
          x1={pl + 3 * (barW + gap)}
          y1={toY(data.expectedCombined)}
          x2={pl + 3 * (barW + gap) + barW}
          y2={toY(data.expectedCombined)}
          stroke={colors.red}
          strokeWidth={2}
          strokeDasharray="5,3"
        />
        <text
          x={pl + 3 * (barW + gap) + barW + 6}
          y={toY(data.expectedCombined) + 3}
          fill={colors.red}
          fontSize={9}
        >Expected (A+B)</text>

        {/* Bars */}
        {barValues.map((v, i) => {
          const x = pl + i * (barW + gap);
          const barTop = v >= 0 ? toY(v) : zeroY;
          const barH = Math.abs(toY(v) - zeroY);
          return (
            <g key={i}>
              <rect
                x={x}
                y={barTop}
                width={barW}
                height={Math.max(barH, 1)}
                fill={barColors[i]}
                opacity={0.6}
                rx={4}
              />
              <text x={x + barW / 2} y={v >= 0 ? barTop - 6 : barTop + barH + 14} fill={barColors[i]} fontSize={11} textAnchor="middle" fontWeight="600">
                {v === 0 ? '0' : (v > 0 ? '+' : '') + v.toFixed(1) + '%'}
              </text>
              <text x={x + barW / 2} y={H - pb + 16} fill={sv.textFaint} fontSize={9} textAnchor="middle">
                {['Control', 'A only', 'B only', 'A+B'][i]}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={pl} y1={pt} x2={pl} y2={H - pb} stroke={sv.axis} />
      </ChartBox>

      <Sl label="Effect A (%)" value={effectA} min={0} max={10} step={0.1} onChange={setEffectA} fmt={(v) => v.toFixed(1) + '%'} color={colors.indigo} />
      <Sl label="Effect B (%)" value={effectB} min={0} max={10} step={0.1} onChange={setEffectB} fmt={(v) => v.toFixed(1) + '%'} color={colors.emerald} />
      <Sl label="Interaction Strength (%)" value={interactionPct} min={-100} max={100} step={1} onChange={(v) => { setInteractionPct(v); setInterType(v > 0 ? 'synergistic' : v < 0 ? 'antagonistic' : 'none'); }} fmt={(v) => (v > 0 ? '+' : '') + v + '%'} color={colors.amber} />

      <div className="flex gap-3 flex-wrap mt-6">
        <StatBox label="Effect A" value={'+' + data.a.toFixed(1) + '%'} color={colors.indigo} />
        <StatBox label="Effect B" value={'+' + data.b.toFixed(1) + '%'} color={colors.emerald} />
        <StatBox label="Expected A+B" value={'+' + data.expectedCombined.toFixed(1) + '%'} color={colors.red} />
        <StatBox label="Actual A+B" value={(data.actualCombined >= 0 ? '+' : '') + data.actualCombined.toFixed(1) + '%'} color={colors.amber} />
      </div>

      {data.interactionTerm !== 0 && (
        <div className="rounded-xl px-5 py-3 mt-4 text-[14px] text-[var(--svg-text)]"
          style={{
            background: data.interactionTerm > 0 ? sv.fillEmerald : sv.fillRed,
            border: '1px solid ' + (data.interactionTerm > 0 ? sv.borderEmerald : sv.borderRed),
          }}>
          <span className="font-medium" style={{ color: data.interactionTerm > 0 ? colors.emerald : colors.red }}>
            Interaction: {data.interactionTerm > 0 ? '+' : ''}{data.interactionTerm.toFixed(2)}%
          </span>
          {' — '}
          {data.interactionTerm > 0
            ? 'The two treatments amplify each other (synergistic).'
            : 'The two treatments partially cancel each other (antagonistic).'}
        </div>
      )}

      <QA
        items={[
          {
            q: 'Should we worry about experiments interacting?',
            a: 'Usually interactions are small for unrelated features. But for overlapping features (e.g., two checkout flow changes, or two recommendation algorithm changes), interactions can be significant. The risk increases when experiments modify the same user journey or compete for the same user attention.',
          },
          {
            q: 'How do we detect interactions?',
            a: 'Run factorial designs when possible — assign users to all combinations of A and B. Alternatively, use holdout groups to measure the combined effect and compare it to the sum of individual effects. Most experimentation platforms support mutual exclusion for high-risk overlaps.',
          },
        ]}
      />
      <TechNote>
        In a 2x2 factorial design, the interaction term is: AB - A - B + baseline. If treatments
        are independent, this equals zero. Interaction as a percentage of individual effects is a
        useful metric: |interaction| / min(A, B). Values above 20% warrant investigation.
      </TechNote>
      <Insight>
        Most experiment platforms assume treatments are independent and measure them separately. This
        works when experiments affect different parts of the product. But when two experiments modify
        the same user flow, ignoring interactions can lead to shipping a combination that actually
        hurts — even though each individual test looked positive.
      </Insight>
    </div>
  );
}
