"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { HighlightStyle, StreamLanguage, indentUnit, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { go } from "@codemirror/lang-go";
import { csharp } from "@codemirror/legacy-modes/mode/clike";

export type EditorLanguage = "cpp" | "c" | "java" | "python" | "javascript" | "go" | "csharp";

function languageExtension(language: EditorLanguage): Extension {
  switch (language) {
    case "cpp":
    case "c":
      return cpp();
    case "java":
      return java();
    case "python":
      return python();
    case "javascript":
      return javascript();
    case "go":
      return go();
    case "csharp":
      return StreamLanguage.define(csharp);
  }
}

// Màu lấy từ CSS variable trong globals.css nên tự đổi theo light/dark.
const theme = EditorView.theme({
  "&": {
    backgroundColor: "var(--muted)",
    color: "var(--fg)",
    fontSize: "13px",
    minHeight: "320px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono), ui-monospace, monospace", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--fg)", padding: "12px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--fg)" },
  ".cm-gutters": {
    backgroundColor: "var(--muted)",
    color: "var(--fg-muted)",
    border: "none",
    borderRight: "1px solid var(--line)",
  },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--primary) 6%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--fg)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--primary-soft)",
  },
  ".cm-matchingBracket": {
    backgroundColor: "var(--primary-soft)",
    outline: "1px solid var(--primary)",
  },
  ".cm-placeholder": { color: "var(--fg-muted)" },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.modifier, t.operatorKeyword], color: "var(--indigo)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--ok)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--warn)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--fg-muted)", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--primary)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--primary)" },
  { tag: [t.meta, t.processingInstruction], color: "var(--bad)" },
]);

const baseExtensions: Extension[] = [
  theme,
  syntaxHighlighting(highlight),
  indentUnit.of("    "),
  keymap.of([indentWithTab]),
];

export function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  language: EditorLanguage;
  placeholder?: string;
}) {
  const extensions = useMemo(
    () => [
      ...baseExtensions,
      languageExtension(language),
      ...(placeholder ? [placeholderExt(placeholder)] : []),
    ],
    [language, placeholder],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="none"
      indentWithTab={false}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        indentOnInput: true,
        autocompletion: false,
        foldGutter: false,
        history: true,
        tabSize: 4,
      }}
    />
  );
}
