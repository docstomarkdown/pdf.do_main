// Single source of truth for every tool page. The home page, navigation, footer, related links,
// search and the compress-size pages are all generated from this list. To add a tool, add an
// entry here, then build its page and component (see AGENTS.md, "Adding a tool").
import type { IconName } from "@/components/ui/Icon";

export type CategoryId = "organise" | "to-pdf" | "from-pdf" | "edit" | "security" | "compress";

export const CATEGORIES: Record<CategoryId, { name: string; blurb: string; icon: IconName }> = {
  organise: { name: "Merge, split and organise", blurb: "Combine files, split them up, and choose which pages to keep.", icon: "merge" },
  "to-pdf": { name: "Convert to PDF", blurb: "Make a PDF from pictures.", icon: "images" },
  "from-pdf": { name: "Convert from PDF", blurb: "Turn pages into pictures, or pull out the text.", icon: "extract" },
  edit: { name: "Edit", blurb: "Turn pages, number them and change the document details.", icon: "rotate" },
  security: { name: "Security", blurb: "Add a password, take one off, or lift restrictions.", icon: "lock" },
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
  a: "Not directly. The tool says so if it meets one. If you know the password, use Remove PDF password first, then come back with the copy it saves.",
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

  {
    slug: "split-pdf",
    name: "Split PDF",
    short: "Split one PDF into several: a file per page, per range, or in equal parts.",
    intro: "Choose how to cut the file: every page on its own, ranges you type such as 1-3, 4-6, or equal parts. You get every file, and one ZIP of them all.",
    category: "organise",
    icon: "split",
    keywords: ["divide", "separate", "cut", "break up", "pages to files"],
    steps: [
      "Choose your PDF.",
      "Pick how to split: every page, ranges you type, or equal parts.",
      "Press Split, then download the files one by one or all together as a ZIP.",
    ],
    faq: [
      privacyFaq("Splitting"),
      { q: "How many files can it make?", a: "Up to 500 in one go. If your choice would make more, the page says so and waits for you to change it." },
      { q: "Are bookmarks and form fields kept?", a: "Pages are copied as they are. Bookmarks and interactive form fields from the original may not carry over to the new files." },
      { q: "Can I split by file size or by bookmarks?", a: "Not yet. This tool splits by page, by ranges you type, and into equal parts." },
      passwordFaq,
    ],
    related: ["extract-pdf-pages", "delete-pdf-pages", "merge-pdf"],
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    short: "Turn pages a quarter or half turn, all of them or just the ones you pick.",
    intro: "Press Turn left or Turn right and watch the thumbnails turn. Select pages first to turn only those, or turn every page at once.",
    category: "edit",
    icon: "rotate",
    keywords: ["turn", "flip", "sideways", "landscape", "portrait", "upside down"],
    steps: [
      "Choose your PDF and wait for the page thumbnails.",
      "Select the pages to turn, or leave none selected to turn every page, then press Turn left, Turn right or Turn 180°.",
      "Press Save rotated PDF, then download the result.",
    ],
    faq: [
      privacyFaq("Rotating"),
      { q: "Does it change the content of the pages?", a: "No. It sets each page's rotation and leaves everything drawn on the page as it was." },
      { q: "What if a page is already turned?", a: "The new turn is added to the page's existing rotation, so what you see in the thumbnails is what you get." },
      passwordFaq,
    ],
    related: ["page-numbers", "extract-pdf-pages", "merge-pdf"],
  },
  {
    slug: "page-numbers",
    name: "Add page numbers",
    short: "Put a number on each page, where you want it, in the style you like.",
    intro: "Choose a position, a style and a starting number. The preview shows the number on the page as you change things.",
    category: "edit",
    icon: "hash",
    keywords: ["number pages", "pagination", "page count", "footer", "header"],
    steps: [
      "Choose your PDF.",
      "Pick the position, style, size and starting number. Skip the cover if you like.",
      "Press Number pages, then download the result.",
    ],
    faq: [
      privacyFaq("Numbering"),
      { q: "Does it change the text already on the page?", a: "No. The number is added on top of each page. Check the preview so it does not land on something already there." },
      { q: "How is the count worked out?", a: "The count runs over the pages that get a number. If you skip the first page, the second page is the first one numbered, and \u201cof\u201d shows the number on the last numbered page." },
      { q: "Which font is used?", a: "Helvetica, one of the fonts every PDF reader has, so the numbers look the same everywhere." },
      passwordFaq,
    ],
    related: ["rotate-pdf", "edit-pdf-metadata", "merge-pdf"],
  },
  {
    slug: "bates-numbering",
    name: "Bates numbering",
    short: "Stamp every page with an identifier such as ABC000123, counted up page by page.",
    intro: "Type a prefix, pick how many digits, and choose the number to start from. Every page gets the next identifier, and the preview shows it in place as you change things.",
    category: "edit",
    icon: "bates",
    keywords: ["bates stamp", "bates number", "bates numbers", "legal numbering", "exhibit", "discovery", "document production", "page identifier", "stamp pages"],
    steps: [
      "Choose your PDF.",
      "Type the prefix, pick the number of digits and the starting number, and choose where it goes on the page.",
      "Press Number pages, then download the result.",
    ],
    faq: [
      privacyFaq("Numbering"),
      { q: "What is a Bates number?", a: "An identifier stamped on every page of a set of documents, so that each page can be cited exactly. It is usually a short prefix, a number padded with zeros, and sometimes a suffix, such as ABC000123." },
      { q: "Can one sequence run across several files?", a: "One file at a time. When a file is done, the page shows the last identifier it wrote and the number to start the next file from, so the sequence carries on." },
      { q: "Which characters can the prefix and suffix use?", a: "Latin letters, digits, spaces and common punctuation. Other scripts are not supported yet, and the page tells you before anything is written. A character is never swapped for another." },
      { q: "What if the number needs more digits than I picked?", a: "It is written in full. With three digits, the page after 999 gets 1000." },
      { q: "Does it change the text already on the page?", a: "No. The identifier is added on top of each page. Check the preview so it does not land on something already there." },
      { q: "Which font is used?", a: "Helvetica, one of the fonts every PDF reader has, so the identifiers look the same everywhere." },
      passwordFaq,
    ],
    related: ["page-numbers", "add-watermark", "merge-pdf"],
  },
  {
    slug: "edit-pdf-metadata",
    name: "Edit PDF metadata",
    short: "See and change the title, author and other details stored in a PDF.",
    intro: "Every PDF can carry a title, an author, a subject, keywords and the names of the programs that made it. Read them, change them or clear them, and save a copy.",
    category: "edit",
    icon: "tags",
    keywords: ["properties", "document info", "author", "title", "keywords", "remove metadata"],
    steps: [
      "Choose your PDF and wait for its details to appear.",
      "Change any field, or press Clear all fields to empty them.",
      "Press Save changes, then download the copy.",
    ],
    faq: [
      privacyFaq("Editing"),
      { q: "Does clearing the fields make a file anonymous?", a: "No. It empties the document information fields only. A file may also carry an XMP metadata block, which this tool reports but does not change, and the pages themselves can name people. Check the file before you share it." },
      { q: "Are the dates changed?", a: "No. The created and last-changed dates are shown for your information and stay as they are." },
      passwordFaq,
    ],
    related: ["page-numbers", "rotate-pdf", "compress-pdf"],
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    short: "Put pictures on pages, one per page, in the order you choose.",
    intro: "Choose JPG, PNG, WebP, GIF or BMP pictures, put them in order, pick a page size and margin, and download one PDF.",
    category: "to-pdf",
    icon: "images",
    keywords: ["jpg to pdf", "png to pdf", "photos to pdf", "picture to pdf", "image to pdf", "scan to pdf"],
    steps: [
      "Choose your pictures, or drop them on the page.",
      "Put them in order with the arrows, and remove any you don't need.",
      "Pick a page size and margin, press Make a PDF, then download it.",
    ],
    faq: [
      privacyFaq("Making the PDF"),
      { q: "Is the picture quality kept?", a: "JPEG and PNG pictures go into the PDF exactly as they are; a JPEG is never recompressed. Other formats are converted to PNG first, which loses nothing." },
      { q: "Why is my photo not turned the wrong way?", a: "Phone photos are often stored sideways with a note saying how to show them. The tool reads that note and puts the picture upright." },
      { q: "Can I use iPhone HEIC photos?", a: "Not yet. Browsers cannot read HEIC files, so the tool says it cannot read them. Share them as JPEG from your phone, or convert them first." },
      { q: "How big is each picture on the page?", a: "On a fixed page size a picture is shrunk to fit inside the margins and centred, never enlarged. With Fit image, each page is the size of its picture." },
    ],
    related: ["merge-pdf", "compress-pdf", "rotate-pdf"],
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    short: "Turn PDF pages into JPG pictures, all of them or the ones you pick.",
    intro: "Pick the pages and a resolution, and get one JPG for each page, with a ZIP of the lot.",
    category: "from-pdf",
    icon: "image",
    keywords: ["pdf to image", "pdf to jpeg", "convert pdf to picture", "save pages as images"],
    steps: [
      "Choose your PDF and wait for the page thumbnails.",
      "Pick a resolution, and choose pages if you don't want them all.",
      "Press Convert, then save the pictures one by one or all together as a ZIP.",
    ],
    faq: [
      privacyFaq("Converting"),
      { q: "Which resolution should I pick?", a: "Standard (150 dpi) suits screens and sharing. High (300 dpi) is for printing and makes much larger files. Small (72 dpi) is for thumbnails." },
      { q: "What if a page is very large?", a: "A browser can only hold a picture of about 16 million pixels. A page bigger than that at your resolution is drawn smaller, and the result says how many were." },
      { q: "Is the text still selectable?", a: "No. A picture of a page is only pixels. Use Extract text if you need the words." },
      passwordFaq,
    ],
    related: ["pdf-to-png", "extract-text", "extract-pdf-pages"],
  },
  {
    slug: "pdf-to-png",
    name: "PDF to PNG",
    short: "Turn PDF pages into sharp PNG pictures, all of them or the ones you pick.",
    intro: "Pick the pages and a resolution, and get one PNG for each page, with a ZIP of the lot. PNG keeps hard edges, such as text and line art, perfectly sharp.",
    category: "from-pdf",
    icon: "image",
    keywords: ["pdf to image", "convert pdf to picture", "save pages as images", "lossless"],
    steps: [
      "Choose your PDF and wait for the page thumbnails.",
      "Pick a resolution, and choose pages if you don't want them all.",
      "Press Convert, then save the pictures one by one or all together as a ZIP.",
    ],
    faq: [
      privacyFaq("Converting"),
      { q: "PNG or JPG?", a: "PNG is lossless and best for text and diagrams, but the files are larger. JPG is smaller and better for photos." },
      { q: "Are the backgrounds transparent?", a: "No. Pages are drawn on white, so the pictures have no transparent areas." },
      { q: "What if a page is very large?", a: "A browser can only hold a picture of about 16 million pixels. A page bigger than that at your resolution is drawn smaller, and the result says how many were." },
      passwordFaq,
    ],
    related: ["pdf-to-jpg", "extract-text", "extract-pdf-pages"],
  },
  {
    slug: "extract-text",
    name: "Extract text from PDF",
    short: "Copy or download the text stored in a PDF.",
    intro: "Reads the text stored in the file and gives it back as plain text you can read, copy or download.",
    category: "from-pdf",
    icon: "text",
    keywords: ["pdf to text", "pdf to txt", "copy text", "get text out of pdf"],
    steps: [
      "Choose your PDF.",
      "Leave the pages empty for all of them, or type the pages you want.",
      "Press Extract text, then read it here, copy it or download it as a .txt file.",
    ],
    faq: [
      privacyFaq("Reading"),
      { q: "Why is the text missing or empty?", a: "A scanned PDF is made of pictures of pages, not text. This tool reads the text stored in the file and cannot read pictures. The result names the pages that have none. Reading text from pictures (OCR) is not built yet." },
      { q: "Will the layout be kept?", a: "No. You get the text in the order the file stores it, with line breaks where lines end. Columns and tables come out as plain lines." },
      passwordFaq,
    ],
    related: ["pdf-to-jpg", "extract-pdf-pages", "split-pdf"],
  },

  {
    slug: "encrypt-pdf",
    name: "Protect PDF with a password",
    short: "Add a password so the PDF cannot be opened without it.",
    intro: "Choose a password and get a copy that asks for it before it opens. The password is applied in your browser and never leaves it.",
    category: "security",
    icon: "lock",
    keywords: ["password protect", "encrypt pdf", "lock pdf", "add password", "secure pdf"],
    steps: [
      "Choose your PDF.",
      "Type a password twice. It needs at least 6 characters.",
      "Press Add password, then download the protected copy.",
    ],
    faq: [
      privacyFaq("Adding the password"),
      { q: "What if I forget the password?", a: "It cannot be recovered. We never see it, and nobody else can open the file without it. Keep it somewhere safe, and keep your original file." },
      { q: "How strong is it?", a: "The file is encrypted with AES-256, the strongest standard PDF encryption. A short or common password is still easy to guess, so choose a long one." },
      { q: "Can I stop people printing or copying?", a: "This tool sets one password for opening the file. It does not set separate printing or copying restrictions: anyone with the password has full access." },
      { q: "Can I protect a file that already has a password?", a: "Not directly. Remove the old password first with Remove PDF password, then add the new one." },
    ],
    related: ["remove-password", "unlock-pdf", "merge-pdf"],
  },
  {
    slug: "remove-password",
    name: "Remove PDF password",
    short: "Open a PDF with its password and save a copy that needs none.",
    intro: "Type the password for a protected PDF and get a copy that opens without one. You need the password: this tool cannot open a file without it.",
    category: "security",
    icon: "lock",
    keywords: ["unlock pdf with password", "decrypt pdf", "remove pdf password", "open protected pdf"],
    steps: [
      "Choose your protected PDF.",
      "Type its password.",
      "Press Remove password, then download the copy.",
    ],
    faq: [
      privacyFaq("Removing the password"),
      { q: "Can you open a PDF whose password I do not know?", a: "No. Nothing here tries to guess or crack passwords, and a PDF cannot be opened without its password." },
      { q: "What if the file opens but will not let me print or copy?", a: "That is a restriction, not a password. Use Unlock PDF, which lifts restrictions from a file that opens freely." },
      { q: "Is the password sent anywhere?", a: "No. It is used in your browser tab and discarded when the job ends." },
    ],
    related: ["unlock-pdf", "encrypt-pdf", "merge-pdf"],
  },
  {
    slug: "unlock-pdf",
    name: "Unlock PDF",
    short: "Lift restrictions such as no printing or no copying from a PDF that opens freely.",
    intro: "Some PDFs open without a password but forbid printing, copying or editing. Unlock saves a copy without those restrictions.",
    category: "security",
    icon: "lock",
    keywords: ["remove restrictions", "enable printing", "enable copying", "remove owner password", "pdf permissions"],
    steps: [
      "Choose your PDF.",
      "The page checks whether it has restrictions.",
      "Press Remove restrictions, then download the copy.",
    ],
    faq: [
      privacyFaq("Unlocking"),
      { q: "Does this open a PDF that asks for a password?", a: "No. A PDF that asks for a password cannot be opened without it. If you know the password, use Remove PDF password." },
      { q: "Is it right to remove restrictions?", a: "Use it on files you have the right to change, such as your own documents or ones you were given permission to edit. Restrictions may exist for a reason." },
    ],
    related: ["remove-password", "encrypt-pdf", "extract-pdf-pages"],
  },

  {
    slug: "organize-pages",
    name: "Organise PDF pages",
    short: "Reorder, turn and delete pages on one grid of thumbnails, then save the new PDF.",
    intro: "Pick a page, then move it earlier or later, turn it or delete it. Undo and redo are there, and nothing needs dragging.",
    category: "organise",
    icon: "merge",
    keywords: ["reorder pages", "rearrange pages", "move pages", "sort pages", "page order"],
    steps: [
      "Choose your PDF and wait for the page thumbnails.",
      "Select a page, then use Move earlier, Move later, Rotate or Delete page. Undo anything you regret.",
      "Press Save new PDF, then download the result.",
    ],
    faq: [
      privacyFaq("Organising"),
      { q: "Can I drag pages to reorder them?", a: "Not yet. Select a page and use the buttons: they work with a keyboard and a screen reader too, and each change is announced." },
      { q: "Can I add pages from another file?", a: "Not here. Use Merge PDF to combine files first, then organise the result." },
      { q: "Does it change the pages themselves?", a: "No. Pages are copied as they are. Turning a page sets its rotation and leaves what is drawn on it alone." },
      passwordFaq,
    ],
    related: ["rotate-pdf", "delete-pdf-pages", "merge-pdf"],
  },
  {
    slug: "split-pdf-in-half",
    name: "Split PDF in half",
    short: "Cut every page in two, or cut the whole document into two files.",
    intro: "For a scanned two-page spread, cut each page down the middle and get one PDF with twice the pages. Or split the document into a first half and a second half.",
    category: "organise",
    icon: "split",
    keywords: ["cut pages in half", "split scanned spread", "two pages per sheet", "divide pdf in two"],
    steps: [
      "Choose your PDF.",
      "Choose Each page or The document, and for pages, whether to cut left and right or top and bottom.",
      "Press the button, then download the result.",
    ],
    faq: [
      privacyFaq("Cutting"),
      { q: "Is the other half deleted from each page?", a: "No. Each half page is shown by setting the page's visible area, so what lies outside it stays hidden inside the file. Use Extract or Delete pages if you need whole pages removed." },
      { q: "Does it work on turned pages?", a: "Yes. The cut follows the page as you see it, so left and right mean what they say even when a page is stored turned." },
      { q: "Which half comes first?", a: "The left half before the right, and the top half before the bottom, as you would read them." },
      passwordFaq,
    ],
    related: ["split-pdf", "rotate-pdf", "organize-pages"],
  },
  {
    slug: "crop-pdf",
    name: "Crop PDF",
    short: "Cut the margins off pages, with a preview that shades what will go.",
    intro: "Move the four sliders to choose how much to cut from each edge. The preview shades the part that will go. Crop every page or only the ones you type.",
    category: "edit",
    icon: "extract",
    keywords: ["trim pdf", "cut margins", "remove white space", "crop pages", "resize page"],
    steps: [
      "Choose your PDF.",
      "Move the Top, Bottom, Left and Right sliders and watch the preview.",
      "Press Crop PDF, then download the result.",
    ],
    faq: [
      privacyFaq("Cropping"),
      { q: "Is the cut-off area deleted?", a: "No. It is hidden, not deleted: the content is still inside the file. Do not use cropping to remove anything private; use Delete PDF pages for whole pages." },
      { q: "Can I resize the pages to A4 or Letter?", a: "Not yet. This tool crops only." },
      { q: "Does it work on turned pages?", a: "Yes. The sliders follow the page as you see it, so Top is the top of the page on screen." },
      passwordFaq,
    ],
    related: ["rotate-pdf", "split-pdf-in-half", "organize-pages"],
  },

  {
    slug: "pdf-size-analyzer",
    name: "PDF size analyzer",
    short: "See what makes a PDF big: pictures, fonts, page content, and its biggest pictures.",
    intro: "Choose a PDF and see where its bytes go, as a bar and a list, with its biggest pictures named. Nothing is changed; it only reads.",
    category: "compress",
    icon: "compress",
    keywords: ["why is my pdf so big", "pdf file size", "what is taking space", "pdf size breakdown", "large pdf"],
    steps: ["Choose your PDF.", "Read the bar and the list: pictures, fonts, page content and the rest.", "If pictures are most of the file, open Compress PDF."],
    faq: [
      privacyFaq("Measuring"),
      { q: "How are the sizes worked out?", a: "By adding up the stored, compressed size of each kind of data in the file. \u201cStructure and the rest\u201d is what remains of the file once those are taken out, including anything packed in compressed groups, so it is an upper bound, not an exact count." },
      { q: "Does it change my file?", a: "No. It only reads it, and nothing is saved or sent." },
      passwordFaq,
    ],
    related: ["compress-pdf", "extract-text", "split-pdf-by-size"],
  },
  {
    slug: "txt-to-pdf",
    name: "Text to PDF",
    short: "Type or paste text, or open a .txt file, and get a PDF.",
    intro: "Lay plain text out on pages in a font, size and margin you choose, and download the PDF.",
    category: "to-pdf",
    icon: "text",
    keywords: ["txt to pdf", "text file to pdf", "plain text to pdf", "notes to pdf"],
    steps: ["Type or paste your text, or open a .txt file.", "Choose the page size, margin, font and text size.", "Press Make PDF, then download it."],
    faq: [
      privacyFaq("Making the PDF"),
      { q: "Can I use accents, Cyrillic, Chinese or emoji?", a: "Latin letters with accents, yes (the standard PDF fonts cover Western European text). Other scripts and emoji are not supported yet: those characters come out as \u201c?\u201d and the page tells you how many." },
      { q: "Is there a size limit?", a: "Text files over 5 MB are refused. A long text simply makes more pages." },
      { q: "Is formatting kept?", a: "No: it is plain text. Line breaks are kept, long lines wrap, and tabs become four spaces." },
    ],
    related: ["images-to-pdf", "merge-pdf", "page-numbers"],
  },
  {
    slug: "extract-images",
    name: "Extract images from PDF",
    short: "Pull the pictures out of a PDF and save them as PNG files.",
    intro: "Choose a PDF and get every picture on its pages as a PNG, with a ZIP of the lot. Tiny pictures such as icons are left out.",
    category: "from-pdf",
    icon: "image",
    keywords: ["save images from pdf", "get pictures out of pdf", "pdf images", "extract photos"],
    steps: ["Choose your PDF.", "Leave the pages empty for all of them, or type the pages to look at.", "Press Extract pictures, then save them one by one or as a ZIP."],
    faq: [
      privacyFaq("Extracting"),
      { q: "Why are the files PNG and so large?", a: "Pictures are saved as PNG, which loses nothing but is bigger than the JPEG some were stored as. The page says so." },
      { q: "Why did it find nothing?", a: "A scanned PDF is one big picture per page, and a PDF of text and shapes has none. PDF to JPG saves whole pages as pictures." },
      { q: "Will a logo on every page be saved every time?", a: "Yes, once for each page it appears on." },
      passwordFaq,
    ],
    related: ["pdf-to-jpg", "pdf-to-png", "extract-text"],
  },
  {
    slug: "split-pdf-by-size",
    name: "Split PDF by size",
    short: "Split a PDF into files that are each no bigger than a size you choose.",
    intro: "Choose a largest file size, such as 5 MB, and get as few files as possible that fit it, with the pages kept in order.",
    category: "organise",
    icon: "split",
    keywords: ["split pdf under 5mb", "pdf too big to email", "divide pdf by megabytes", "split large pdf"],
    steps: ["Choose your PDF.", "Type the largest file size you want.", "Press Split PDF, then download the files or the ZIP."],
    faq: [
      privacyFaq("Splitting"),
      { q: "Will every file be under the limit?", a: "Almost always. If one page is bigger than the limit on its own, it gets a file to itself and the page marks it as over the limit." },
      { q: "Are the files exactly the size I typed?", a: "No: they are at most that size. Pages are packed in order until the next would not fit." },
      passwordFaq,
    ],
    related: ["split-pdf", "compress-pdf", "split-pdf-in-half"],
  },

  {
    slug: "add-watermark",
    name: "Add watermark to PDF",
    short: "Write text such as DRAFT or CONFIDENTIAL across pages, placed where you want it.",
    intro: "Type the text, choose a colour, size and angle, and drag it where you want on the preview. Mark every page or only the ones you type.",
    category: "edit",
    icon: "text",
    keywords: ["stamp pdf", "draft watermark", "confidential watermark", "text watermark", "mark pdf pages"],
    steps: ["Choose your PDF.", "Type the text, then drag it on the preview or pick a position, and set its colour, size and strength.", "Press Add watermark, then download the result."],
    faq: [
      privacyFaq("Marking"),
      { q: "Can I use a picture or a logo?", a: "Not yet. This tool writes text only." },
      { q: "Can I use accents or other alphabets?", a: "Latin letters with accents, yes. Other scripts are not supported yet: those characters show as \u201c?\u201d and the result says how many." },
      { q: "Can the watermark be removed afterwards?", a: "It is drawn into the page, so it is not a separate layer you can switch off, but a person with PDF editing software may still be able to remove it. Do not rely on it to protect a document." },
      passwordFaq,
    ],
    related: ["page-numbers", "rotate-pdf", "crop-pdf"],
  },

  {
    slug: "split-pdf-by-bookmarks",
    name: "Split PDF by bookmarks",
    short: "Split a PDF into a file for each top-level bookmark, such as one per chapter.",
    intro: "Many long PDFs carry bookmarks, a clickable outline in the side panel. Each top-level bookmark starts a new file that runs to the next one.",
    category: "organise",
    icon: "split",
    keywords: ["split by chapter", "split pdf at bookmarks", "pdf outline split", "chapters to files"],
    steps: ["Choose your PDF. The page reads its bookmarks and lists the files it would make.", "Check the list.", "Press Split, then download the files or the ZIP."],
    faq: [
      privacyFaq("Splitting"),
      { q: "What if my PDF has no bookmarks?", a: "The page says so. Use Split PDF to cut by page numbers instead." },
      { q: "Are nested bookmarks used?", a: "No. Only the top level starts a new file, so a chapter with sections stays whole." },
      { q: "What about pages before the first bookmark?", a: "They become a file of their own, named \u201cBefore the first bookmark\u201d." },
      passwordFaq,
    ],
    related: ["split-pdf", "split-pdf-by-size", "split-pdf-in-half"],
  },

  {
    slug: "sign-pdf",
    name: "Sign PDF",
    short: "Draw, type or upload your signature and place it on a page.",
    intro: "Make your signature, drag it where it belongs on the page, size it, and download the signed copy. It is a picture of your signature, not a digital signature.",
    category: "edit",
    icon: "tags",
    keywords: ["e-sign pdf", "add signature to pdf", "sign document", "draw signature", "electronic signature", "signature background remover", "transparent signature", "signature maker"],
    steps: ["Choose your PDF.", "Draw your signature, type your name, or upload a picture of it.", "Drag it into place on the preview, size it, then press Add signature and download."],
    faq: [
      privacyFaq("Signing"),
      { q: "Is this a legally binding digital signature?", a: "It is a picture of your signature on the page, the same as signing a printout and scanning it. It carries no certificate and cannot prove the file was not changed afterwards. Whether that is enough depends on who asked for the signature." },
      { q: "Is my signature stored?", a: "No. It exists in this browser tab while you use the page, and nothing is saved or sent." },
      { q: "Can I use a photo of my signature on paper?", a: "Yes. Upload the photo or scan and the paper behind the ink is taken out, so only the pen strokes go on the page, without a pale box around them. A slider sets how much is removed, and you can switch it off to use the picture as it is. It works best on plain paper with a dark pen." },
      { q: "Can I sign several pages?", a: "Yes: the page shown, the last page, or every page, all in the same place." },
      passwordFaq,
    ],
    related: ["add-watermark", "page-numbers", "merge-pdf"],
  },
  {
    slug: "add-image",
    name: "Add image to PDF",
    short: "Put a picture, such as a logo or a stamp, on the pages of a PDF.",
    intro: "Choose a picture, drag it where it belongs on the page and size it. Put it on one page, on every page, or on the pages you type.",
    category: "edit",
    icon: "image-plus",
    keywords: ["insert image", "add picture", "add logo", "add photo", "insert picture", "stamp image", "logo on every page"],
    steps: ["Choose your PDF.", "Choose the picture, then drag it into place on the preview and size it.", "Pick the pages it goes on, press Add picture, then download."],
    faq: [
      privacyFaq("Adding the picture"),
      { q: "Which pictures can I use?", a: "JPEG, PNG, WebP, GIF and BMP. A JPEG or PNG goes in exactly as it is, so a JPEG is not compressed again and a PNG keeps its see-through areas. The other formats are stored as PNG." },
      { q: "Can I add more than one picture?", a: "One picture per run, on as many pages as you like. For a second picture, download the result and open it here again." },
      { q: "Can the picture be taken off later?", a: "Not with this tool. It becomes part of each page, so keep your original file." },
      { q: "Does it cover what is under it?", a: "Yes, unless the picture has see-through areas. Check the preview before you save." },
      passwordFaq,
    ],
    related: ["add-watermark", "sign-pdf", "images-to-pdf"],
  },
  {
    slug: "add-text",
    name: "Add text to PDF",
    short: "Type text onto the pages of a PDF, in as many places as you need.",
    intro: "Add a text box, type into it and drag it where it belongs on the page. Use it to fill in a form that has no fields, or to add a date, a name or a note.",
    category: "edit",
    icon: "type",
    keywords: ["type on pdf", "write on pdf", "insert text", "fill pdf without fields", "add date", "add note", "text box"],
    steps: ["Choose your PDF.", "Add a text box, type your text, and drag it into place. Add more boxes on any page.", "Press Add text, then download the result."],
    faq: [
      privacyFaq("Adding the text"),
      { q: "Can I change the text that is already in the PDF?", a: "No. This tool adds new text on top of the page. It does not edit or remove what is there." },
      { q: "Can I fill in a form with it?", a: "Yes, for a form that is only a picture of boxes and lines: put a text box on each blank. If the PDF has real form fields, Fill PDF form is the better tool." },
      { q: "Which characters and fonts can I use?", a: "The text is written in Helvetica, regular or bold, in Latin letters, digits and common punctuation. Other scripts are not supported yet, and the page tells you before anything is written." },
      { q: "Can I change the text after downloading?", a: "Not with this tool. The text becomes part of the page, so keep your original file." },
      passwordFaq,
    ],
    related: ["fill-pdf-form", "sign-pdf", "add-image"],
  },

  {
    slug: "repair-pdf",
    name: "Repair PDF",
    short: "Try to mend a PDF that will not open or opens with errors.",
    intro: "Reads the file object by object without trusting its index, and writes it out again with a fresh one, which mends many broken downloads. It cannot bring back data that is missing.",
    category: "organise",
    icon: "extract",
    keywords: ["fix pdf", "corrupt pdf", "damaged pdf", "pdf will not open", "recover pdf"],
    steps: ["Choose the damaged PDF.", "Press Repair PDF.", "Download the copy and look through it before relying on it."],
    faq: [
      privacyFaq("Repairing"),
      { q: "Will it always work?", a: "No. It can rebuild a damaged index and skip objects it cannot read, which fixes many broken downloads. If the data itself is missing, pages or pictures can be lost, and the page says when the original could not be read as it was." },
      { q: "What if it says the file is too damaged?", a: "Nothing here can recover it. Try downloading or exporting the original again." },
      passwordFaq,
    ],
    related: ["compress-pdf", "merge-pdf", "extract-pdf-pages"],
  },
  {
    slug: "scan-to-pdf",
    name: "Scan to PDF",
    short: "Photograph pages with your phone's camera and make them into one PDF.",
    intro: "Take a photo of each page, put them in order, and download one PDF. On a computer, choose pictures of your pages instead.",
    category: "to-pdf",
    icon: "images",
    keywords: ["camera to pdf", "document scanner", "phone scan", "photo to pdf", "scan documents"],
    steps: ["Press Take a photo and photograph the first page. On a computer, choose the pictures instead.", "Add the other pages, and put them in order.", "Press Make a PDF, then download it."],
    faq: [
      privacyFaq("Making the PDF"),
      { q: "Does it straighten or clean up the pages?", a: "No. Each photo goes on a page as it is. Photograph flat, in good light, from straight above." },
      { q: "Is the text searchable?", a: "No: a photo is a picture. Reading text from pictures (OCR) is not built yet." },
      { q: "Why does the camera not open on my computer?", a: "Only phones and tablets open the camera from a page like this. A computer shows the file chooser." },
    ],
    related: ["images-to-pdf", "merge-pdf", "compress-pdf"],
  },
  {
    slug: "heic-to-pdf",
    name: "HEIC to PDF",
    short: "Put iPhone HEIC photos on PDF pages, in a browser that can open them.",
    intro: "Choose HEIC photos and get one PDF. This only works in a browser that can open HEIC files, which today means Safari on an iPhone, iPad or Mac.",
    category: "to-pdf",
    icon: "images",
    keywords: ["heic to pdf", "iphone photo to pdf", "heif to pdf", "apple photos to pdf"],
    steps: ["Open this page in Safari, and choose your HEIC photos.", "Put them in order and pick a page size and margin.", "Press Make a PDF, then download it."],
    faq: [
      privacyFaq("Making the PDF"),
      { q: "Why does it say my browser cannot open HEIC?", a: "Chrome, Edge and Firefox cannot read HEIC files. Safari can. Elsewhere, share the photo as a JPEG from your phone (Settings, Photos, Transfer to Mac or PC: Automatic), then use Images to PDF." },
      { q: "Is the quality kept?", a: "The photo is drawn into the PDF as a lossless picture, so it is large. Compress PDF can shrink the result." },
    ],
    related: ["images-to-pdf", "compress-pdf", "merge-pdf"],
  },
  {
    slug: "pdf-to-markdown",
    name: "PDF to Markdown",
    short: "Turn the text of a PDF into Markdown, with headings and lists guessed.",
    intro: "Reads the text stored in the file and gives it back as Markdown, which suits notes and AI tools. Headings, lists and paragraphs are guessed, so check the result.",
    category: "from-pdf",
    icon: "text",
    keywords: ["pdf to md", "pdf to text for ai", "convert pdf to markdown", "pdf for llm"],
    steps: ["Choose your PDF.", "Leave the pages empty for all of them, or type the pages you want.", "Press Convert, then read, copy or download the .md file."],
    faq: [
      privacyFaq("Converting"),
      { q: "How are headings found?", a: "Text clearly bigger than the usual size becomes a heading, with the biggest sizes as the top levels. Lines that start with a bullet become list items. It is a guess, and some files will come out wrong." },
      { q: "Are tables, columns and bold kept?", a: "No. Tables and columns come out as lines of text, and bold, italics and links are not recognised." },
      { q: "What about scanned PDFs?", a: "A scan is pictures, not text, so there is nothing to read. Reading text from pictures (OCR) is not built yet." },
      passwordFaq,
    ],
    related: ["extract-text", "pdf-to-jpg", "extract-pdf-pages"],
  },

  {
    slug: "fill-pdf-form",
    name: "Fill PDF form",
    short: "Type into the fields of a PDF form, tick boxes, pick choices, and save a copy.",
    intro: "Open a PDF with fillable fields, fill them in here, and download the filled copy. You can keep the fields editable or make your entries permanent.",
    category: "edit",
    icon: "tags",
    keywords: ["fill out pdf", "pdf form filler", "complete form", "fillable pdf", "type into pdf"],
    steps: ["Choose your PDF form. The page lists its fields.", "Fill in the fields.", "Press Save filled PDF, then download it."],
    faq: [
      privacyFaq("Filling"),
      { q: "Why does it say there are no fields?", a: "Many forms are only a picture of a form, with nothing to type into. Sign PDF and Add watermark can put a signature or text on any page." },
      { q: "What does making the entries permanent do?", a: "It turns the fields and what you typed into part of the page. The result looks the same but can no longer be edited as a form." },
      { q: "Can I use accents or other alphabets?", a: "Latin letters with accents, yes. Other scripts are not supported yet, and the page tells you if a field cannot be saved." },
      passwordFaq,
    ],
    related: ["sign-pdf", "add-watermark", "merge-pdf"],
  },
  {
    slug: "privacy-scanner",
    name: "PDF privacy scanner",
    short: "Look through a PDF for names, locations, scripts, attachments and old versions before you share it.",
    intro: "Checks the common places a PDF carries more than its pages show, and lists what it finds. It only reads: nothing is changed or sent.",
    category: "security",
    icon: "shield",
    keywords: ["pdf metadata checker", "hidden data in pdf", "pdf gps location", "remove personal information check"],
    steps: ["Choose your PDF.", "Read the list: document details, hidden metadata, locations, attachments, scripts, comments, links and earlier versions.", "Fix what matters with the tool that fits, then scan again."],
    faq: [
      privacyFaq("Scanning"),
      { q: "Does a clear result mean the file is clean?", a: "No. It means these common checks found nothing. The words and pictures on the pages themselves are not examined, and a file can hold other traces." },
      { q: "Can it remove what it finds?", a: "Not here. Edit PDF metadata changes the document details, and Extract pages or Merge can make a new file from only the pages you want." },
      { q: "What are earlier versions?", a: "Some programs save changes on top of the old file instead of replacing it, so text that was removed can still be inside. The scan counts how many times the file was saved that way." },
      passwordFaq,
    ],
    related: ["edit-pdf-metadata", "extract-pdf-pages", "unlock-pdf"],
  },
  {
    slug: "compare-pdfs",
    name: "Compare PDFs",
    short: "Compare the text of two PDFs page by page and see what was added or removed.",
    intro: "Choose an original and a revised PDF. The page lists the lines added and removed on each page that differs. Only text is compared.",
    category: "edit",
    icon: "text",
    keywords: ["diff pdf", "compare two pdf files", "pdf difference", "what changed in pdf"],
    steps: ["Choose the original PDF and the revised PDF.", "Wait while both are read.", "Read the pages that differ: added lines are marked + and removed lines \u2212."],
    faq: [
      privacyFaq("Comparing"),
      { q: "Does it compare pictures and layout?", a: "No. It compares the text stored in each page. Two files can look different yet have the same text, or the other way round." },
      { q: "Why does it say every page differs?", a: "If a page was added or removed near the start, every later page shifts. Pages are compared in order, page 1 with page 1." },
      { q: "What about scans?", a: "A scan has no text to compare. Reading text from pictures (OCR) is not built yet." },
      passwordFaq,
    ],
    related: ["extract-text", "pdf-to-markdown", "merge-pdf"],
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
