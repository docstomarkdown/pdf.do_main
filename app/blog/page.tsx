import type { Metadata } from "next";
import { PostCard } from "@/components/blog/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { allTags, getPosts } from "@/lib/content";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "Short guides on working with PDFs: making them smaller, taking them apart, and keeping what is in them private.",
};

export default async function Blog() {
  const posts = await getPosts();
  const tags = allTags(posts);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
      <p className="mt-3 text-lg text-ink-2">Short guides on working with PDFs: making them smaller, taking them apart, and keeping what is in them private.</p>

      {tags.length > 0 && (
        <nav aria-label="Topics" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => (<li key={t.tag}><Link href={`/blog/tags/${t.tag}`} className="pill-link">{t.tag} <span className="text-ink-3">({t.count})</span></Link></li>))}
          </ul>
        </nav>
      )}

      {posts.length === 0 ? (
        <div className="mt-8"><EmptyState icon="file" title="No posts yet">Guides will appear here.</EmptyState></div>
      ) : (
        <ul className="mt-8 grid gap-4">
          {posts.map((p) => (<li key={p.slug}><PostCard post={p} /></li>))}
        </ul>
      )}
    </div>
  );
}
