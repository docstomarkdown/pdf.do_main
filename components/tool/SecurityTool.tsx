"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FileCard } from "./FileCard";
import { PdfTool } from "./PdfTool";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextLink } from "@/components/ui/TextLink";
import { decryptPdf, encryptPdf, PASSWORD_REJECTED } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { classifyPdf, type Protection } from "@/lib/protection";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useToolJob } from "@/lib/use-tool-job";

type Mode = "encrypt" | "remove" | "unlock";

const COPY = {
  encrypt: { out: "protected", download: "Download protected PDF", busy: "Adding the password…", from: "Protect PDF", next: [] as string[] },
  remove: { out: "no-password", download: "Download PDF without a password", busy: "Removing the password…", from: "Remove PDF password", next: ["merge-pdf", "compress-pdf", "extract-pdf-pages"] },
  unlock: { out: "unlocked", download: "Download unlocked PDF", busy: "Lifting the restrictions…", from: "Unlock PDF", next: ["merge-pdf", "compress-pdf", "extract-pdf-pages"] },
};

const MIN_LENGTH = 6;

/** Add a password to a PDF, take one off (with the password), or lift restrictions from a file that opens freely. */
export function SecurityTool({ mode }: { mode: Mode }) {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} mode={mode} />}</PdfTool>;
}

function Workspace({ file, from, onChoose, mode }: { file: File; from?: string; onChoose: (file: File) => void; mode: Mode }) {
  const copy = COPY[mode];
  const [protection, setProtection] = useState<Protection | null>(null);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const job = useToolJob<{ file: File }>();
  useLeaveGuard(job.busy);

  useEffect(() => {
    const controller = new AbortController();
    classifyPdf(file, controller.signal)
      .then(setProtection)
      .catch((e) => { if (!(e instanceof DOMException && e.name === "AbortError")) setProtection("unreadable"); });
    return () => controller.abort();
  }, [file]);

  const tooShort = password !== "" && password.length < MIN_LENGTH;
  const mismatch = again !== "" && again !== password;
  const rejected = job.error === PASSWORD_REJECTED;

  function run() {
    void job.run(async ({ signal }) => {
      const buffer = await file.arrayBuffer();
      const r = mode === "encrypt" ? await encryptPdf(buffer, password, signal) : await decryptPdf(buffer, mode === "remove" ? password : undefined, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-${copy.out}.pdf`, { type: "application/pdf" }) };
    }, "Something went wrong.");
  }

  const busy = (
    <div className="min-w-0 flex-1"><JobProgress label={copy.busy} sublabel="Your file and password stay on this device." onCancel={job.cancel} /></div>
  );

  let body: ReactNode = null;
  if (protection === null) {
    body = <p role="status" className="text-ink-2">Checking the file…</p>;
  } else if (protection === "unreadable") {
    body = <Alert tone="error">This file could not be read as a PDF.</Alert>;
  } else if (mode === "encrypt") {
    body = protection !== "plain" ? (
      <Alert tone="warn">
        This PDF already has {protection === "password" ? "a password" : "restrictions"}. To add a new password, first use <TextLink href="/remove-password">Remove PDF password</TextLink> or <TextLink href="/unlock-pdf">Unlock PDF</TextLink>.
      </Alert>
    ) : (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="Password" value={password} onChange={(e) => { job.reset(); setPassword(e.target.value); }} disabled={job.busy}
            error={tooShort ? `Use at least ${MIN_LENGTH} characters.` : undefined} hint={tooShort ? undefined : `At least ${MIN_LENGTH} characters.`} />
          <PasswordField label="Type it again" value={again} onChange={(e) => { job.reset(); setAgain(e.target.value); }} disabled={job.busy}
            error={mismatch ? "The two passwords are not the same." : undefined} />
        </div>
        <p className="hint" style={{ marginTop: "-0.75rem" }}>
          Nobody can recover a forgotten password, including us: it never leaves this page. Keep it somewhere safe.
        </p>
        <ActionBar>
          {job.busy ? busy : (
            <Button size="lg" disabled={password.length < MIN_LENGTH || again !== password} onClick={run}>Add password</Button>
          )}
        </ActionBar>
      </>
    );
  } else if (mode === "remove") {
    body = protection === "plain" ? (
      <Alert tone="info">This PDF has no password, so there is nothing to remove.</Alert>
    ) : protection === "restricted" ? (
      <Alert tone="info">
        This PDF opens without a password, but it has restrictions, such as no printing or no copying. <TextLink href="/unlock-pdf">Unlock PDF</TextLink> removes those.
      </Alert>
    ) : (
      <>
        <PasswordField label="Password to open this file" value={password} onChange={(e) => { job.reset(); setPassword(e.target.value); }} disabled={job.busy}
          error={rejected ? PASSWORD_REJECTED : undefined} className="sm:w-96" />
        <p className="hint" style={{ marginTop: "-0.75rem" }}>
          You need the password. This tool cannot open a PDF without it, and nothing here tries to guess it.
        </p>
        <ActionBar>
          {job.busy ? busy : <Button size="lg" disabled={password === ""} onClick={run}>Remove password</Button>}
        </ActionBar>
      </>
    );
  } else {
    body = protection === "plain" ? (
      <Alert tone="info">This PDF has no restrictions, so there is nothing to unlock.</Alert>
    ) : protection === "password" ? (
      <Alert tone="warn">
        This PDF needs a password to open, so there is nothing to unlock until it is open. If you know the password, use <TextLink href="/remove-password">Remove PDF password</TextLink>. A PDF cannot be opened without its password.
      </Alert>
    ) : (
      <>
        <p className="text-ink-2">This PDF opens without a password but has restrictions. Unlocking saves a copy without them.</p>
        <ActionBar>
          {job.busy ? busy : <Button size="lg" onClick={run}>Remove restrictions</Button>}
        </ActionBar>
      </>
    );
  }

  const result = job.result;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} dim={job.busy} onReplace={onChoose} />

      {!result && body}
      {job.error && !rejected && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="security-result"
          url={result.url}
          file={result.file}
          fromTool={copy.from}
          nextSlugs={copy.next}
          downloadLabel={copy.download}
          onReset={() => { job.reset(); setPassword(""); setAgain(""); }}
          summary={
            <p className="text-lg">
              <strong>{mode === "encrypt" ? "Password added" : mode === "remove" ? "Password removed" : "Restrictions removed"}</strong> · {formatBytes(result.file.size)}
              {mode === "encrypt" && <span className="block text-base text-ink-2">The file needs the password you typed to open. It uses AES-256.</span>}
            </p>
          }
        />
      )}
    </div>
  );
}
