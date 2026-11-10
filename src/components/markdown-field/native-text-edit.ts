interface TextEdit {
  start: number;
  end: number;
  text: string;
}

/** Insert through the browser editing engine so it owns the undo transaction. */
export function insertNativeText(textarea: HTMLTextAreaElement, edit: TextEdit): boolean {
  const document = textarea.ownerDocument;
  if (typeof document.execCommand !== "function") return false;
  textarea.focus();
  textarea.setSelectionRange(edit.start, edit.end);
  const expected = textarea.value.slice(0, edit.start) + edit.text + textarea.value.slice(edit.end);
  try {
    // No value/setRangeText fallback: those cannot guarantee native undo history.
    document.execCommand("insertText", false, edit.text);
    return textarea.value === expected;
  } catch {
    // Let the caller apply its precomputed result through the state fallback.
    return false;
  }
}
