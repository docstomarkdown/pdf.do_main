// Single source of truth for every tool page. The home page, navigation, footer, related links,
// search and the compress-size pages are all generated from this list. To add a tool, add an
// entry here, then build its page and component (see AGENTS.md, "Adding a tool").
import type { IconName } from "@/components/ui/Icon";

export type CategoryId = "organise" | "compress";

export const CATEGORIES: Record<CategoryId, { name: string; blurb: string; icon: IconName }> = {
  organise: { name: "Merge and organise", blurb: "Combine files and choose which pages to keep.", icon: "merge" },
  compress: { name: "Compress", blurb: "Make a PDF smaller, or hit an exact size.", icon: "compress" },
};

export type Faq = { q: string; a: string };

export type Tool = {
  slug: string;
  name: string;
  short: string;
  intro: string;
  category: CategoryId;
  icon: IconName;
  keywords: string[];
  steps: string[];
  faq: Faq[];
  related: string[];
  /** Compress-size pages: the size this page preselects. */
  presetBytes?: number;
  /** Compress-size pages: the slug of the main tool they belong to. */
  parent?: string;
};

const privacyFaq = (verb: string): Faq => ({
  q: "Are my files uploaded?",
  a: `No. ${verb} happens in your browser tab, so the file never leaves your device. You can check this yourself: open your browser's network tool, run the tool, and watch for requests.`,
});

const passwordFaq: Faq = {
  q: "Can I use a password-protected PDF?",
  a: "Not yet. The tool says so if it meets one. Remove the password in the program that created the file, then try again.",
};

// Order follows what people type most (Google autocomplete, probed 2026-11-06), not size.
export const COMPRESS_SIZES = [
  { id: "1mb", label: "1 MB", bytes: 1024 * 1024 },
  { id: "2mb", label: "2 MB", bytes: 2 * 1024 * 1024 },
  { id: "5mb", label: "5 MB", bytes: 5 * 1024 * 1024 },
  { id: "200kb", label: "200 KB", bytes: 200 * 1024 },
  { id: "100kb", label: "100 KB", bytes: 100 * 1024 },
  { id: "500kb", label: "500 KB", bytes: 500 * 1024 },
  { id: "10mb", label: "10 MB", bytes: 10 * 1024 * 1024 },
  { id: "4mb", label: "4 MB", bytes: 4 * 1024 * 1024 },
  { id: "300kb", label: "300 KB", bytes: 300 * 1024 },
] as const;

