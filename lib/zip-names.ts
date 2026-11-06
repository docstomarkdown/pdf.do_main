/**
 * Names for the files inside a ZIP. A ZIP keeps whatever name it is given, so a name must be safe to unpack (no folder
 * parts, nothing that climbs out of the target folder) and unique (two files called `scan.pdf` would overwrite each other).
 */

/** A file's name with folder parts, control characters, leading dots and trailing dots or spaces removed. Never empty. */
export function safeEntryName(name: string): string {
  const last = name.split(/[\\/]/).pop() ?? "";
  const cleaned = last.replace(/[\u0000-\u001f\u007f:*?"<>|]/g, "").trim().replace(/^\.+/, "").replace(/[. ]+$/, "");
  return cleaned || "file";
}

/** Safe names that are all different: the second `a.pdf` becomes `a (2).pdf`. Case counts as the same name, as on most disks. */
export function uniqueEntryNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((raw) => {
    const name = safeEntryName(raw);
    const dot = name.lastIndexOf(".");
    const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
    let candidate = name;
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${stem} (${n})${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

/** The ZIP's own file name, always ending in `.zip`. */
export function zipFileName(name: string): string {
  const base = safeEntryName(name.trim() === "" ? "files" : name).replace(/\.zip$/i, "");
  return `${base || "files"}.zip`;
}
