/** A placeholder that holds a space still while something loads. Give it the size of what it stands in for. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skel ${className}`.trim()} />;
}
