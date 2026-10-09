import { splitType } from "../../function-spec";
import { RESULT_MARKER, type LanguageHarness } from "../types";

function javaType(type: string): string {
  const { base, dims } = splitType(type);
  const scalar = { int: "int", long: "long", double: "double", bool: "boolean", string: "String" }[base];
  return scalar + "[]".repeat(dims);
}

const BOXED: Record<string, string> = {
  int: "Integer",
  long: "Long",
  double: "Double",
  boolean: "Boolean",
  String: "String",
};

export const java: LanguageHarness = {
  starter: (spec) =>
    [
      "class Solution {",
      `    public ${javaType(spec.returns)} ${spec.name}(${spec.params.map((p) => `${javaType(p.type)} ${p.name}`).join(", ")}) {`,
      "        ",
      "    }",
      "}",
      "",
    ].join("\n"),

  build: (spec, source) => {
    const decls = spec.params
      .map((p, i) => {
        const t = javaType(p.type);
        const cast = BOXED[t] ?? t;
        return `        ${t} a${i} = (${cast}) r.val(${t}.class);\n        r.next();`;
      })
      .join("\n");
    return {
      "Main.java": `import java.util.*;
${source}

public class Main {
    static class Reader {
        final String[] lines;
        int line = 0;
        String s = "";
        int pos = 0;

        Reader(String[] lines) {
            this.lines = lines;
            this.s = lines.length > 0 ? lines[0] : "";
        }

        void next() {
            line++;
            s = line < lines.length ? lines[line] : "";
            pos = 0;
        }

        void ws() {
            while (pos < s.length() && Character.isWhitespace(s.charAt(pos))) pos++;
        }

        String number() {
            ws();
            int start = pos;
            while (pos < s.length() && "+-0123456789.eE".indexOf(s.charAt(pos)) >= 0) pos++;
            return s.substring(start, pos);
        }

        String str() {
            ws();
            pos++;
            StringBuilder sb = new StringBuilder();
            while (s.charAt(pos) != '"') {
                char c = s.charAt(pos++);
                if (c == '\\\\') {
                    char e = s.charAt(pos++);
                    switch (e) {
                        case 'n': sb.append('\\n'); break;
                        case 't': sb.append('\\t'); break;
                        case 'r': sb.append('\\r'); break;
                        case 'b': sb.append('\\b'); break;
                        case 'f': sb.append('\\f'); break;
                        case 'u': sb.append((char) Integer.parseInt(s.substring(pos, pos + 4), 16)); pos += 4; break;
                        default: sb.append(e);
                    }
                } else sb.append(c);
            }
            pos++;
            return sb.toString();
        }

        Object val(Class<?> t) {
            if (t == int.class) return Integer.parseInt(number());
            if (t == long.class) return Long.parseLong(number());
            if (t == double.class) return Double.parseDouble(number());
            if (t == boolean.class) {
                ws();
                boolean b = s.startsWith("true", pos);
                pos += b ? 4 : 5;
                return b;
            }
            if (t == String.class) return str();
            Class<?> et = t.getComponentType();
            List<Object> items = new ArrayList<>();
            ws();
            pos++;
            ws();
            if (s.charAt(pos) == ']') pos++;
            else {
                while (true) {
                    items.add(val(et));
                    ws();
                    if (s.charAt(pos) == ',') { pos++; continue; }
                    pos++;
                    break;
                }
            }
            Object arr = java.lang.reflect.Array.newInstance(et, items.size());
            for (int i = 0; i < items.size(); i++) java.lang.reflect.Array.set(arr, i, items.get(i));
            return arr;
        }
    }

    static void write(StringBuilder sb, Object o) {
        if (o instanceof String) {
            sb.append('"');
            for (char c : ((String) o).toCharArray()) {
                if (c == '"' || c == '\\\\') sb.append('\\\\').append(c);
                else if (c < 0x20) sb.append(String.format("\\\\u%04x", (int) c));
                else sb.append(c);
            }
            sb.append('"');
        } else if (o.getClass().isArray()) {
            sb.append('[');
            int n = java.lang.reflect.Array.getLength(o);
            for (int i = 0; i < n; i++) {
                if (i > 0) sb.append(',');
                write(sb, java.lang.reflect.Array.get(o, i));
            }
            sb.append(']');
        } else sb.append(o);
    }

    public static void main(String[] args) throws Exception {
        java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int n;
        while ((n = System.in.read(chunk)) > 0) buf.write(chunk, 0, n);
        String[] lines = new String(buf.toByteArray(), "UTF-8").split("\\n", -1);
        Reader r = new Reader(lines);
${decls}
        ${javaType(spec.returns)} res = new Solution().${spec.name}(${spec.params.map((_, i) => `a${i}`).join(", ")});
        StringBuilder sb = new StringBuilder();
        write(sb, res);
        System.out.print("\\n${RESULT_MARKER}\\n" + sb + "\\n");
        System.out.flush();
    }
}
`,
    };
  },
};
