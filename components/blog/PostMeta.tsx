import Link from "next/link";
import { formatDate, type Post } from "@/lib/content";

/** Date, reading time and tags, as one line of text a screen reader can read in order. */
export function PostMeta({ post, showUpdated = false }: { post: Post; showUpdated?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span aria-hidden="true">·</span>
      <span>{post.minutes} min read</span>
      {showUpdated && post.updated && post.updated !== post.date && (<><span aria-hidden="true">·</span><span>Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time></span></>)}
      {post.tags.length > 0 && (
        <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
          {post.tags.map((t) => (<li key={t}><Link href={`/blog/tags/${t}`} className="pill-link">{t}</Link></li>))}
        </ul>
      )}
    </div>
  );
}