const base: Tool[] = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    short: "Combine several PDFs into one, in the order you choose.",
    intro: "Combine two or more PDFs into a single file. Put them in order first, then download the result.",
    category: "organise",
    icon: "merge",
    keywords: ["combine", "join", "append", "concatenate"],
    steps: [
      "Choose your PDFs, or drop them on the page.",
      "Put them in order with the arrows, and remove any you don't need.",
      "Press Merge PDFs, then download the combined file.",
    ],
    faq: [
      privacyFaq("Merging"),
      {
        q: "Is there a limit on the number or size of files?",
        a: "This site sets none. The real limit is your device's memory: very large files may fail, especially on a phone.",
      },
      {
        q: "Are bookmarks and form fields kept?",
        a: "Pages are copied as they are. Bookmarks and interactive form fields from the original files may not carry over.",
      },
      passwordFaq,
    ],
    related: ["compress-pdf", "delete-pdf-pages", "extract-pdf-pages"],
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    short: "Make a PDF smaller, or hit an exact size like 200 KB.",
    intro: "Reduce a PDF's size, or ask for a target such as 200 KB and let it work down to it.",
    category: "compress",
    icon: "compress",
    keywords: ["reduce", "shrink", "smaller", "size", "email", "kb", "mb"],
    steps: [
      "Choose your PDF.",
      "Pick Smart to keep text selectable, or Target size to reach a specific size.",
      "Press Compress PDF, check the before and after sizes, then download.",
    ],
    faq: [
      privacyFaq("Compressing"),
      {
        q: "What is the difference between Smart and Target size?",
        a: "Smart shrinks the file without changing how it works, so text stays selectable. Target size keeps going until the file fits the size you choose. If optimising alone is not enough, it turns pages into images, and the text is no longer selectable.",
      },
      {
        q: "Why did my file barely shrink?",
        a: "Most scans and photos are already stored as compressed JPEG images, and Smart mode cannot compress those further. Use Target size, which lowers image quality to reach the size you pick.",
      },
      {
        q: "Will the quality suffer?",
        a: "Smart mode does not touch quality it cannot improve. Target size trades image quality for size, and shows you the settings it used. Check the result before you send it.",
      },
      passwordFaq,
    ],
    related: ["merge-pdf", "delete-pdf-pages", "extract-pdf-pages"],
  },
  {
    slug: "delete-pdf-pages",
    name: "Delete PDF pages",
    short: "Remove the pages you don't want and keep the rest.",
    intro: "Click the pages to remove, or type a range like 2, 5-7, then download the rest as a new PDF.",
    category: "organise",
    icon: "trash",
    keywords: ["remove pages", "cut pages", "drop pages", "blank pages"],
    steps: [
      "Choose your PDF and wait for the page thumbnails.",
      "Click the pages to delete, or type a range such as 2, 5-7.",
      "Press Delete pages, then download the result.",
    ],
    faq: [
      privacyFaq("Deleting pages"),
      {
        q: "Does it change the pages that stay?",
        a: "No. The remaining pages are copied unchanged, in their original order.",
      },
      {
        q: "Can I undo it?",
        a: "Your original file is never modified. The result is a new file, so if you picked the wrong pages, choose again and download a fresh one.",
      },
      passwordFaq,
    ],
    related: ["extract-pdf-pages", "merge-pdf", "compress-pdf"],
  },
  {
    slug: "extract-pdf-pages",
    name: "Extract PDF pages",
    short: "Pull the pages you need into a new PDF.",
    intro: "Click the pages to keep, or type a range like 2, 5-7, then save them as a new PDF.",
    category: "organise",
    icon: "extract",
    keywords: ["pull pages", "select pages", "save pages", "split", "page range"],
    steps: [
      "Choose your PDF and wait for the page thumbnails.",
      "Click the pages to keep, or type a range such as 2, 5-7.",
      "Press Extract pages, then download the new PDF.",
    ],
    faq: [
      privacyFaq("Extracting pages"),
      {
        q: "In what order do the pages come out?",
        a: "In their original order. To change the order, use Merge PDF on the extracted pieces.",
      },
      {
        q: "Is my original file changed?",
        a: "No. You get a new file with only the pages you chose.",
      },
      passwordFaq,
    ],
    related: ["delete-pdf-pages", "merge-pdf", "compress-pdf"],
  },
];

const presets: Tool[] = COMPRESS_SIZES.map((s) => ({
  slug: `compress-pdf-to-${s.id}`,
  name: `Compress PDF to ${s.label}`,
  short: `Get a PDF under ${s.label}.`,
  intro: `Make a PDF smaller than ${s.label}. Target size is already set, and you can change it if you like.`,
  category: "compress",
  icon: "compress",
  keywords: [`${s.label} pdf`, `under ${s.label}`, `reduce pdf to ${s.label}`],
  steps: [
    "Choose your PDF.",
    `Target size is already set to ${s.label}. Change it if you need a different size.`,
    "Press Compress PDF, check the result, then download.",
  ],
  faq: [
    {
      q: `Will my PDF end up under ${s.label}?`,
      a: `Usually, but not always. If the smallest file the tool can make is still over ${s.label}, it says so and gives you that smallest file instead of pretending.`,
    },
    {
      q: "Will I lose text?",
      a: `If the file can reach ${s.label} by optimising, text stays selectable. If pages have to become images to fit, the page tells you, and the text is no longer selectable.`,
    },
    privacyFaq("Compressing"),
  ],
  related: ["compress-pdf", "merge-pdf", "delete-pdf-pages"],
  presetBytes: s.bytes,
  parent: "compress-pdf",
}));

export const TOOLS: Tool[] = [...base, ...presets];

export const getTool = (slug: string): Tool | undefined => TOOLS.find((t) => t.slug === slug);

/** Main tools only (not the compress-size pages), grouped by category, for the home page and menus. */
export function toolsByCategory(): { id: CategoryId; name: string; blurb: string; icon: IconName; tools: Tool[] }[] {
  return (Object.keys(CATEGORIES) as CategoryId[]).map((id) => ({
    id,
    ...CATEGORIES[id],
    tools: TOOLS.filter((t) => t.category === id && !t.parent),
  }));
}

export function searchTools(query: string): Tool[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return TOOLS.filter((t) => [t.name, t.short, ...t.keywords].some((s) => s.toLowerCase().includes(q)));
}

export const presetPages = (): Tool[] => TOOLS.filter((t) => t.parent === "compress-pdf");
