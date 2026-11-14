import type { Metadata } from "next";
import { PostCard } from "@/components/blog/PostCard";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { allTags, getPosts, tagLabel, tagName } from "@/lib/content";
import { pageMeta, sharePicture } from "@/lib/seo";

export const dynamicParams = false;

export async function generateStaticParams() {
  return allTags(await getPosts()).map((t) => ({ tag: t.tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  return {
    ...pageMeta({ path: `/blog/tags/${tag}`, title: `Posts about ${tagName(tag)}`, description: `Blog posts tagged ${tagName(tag)}.`, image: sharePicture("/blog"), imageAlt: "The pdf.do blog" }),
    // A topic page is a list of posts that each have their own page, so it stays out of search results for good, also
    // after the rest of the site is opened to them (the sitemap leaves it out for the same reason).
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}

export default async function Tag({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const posts = (await getPosts()).filter((p) => p.tags.includes(tag));
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb trail={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }]} current={tagLabel(tag)} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Posts about {tagName(tag)}</h1>
      <ul className="mt-8 grid gap-4">
        {posts.map((p) => (<li key={p.slug}><PostCard post={p} /></li>))}
      </ul>
    </div>
  );
}
