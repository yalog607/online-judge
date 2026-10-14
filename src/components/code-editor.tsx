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

// Theme VS Code (Light+ / Dark+): màu lấy từ biến --vsc-* trong globals.css nên tự đổi theo light/dark.
const theme = EditorView.theme({
  "&": {
    backgroundColor: "var(--vsc-bg)",
    color: "var(--vsc-fg)",
    fontSize: "13px",
    minHeight: "320px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono), Consolas, 'Courier New', monospace",
    lineHeight: "1.6",
    overflow: "auto",
  },
  ".cm-content": { caretColor: "var(--vsc-cursor)", padding: "12px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--vsc-cursor)" },
  ".cm-gutters": {
    backgroundColor: "var(--vsc-bg)",
    color: "var(--vsc-gutter)",
    border: "none",
  },
  ".cm-activeLine": { backgroundColor: "var(--vsc-line)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--vsc-gutter-active)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--vsc-select)",
  },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "color-mix(in srgb, var(--vsc-fg) 15%, transparent)",
    outline: "1px solid color-mix(in srgb, var(--vsc-fg) 40%, transparent)",
  },
  ".cm-placeholder": { color: "var(--vsc-gutter)" },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.definitionKeyword], color: "var(--vsc-keyword)" },
  { tag: [t.controlKeyword, t.moduleKeyword], color: "var(--vsc-control)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--vsc-string)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--vsc-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--vsc-comment)", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--vsc-type)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--vsc-function)" },
  { tag: [t.variableName, t.propertyName, t.definition(t.variableName)], color: "var(--vsc-variable)" },
  { tag: [t.meta, t.processingInstruction], color: "var(--vsc-meta)" },
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
  height = "min(65vh, 560px)",
}: {
  value: string;
  onChange: (value: string) => void;
  language: EditorLanguage;
  placeholder?: string;
  // Chiều cao cố định: nội dung dài sẽ cuộn bên trong editor thay vì kéo dài trang.
  height?: string;
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
      height={height}
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
