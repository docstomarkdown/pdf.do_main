"use client";

import SignaturePad from "signature_pad";
import { useEffect, useId, useRef, useState } from "react";
import { FileDrop } from "./FileDrop";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { TextField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { removePaper } from "@/lib/clean-signature";

export type MadeSignature = { file: File; jpeg: boolean };
type Way = "draw" | "type" | "upload";

/** The smallest box that holds every non-transparent pixel of a canvas, so a signature has no empty border. */
function trimmed(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 8) { if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; }
  }
  if (right < 0) return null;
  const pad = 4;
  const out = document.createElement("canvas");
  out.width = right - left + 1 + pad * 2;
  out.height = bottom - top + 1 + pad * 2;
  out.getContext("2d")!.drawImage(canvas, left, top, right - left + 1, bottom - top + 1, pad, pad, right - left + 1, bottom - top + 1);
  return out;
}

const toFile = (canvas: HTMLCanvasElement) => new Promise<File | null>((resolve) => canvas.toBlob((b) => resolve(b ? new File([b], "signature.png", { type: "image/png" }) : null), "image/png"));

/**
 * Three ways to make a signature: draw it (signature_pad does the pen), type it, or upload a picture. `onChange` gets the
 * finished picture, or null while there is none. A drawn or typed signature is a transparent PNG trimmed to its ink.
 * An uploaded photo has its paper taken out the same way (lib/clean-signature.ts), unless that is switched off or
 * nothing darker than the paper is found: then the picture is used as it is, and the page says so.
 */
export function SignatureMaker({ onChange }: { onChange: (signature: MadeSignature | null) => void }) {
  const id = useId();
  const [way, setWay] = useState<Way>("draw");
  const [name, setName] = useState("");
  const [empty, setEmpty] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pad = useRef<SignaturePad | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [clean, setClean] = useState(true);
  const [strength, setStrength] = useState(50);
  const [note, setNote] = useState<"" | "cleaned" | "nothing">("");
  const latest = useRef(0); // the newest request to clean a photo: an older one that finishes late is dropped

  useEffect(() => {
    if (way !== "draw" || !canvas.current) return;
    const el = canvas.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    el.width = el.offsetWidth * ratio;
    el.height = el.offsetHeight * ratio;
    el.getContext("2d")!.scale(ratio, ratio);
    const instance = new SignaturePad(el, { minWidth: 1, maxWidth: 3 });
    pad.current = instance;
    const finished = async () => {
      setEmpty(instance.isEmpty());
      const box = instance.isEmpty() ? null : trimmed(el);
      const file = box ? await toFile(box) : null;
      onChange(file ? { file, jpeg: false } : null);
    };
    instance.addEventListener("endStroke", () => void finished());
    return () => { instance.off(); pad.current = null; };
  }, [way, onChange]);

  async function typed(value: string) {
    setName(value);
    if (value.trim() === "") { onChange(null); return; }
    const size = 96;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    ctx.font = `italic 700 ${size}px "Times New Roman", Georgia, serif`;
    c.width = Math.ceil(ctx.measureText(value).width) + 40;
    c.height = size * 1.6;
    ctx.font = `italic 700 ${size}px "Times New Roman", Georgia, serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(value, 20, c.height / 2);
    const box = trimmed(c);
    const file = box ? await toFile(box) : null;
    onChange(file ? { file, jpeg: false } : null);
  }

  /** Hands on the photo, with its paper taken out when asked for and possible. */
  async function apply(file: File, remove: boolean, amount: number) {
    const turn = ++latest.current;
    const asIs: MadeSignature = { file, jpeg: /jpe?g/i.test(file.type) || /\.jpe?g$/i.test(file.name) };
    if (!remove) { setNote(""); onChange(asIs); return; }
    const cleaned = await removePaper(file, amount);
    if (turn !== latest.current) return;
    setNote(cleaned ? "cleaned" : "nothing");
    onChange(cleaned ? { file: cleaned, jpeg: false } : asIs);
  }

  function uploaded(files: File[]) {
    const file = files[0];
    if (!file) return;
    setPhoto(file);
    void apply(file, clean, strength);
  }

  return (
    <div className="grid gap-4">
      <Segmented<Way> legend="Make your signature" name={`${id}-way`} value={way} onChange={(w) => { latest.current++; onChange(null); setWay(w); setName(""); setEmpty(true); setPhoto(null); setNote(""); }}
        options={[{ value: "draw", label: "Draw" }, { value: "type", label: "Type" }, { value: "upload", label: "Upload" }]} />
      {way === "draw" && (
        <div className="grid gap-2">
          <canvas ref={canvas} className="sigpad" aria-label="Signature box: draw with a finger, a pen or the mouse" data-testid="signature-pad" />
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={empty} onClick={() => { pad.current?.clear(); setEmpty(true); onChange(null); }}>Clear</Button>
            <p className="hint" style={{ marginTop: 0 }}>Draw inside the box.</p>
          </div>
        </div>
      )}
      {way === "type" && <TextField label="Your name" value={name} onChange={(e) => void typed(e.target.value)} maxLength={40} hint="It is drawn in an italic serif face." />}
      {way === "upload" && (
        <div className="grid gap-3">
          <FileDrop label={photo ? "Choose a different picture" : "Choose a picture of your signature"} accept="images" compact={!!photo} onFiles={uploaded} />
          {photo && (
            <>
              <Checkbox checked={clean} onChange={(e) => { setClean(e.target.checked); void apply(photo, e.target.checked, strength); }}>Remove the paper behind it</Checkbox>
              {clean && <Slider label="How much to remove" min={0} max={100} step={5} value={strength} onChange={(v) => { setStrength(v); void apply(photo, clean, v); }} format={(n) => `${n}%`} />}
              {note === "cleaned" && <p className="hint" style={{ marginTop: 0 }}>The paper was taken out. If some of it is left, remove more. If the pen has faded, remove less.</p>}
              {note === "nothing" && <Alert tone="warn">Nothing darker than the paper was found, so the picture is used as it is.</Alert>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
