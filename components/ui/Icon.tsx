import type { LucideProps } from "lucide-react";
import {
  Bookmark, Camera, ChartPie, Columns2, Crop, FileCode, FileImage, FileType, GitCompare, ImageDown, KeyRound,
  LayoutGrid, ListChecks, LockOpen, Ruler, Signature, Smartphone, Stamp, Wrench,
} from "lucide-react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Eye,
  EyeOff, File, FileDigit, FileOutput, FileText, FormInput, Hash, Highlighter, House, Image, ImagePlus, Images, Info, Lock, Menu, Merge, Minimize2, Minus, PenLine, Plus, Redo2,
  RotateCcw, RotateCw, Scissors, Search, ShieldCheck, Tags, Trash2, TriangleAlert, Type, Undo2, Upload, X, ZoomIn, ZoomOut,
} from "lucide-react";

// Icons come from lucide-react (ISC), imported one at a time so only these ship. Our names stay stable
// so tool pages and the registry never depend on the library's names. Add an icon here when a block needs it.
const icons = {
  merge: Merge,
  compress: Minimize2,
  trash: Trash2,
  extract: FileOutput,
  file: File,
  shield: ShieldCheck,
  lock: Lock,
  upload: Upload,
  download: Download,
  check: Check,
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  menu: Menu,
  close: X,
  search: Search,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  alert: TriangleAlert,
  info: Info,
  home: House,
  copy: Copy,
  undo: Undo2,
  redo: Redo2,
  "zoom-in": ZoomIn,
  "zoom-out": ZoomOut,
  rotate: RotateCw,
  "rotate-left": RotateCcw,
  eye: Eye,
  "eye-off": EyeOff,
  image: Image,
  plus: Plus,
  minus: Minus,
  split: Scissors,
  text: FileText,
  hash: Hash,
  bates: FileDigit,
  "image-plus": ImagePlus,
  type: Type,
  "form-input": FormInput,
  highlighter: Highlighter,
  pen: PenLine,
  grid: LayoutGrid,
  halves: Columns2,
  ruler: Ruler,
  bookmark: Bookmark,
  wrench: Wrench,
  "file-type": FileType,
  camera: Camera,
  phone: Smartphone,
  "file-image": FileImage,
  "image-down": ImageDown,
  "file-code": FileCode,
  stamp: Stamp,
  signature: Signature,
  "list-checks": ListChecks,
  crop: Crop,
  compare: GitCompare,
  key: KeyRound,
  "lock-open": LockOpen,
  pie: ChartPie,
  tags: Tags,
  images: Images,
};

export type IconName = keyof typeof icons;
export const ICON_NAMES = Object.keys(icons) as IconName[];

/** Decorative by default: put the meaning in the surrounding text or the button's label. */
export function Icon({ name, className = "h-5 w-5", ...rest }: { name: IconName; className?: string } & Omit<LucideProps, "ref" | "name">) {
  const Glyph = icons[name];
  return <Glyph aria-hidden="true" strokeWidth={1.75} className={className} {...rest} />;
}
