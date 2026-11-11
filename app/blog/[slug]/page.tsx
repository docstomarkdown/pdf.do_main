import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/blog/JsonLd";
import { PostCard } from "@/components/blog/PostCard";
import { PostMeta } from "@/components/blog/PostMeta";
import { ToolCard } from "@/components/site/ToolCard";
import { getPosts } from "@/lib/content";
import { getTool } from "@/lib/tools";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = (await getPosts()).find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    // The page stays out of search results like the rest of the site (robots comes from the root layout) until go-live.
    openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.date, modifiedTime: post.updated, tags: post.tags },
  };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();
  const tool = post.tool ? getTool(post.tool) : undefined;
  const related = post.related.map((r) => posts.find((p) => p.slug === r)).filter((p) => p !== undefined);
  const toc = post.headings.filter((h) => h.depth === 2);

  return (
    <article className="mx-auto max-w-3xl">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        author: { "@type": "Organization", name: "pdf.do" },
        publisher: { "@type": "Organization", name: "pdf.do" },
        keywords: post.tags.join(", "),
      }} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-3"><Link href="/blog" className="link">Blog</Link> <span aria-hidden="true">/</span> <span>{post.title}</span></nav>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
      <p className="mt-3 text-lg text-ink-2">{post.description}</p>
      <div className="mt-4"><PostMeta post={post} showUpdated /></div>

      {toc.length >= 3 && (
        <nav aria-label="On this page" className="mt-8 rounded-2xl border border-line-soft bg-surface-2 p-5" data-testid="toc">
          <p className="mb-2 text-sm font-semibold">On this page</p>
          <ol className="grid gap-1.5">
            {toc.map((h) => (<li key={h.id}><a href={`#${h.id}`} className="link">{h.text}</a></li>))}
          </ol>
        </nav>
      )}

      <div className="blog-prose prose mt-8" dangerouslySetInnerHTML={{ __html: post.html }} />

      {tool && (
        <section aria-labelledby="try-it" className="mt-12">
          <h2 id="try-it" className="mb-3 text-xl font-bold tracking-tight">Try it in your browser</h2>
          <ToolCard tool={tool} />
          <p className="mt-2 text-sm text-ink-3">Your file stays on your device. Nothing is uploaded.</p>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="more" className="mt-12">
          <h2 id="more" className="mb-3 text-xl font-bold tracking-tight">More to read</h2>
          <ul className="grid gap-4">{related.map((r) => (<li key={r.slug}><PostCard post={r} /></li>))}</ul>
        </section>
      )}

      <p className="mt-12"><Link href="/blog" className="link">All posts</Link></p>
    </article>
  );
}
