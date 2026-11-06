"use client";

import { useCallback, useReducer } from "react";

type State<T> = { past: T[]; present: T; future: T[]; pending: T | null };
type Action<T> =
  | { type: "set"; value: T }
  | { type: "preview"; value: T }
  | { type: "commit" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "set":
      return { past: [...state.past, state.pending ?? state.present], present: action.value, future: [], pending: null };
    case "preview":
      // A live change (a drag in progress): it changes what is shown, but is not a step to undo yet.
      return { ...state, present: action.value, pending: state.pending ?? state.present };
    case "commit":
      if (state.pending === null) return state;
      return { past: [...state.past, state.pending], present: state.present, future: [], pending: null };
    case "undo": {
      // A change still in progress is undone first: back to how things were before it began.
      if (state.pending !== null) return { past: state.past, present: state.pending, future: [state.present, ...state.future], pending: null };
      if (state.past.length === 0) return state;
      const past = state.past.slice(0, -1);
      return { past, present: state.past[state.past.length - 1], future: [state.present, ...state.future], pending: null };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1), pending: null };
    }
    case "reset":
      return { past: [], present: action.value, future: [], pending: null };
  }
}

/**
 * A value with undo and redo, for editors (placing a mark, ordering pages).
 *   set(v)      a finished change: one step to undo
 *   preview(v)  a change still in progress (dragging): shown at once, but not a step
 *   commit()    the change in progress is finished: now it is one step
 */
export function useHistory<T>(initial: T) {
  const [state, dispatch] = useReducer(reducer<T>, { past: [], present: initial, future: [], pending: null });
  const set = useCallback((value: T) => dispatch({ type: "set", value }), []);
  const preview = useCallback((value: T) => dispatch({ type: "preview", value }), []);
  const commit = useCallback(() => dispatch({ type: "commit" }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback((value: T) => dispatch({ type: "reset", value }), []);
  return {
    value: state.present,
    set, preview, commit, undo, redo, reset,
    canUndo: state.past.length > 0 || state.pending !== null,
    canRedo: state.future.length > 0,
  };
}
