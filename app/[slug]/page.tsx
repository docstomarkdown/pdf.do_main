import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostPage } from "@/components/blog/PostPage";
import { ToolPage } from "@/components/tool/ToolPage";
import { CompressTool } from "@/components/tool/CompressTool";
import { SizeLinks } from "@/components/tool/SizeLinks";
import { getPosts } from "@/lib/content";
import { pageMeta, toolMeta } from "@/lib/seo";
import { getTool, presetPages } from "@/lib/tools";

// Pages made from lists, at the top level of the site: the compress-size pages (from the tool registry) and the blog
// posts (from content/blog), so a post's address is /its-file-name with nothing in front. lib/content.ts refuses a post
// whose address a tool or a page already has. Static export needs every path listed up front, and anything else is a
// 404 (not a runtime lookup).
export const dynamicParams = false;
export async function generateStaticParams() {
  return [...presetPages().map((t) => ({ slug: t.slug })), ...(await getPosts()).map((p) => ({ slug: p.slug }))];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (tool) return toolMeta(tool);
  const post = (await getPosts()).find((p) => p.slug === slug);
  if (!post) return {};
  // The page stays out of search results like the rest of the site (robots comes from the root layout) until go-live.
  return pageMeta({
    path: `/${post.slug}`, title: post.title, description: post.description, image: post.image, imageAlt: post.imageAlt,
    article: { published: post.date, modified: post.updated, tags: post.tags },
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (tool?.presetBytes) {
    return (
      <ToolPage tool={tool} extra={<SizeLinks current={tool.slug} />}>
        <CompressTool presetBytes={tool.presetBytes} />
      </ToolPage>
    );
  }
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();
  return <PostPage post={post} posts={posts} />;
}
