import katex from "katex";

export function MathContent({
  content,
  className = "",
}: {
  content?: string | null;
  className?: string;
}) {
  if (!content) return null;

  const renderMathHtml = (text: string) => {
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
    return parts
      .map((part) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const math = part.slice(2, -2);
          try {
            return katex.renderToString(math, { displayMode: true, throwOnError: false });
          } catch {
            return part;
          }
        }
        if (part.startsWith("$") && part.endsWith("$")) {
          const math = part.slice(1, -1);
          try {
            return katex.renderToString(math, { displayMode: false, throwOnError: false });
          } catch {
            return part;
          }
        }
        return part
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      })
      .join("");
  };

  return (
    <div
      className={`leading-relaxed whitespace-pre-wrap ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMathHtml(content) }}
    />
  );
}
