/* ZIP engine: puts several files into one ZIP with fflate (MIT, self-hosted). Classic worker, like the other engines.
   Files that are already compressed (PDF, JPEG, PNG and so on) are stored as they are; anything else is deflated.
   Input:  { files: [{ name, buffer }], time }   Output: { done: true, blob }   Progress: { progress: 0..1 } */
importScripts("/engines/vendor/fflate.umd.js");

const ALREADY_COMPRESSED = /\.(pdf|jpe?g|png|webp|gif|avif|heic|zip|docx|xlsx|pptx|mp3|mp4)$/i;

self.onmessage = (event) => {
  const { files, time } = event.data;
  try {
    const chunks = [];
    const zip = new fflate.Zip((err, chunk, final) => {
      if (err) {
        self.postMessage({ error: "The ZIP could not be made." });
        return;
      }
      chunks.push(chunk);
      if (final) self.postMessage({ done: true, blob: new Blob(chunks, { type: "application/zip" }) });
    });
    files.forEach((f, i) => {
      const entry = ALREADY_COMPRESSED.test(f.name) ? new fflate.ZipPassThrough(f.name) : new fflate.ZipDeflate(f.name, { level: 6 });
      entry.mtime = time;
      zip.add(entry);
      entry.push(new Uint8Array(f.buffer), true);
      self.postMessage({ progress: (i + 1) / files.length });
    });
    zip.end();
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
