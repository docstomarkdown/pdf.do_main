import Link from "next/link";
import { JsonLd } from "@/components/blog/JsonLd";
import { PostCard } from "@/components/blog/PostCard";
import { PostMeta } from "@/components/blog/PostMeta";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { ToolCard } from "@/components/site/ToolCard";
import type { Post } from "@/lib/content";
import { sharePicture } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getTool } from "@/lib/tools";

/** One blog post, as its page shows it. `posts` is every published post, for the "More to read" links. */
export function PostPage({ post, posts }: { post: Post; posts: Post[] }) {
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
        url: `${SITE_URL}/${post.slug}`,
        mainEntityOfPage: `${SITE_URL}/${post.slug}`,
        image: `${SITE_URL}${sharePicture(`/${post.slug}`, post.image)}`,
        inLanguage: "en",
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        keywords: post.tags.join(", "),
      }} />
      {/* The same breadcrumb as a tool page. The post's own title is left out of it: it is the heading right below. */}
      <Breadcrumb trail={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }]} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
      <p className="mt-3 text-lg text-ink-2">{post.description}</p>
      <div className="mt-4"><PostMeta post={post} showUpdated /></div>

      {toc.length >= 3 && (
        <nav aria-label="On this page" className="mt-8 rounded-2xl border border-line-soft bg-surface-2 p-5" data-testid="toc">
          <p className="mb-2 text-sm font-semibold">On this page</p>
          {/* On a phone each line of the list is a row 44 px tall, so a thumb lands on the one it means. */}
          <ol className="grid gap-1.5 max-sm:gap-0">
            {toc.map((h) => (<li key={h.id}><a href={`#${h.id}`} className="link max-sm:flex max-sm:min-h-11 max-sm:items-center">{h.text}</a></li>))}
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

      <p className="mt-12"><Link href="/blog" className="link tap">All posts</Link></p>
    </article>
  );
}
