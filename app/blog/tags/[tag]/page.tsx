import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { allTags, getPosts } from "@/lib/content";

export const dynamicParams = false;

export async function generateStaticParams() {
  return allTags(await getPosts()).map((t) => ({ tag: t.tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  return { title: `Posts about ${tag}`, description: `Blog posts tagged ${tag}.` };
}

export default async function Tag({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const posts = (await getPosts()).filter((p) => p.tags.includes(tag));
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-3"><Link href="/blog" className="link">Blog</Link> <span aria-hidden="true">/</span> <span>{tag}</span></nav>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Posts about {tag}</h1>
      <ul className="mt-8 grid gap-4">
        {posts.map((p) => (<li key={p.slug}><PostCard post={p} /></li>))}
      </ul>
    </div>
  );
}
