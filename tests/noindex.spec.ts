import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// The prototype must stay out of search results until go-live. Three layers say so, and all three are checked here:
// the meta tag on every built page (app/layout.tsx), the X-Robots-Tag response header config for each host we might
// use (vercel.json, public/_headers), and the header on a real response from the served site (serve.json stands in for the host).
const ROOT = path.join(__dirname, "..");
const VALUE = "noindex, nofollow";

function htmlFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(path.join(dir, e.name)) : e.name.endsWith(".html") ? [path.join(dir, e.name)] : [],
  );
}

test("every built page carries the noindex, nofollow meta tag", () => {
  const files = htmlFiles(path.join(ROOT, "out"));
  expect(files.length).toBeGreaterThan(10);
  const missing = files.filter((f) => !new RegExp(`<meta name="robots" content="${VALUE}"/?>`).test(fs.readFileSync(f, "utf8")));
  expect(missing.map((f) => path.relative(ROOT, f))).toEqual([]);
});

test("the header config for Vercel and for Cloudflare Pages and Netlify says X-Robots-Tag: noindex, nofollow for every path", () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const all = vercel.headers.find((h) => h.source === "/(.*)");
  expect(all?.headers).toContainEqual({ key: "X-Robots-Tag", value: VALUE });

  const built = fs.readFileSync(path.join(ROOT, "out", "_headers"), "utf8"); // public/_headers, as shipped in the export
  expect(built).toMatch(new RegExp(`^/\\*\\n\\s+X-Robots-Tag: ${VALUE}$`, "m"));
});

test("a served page, a script and a worker all come back with the X-Robots-Tag header", async ({ request }) => {
  for (const url of ["/", "/merge-pdf", "/engines/merge.worker.js"]) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    expect(response.headers()["x-robots-tag"], url).toBe(VALUE);
  }
});
