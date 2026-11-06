import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { formatBytes } from "@/lib/format";

export type FileItem = {
  id: number; file: File; pages?: number; error?: string;
  /** Replaces the pages-and-size line, for files that are not PDFs ("1200 × 800 · 340 KB"). */
  detail?: string;
  /** An object URL for a small picture of the file, shown in place of the file icon. */
  thumb?: string;
};

/**
 * Files in the order they will be used. Every row can move up, move down and be removed with buttons, so nothing
 * depends on dragging. Each row says what it is doing: reading, how many pages, or why it cannot be used.
 */
export function FileList({ items, onMove, onRemove }: { items: FileItem[]; onMove: (index: number, delta: number) => void; onRemove: (id: number) => void }) {
  return (
    <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line-soft bg-surface">
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center gap-1.5 py-1.5 pl-3 pr-1.5 sm:gap-2 sm:pl-4">
          <span aria-hidden="true" className="w-6 text-center text-sm text-ink-3">{index + 1}</span>
          {item.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumb} alt="" draggable={false} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <Icon name="file" className="h-5 w-5 shrink-0 text-ink-3" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.file.name}</p>
            <p className={`text-sm ${item.error ? "text-danger-text" : "text-ink-3"}`}>
              {item.error ?? item.detail ?? (item.pages === undefined ? "Reading…" : `${item.pages} ${item.pages === 1 ? "page" : "pages"} · ${formatBytes(item.file.size)}`)}
            </p>
          </div>
          <IconButton icon="arrow-up" label={`Move ${item.file.name} up`} disabled={index === 0} onClick={() => onMove(index, -1)} />
          <IconButton icon="arrow-down" label={`Move ${item.file.name} down`} disabled={index === items.length - 1} onClick={() => onMove(index, 1)} />
          <IconButton icon="close" tone="danger" label={`Remove ${item.file.name}`} onClick={() => onRemove(item.id)} />
        </li>
      ))}
    </ul>
  );
}
