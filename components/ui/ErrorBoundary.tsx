"use client";

import { Component, type ReactNode } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";

/**
 * Catches a crash inside a tool so the page does not go blank. The message is true by construction: the work happens
 * in this tab, so nothing was uploaded, and the original file is never changed. Nothing is logged (file names and
 * contents must never be).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Alert
        tone="error"
        title="This tool hit a problem."
        action={<Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Reload the page</Button>}
      >
        Your file was not uploaded or changed. Reload the page to try again.
      </Alert>
    );
  }
}
