# Writing for the blog

Posts are Markdown files in `content/blog/`. The file name is the web address: `content/blog/make-a-pdf-smaller.md` is
published at `/make-a-pdf-smaller`, at the top of the site with nothing in front. Use lowercase words joined by hyphens.
A post cannot take a name a tool or a page already has (`merge-pdf`, `how-it-works`): the build stops and says so.

Drafts and a preview: run `npm run dev` and open `/blog`. Posts marked `draft: true` show there, and are left out of the live
build. Every other post must pass the checks below, or `npm run build` stops and lists what to fix.

## A post

```markdown
---
title: How to make a PDF smaller without losing its text
description: A plain guide to finding what makes a PDF big and shrinking it, with the cases where it will not help.
date: 2026-11-06
updated: 2026-11-20
tags: [compress, file-size]
tool: compress-pdf
related: [another-post-slug]
draft: false
---

Start with a sentence that answers the question. Then use `##` headings.
```

| Field | Rule |
|---|---|
| `title` | Required. 10 to 90 characters. It is the page's heading; do not repeat it as a `#` heading in the body. |
| `description` | Required. 50 to 200 characters. It is the text under the title and what search results show, so write it for a reader. |
| `date` | Required. A real date as `YYYY-MM-DD`. Not in the future: keep a post as `draft: true` until it is ready. |
| `updated` | Optional. When you changed the post in a way a reader would care about. Not before `date`. |
| `tags` | Optional. Up to five, lowercase words joined by hyphens. Each tag gets a page at `/blog/tags/<tag>`. |
| `tool` | Optional. The slug of a tool in `lib/tools.ts`. The post ends with a card that opens that tool. |
| `related` | Optional. Slugs of other published posts, shown at the end. |
| `draft` | Optional. `true` keeps the post out of the live site. |

## What the build checks

The build fails, with every problem listed together, when:

- a required field is missing, a field is spelled wrongly, or a date is not a real date;
- the body has a `#` heading, skips a heading level (`##` then `####`), or goes deeper than `###`;
- a picture has no alt text, or points at a file that is not in `public/`;
- a link starts with `/` but is not a page on this site (a tool, `/blog`, a post, a tag, `/how-it-works`, `/licences`), or points at a heading that is not in the post;
- the body contains raw HTML (write it in Markdown), or a published post has fewer than 150 words;
- `tool` is not a tool on the site, or `related` names a post that does not exist.

## Writing rules

These are the site's rules (`AGENTS.md`), applied to posts:

- Plain words, sentence case, no hype. Say what a tool does and what it cannot do. Do not claim a result the tool does not give.
- Do not name other companies' products (PDF editors, converters) without the owner's review. Describe them: "a PDF editor".
- Do not give legal, financial or security guarantees. "Files stay on your device" is a tested claim about this site; other claims need a test or a source.
- Link to the tool pages where a reader would act, with words that say what the link does.
- Pictures go in `public/blog/` and are linked as `/blog/name.png`. Write alt text that says what the picture shows.
- Posts are English only (decision 0002).

## What the site adds

A reading time, a contents list for posts with three or more `##` headings, a link on every heading, the tag list, the tool card,
the related posts, and structured data (`Article`) for search engines. Tables and code blocks scroll inside their own box on a
narrow screen. Like the rest of the site, the blog is `noindex` until the owner decides to go live.
