import { Button } from "@/components/ui/Button";

/** Select all, clear, invert: the quick ways to change which pages are chosen. */
export function SelectionToolbar({ onAll, onClear, onInvert, disabled, className = "" }: {
  onAll: () => void; onClear: () => void; onInvert: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      <Button variant="secondary" disabled={disabled} onClick={onAll}>Select all</Button>
      <Button variant="secondary" disabled={disabled} onClick={onClear}>Clear</Button>
      <Button variant="secondary" disabled={disabled} onClick={onInvert}>Invert</Button>
    </div>
  );
}
