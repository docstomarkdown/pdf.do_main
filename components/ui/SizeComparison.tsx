/** Two bars, before and after, so a size change can be seen. Decorative: the numbers beside it say the same in words. */
export function SizeComparison({ before, after }: { before: number; after: number }) {
  const afterPct = Math.max(2, Math.min(100, (after / before) * 100));
  return (
    <div aria-hidden="true" className="meter">
      <div className="meter-row"><span className="meter-label">Before</span><div className="meter-track"><div className="meter-fill meter-before w-full" /></div></div>
      <div className="meter-row"><span className="meter-label">After</span><div className="meter-track"><div className="meter-fill meter-after" style={{ width: `${afterPct}%` }} /></div></div>
    </div>
  );
}
