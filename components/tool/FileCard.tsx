import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/format";
import { FileDrop } from "./FileDrop";

/** The file you chose: its name, page count and size, and a way to choose a different one. `dim` while work is under way. */
export function FileCard({ file, pages, dim, onReplace }: { file: File; pages?: number; dim?: boolean; onReplace: (file: File) => void }) {
  return (
    <Card className={`filecard ${dim ? "filecard-dim" : ""}`.trim()}>
      <div className="flex min-w-0 items-center gap-3">
        <Icon name="file" className="h-6 w-6 shrink-0 text-ink-3" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{file.name}</p>
          <p className="text-sm text-ink-3">{pages ? `${pages} ${pages === 1 ? "page" : "pages"} · ` : ""}{formatBytes(file.size)}</p>
        </div>
      </div>
      <FileDrop compact disabled={dim} label="Choose a different file" onFiles={(f) => onReplace(f[0])} />
    </Card>
  );
}
