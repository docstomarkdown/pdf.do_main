import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PostMeta } from "./PostMeta";
import type { Post } from "@/lib/content";

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="post-card" data-testid="post-card">
      <h2 className="text-xl font-bold tracking-tight"><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
      <p className="text-ink-2">{post.description}</p>
      <PostMeta post={post} />
      {post.draft && <div><Badge tone="warn">Draft: shown while writing, left out of the live site</Badge></div>}
    </article>
  );
}
