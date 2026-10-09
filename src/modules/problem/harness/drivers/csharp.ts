import { splitType } from "../../function-spec";
import { RESULT_MARKER, type LanguageHarness } from "../types";

function csType(type: string): string {
  const { base, dims } = splitType(type);
  const scalar = { int: "int", long: "long", double: "double", bool: "bool", string: "string" }[base];
  return scalar + "[]".repeat(dims);
}

export const csharp: LanguageHarness = {
  starter: (spec) =>
    [
      "public class Solution {",
      `    public ${csType(spec.returns)} ${spec.name}(${spec.params.map((p) => `${csType(p.type)} ${p.name}`).join(", ")}) {`,
      "        ",
      "    }",
      "}",
      "",
    ].join("\n"),

  build: (spec, source) => {
    const decls = spec.params
      .map((p, i) => {
        const t = csType(p.type);
        return `        ${t} a${i} = (${t})r.Val(typeof(${t}));\n        r.Next();`;
      })
      .join("\n");
    return {
      "Main.cs": `using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
${source}

class ItojReader {
    string[] lines;
    int line = 0;
    string s = "";
    int pos = 0;

    public ItojReader(string[] lines) {
        this.lines = lines;
        s = lines.Length > 0 ? lines[0] : "";
    }

    public void Next() {
        line++;
        s = line < lines.Length ? lines[line] : "";
        pos = 0;
    }

    void Ws() {
        while (pos < s.Length && char.IsWhiteSpace(s[pos])) pos++;
    }

    string Number() {
        Ws();
        int start = pos;
        while (pos < s.Length && "+-0123456789.eE".IndexOf(s[pos]) >= 0) pos++;
        return s.Substring(start, pos - start);
    }

    string Str() {
        Ws();
        pos++;
        var sb = new StringBuilder();
        while (s[pos] != '"') {
            char c = s[pos++];
            if (c == '\\\\') {
                char e = s[pos++];
                switch (e) {
                    case 'n': sb.Append('\\n'); break;
                    case 't': sb.Append('\\t'); break;
                    case 'r': sb.Append('\\r'); break;
                    case 'b': sb.Append('\\b'); break;
                    case 'f': sb.Append('\\f'); break;
                    case 'u': sb.Append((char)Convert.ToInt32(s.Substring(pos, 4), 16)); pos += 4; break;
                    default: sb.Append(e); break;
                }
            } else sb.Append(c);
        }
        pos++;
        return sb.ToString();
    }

    public object Val(Type t) {
        if (t == typeof(int)) return int.Parse(Number(), CultureInfo.InvariantCulture);
        if (t == typeof(long)) return long.Parse(Number(), CultureInfo.InvariantCulture);
        if (t == typeof(double)) return double.Parse(Number(), CultureInfo.InvariantCulture);
        if (t == typeof(bool)) {
            Ws();
            bool b = string.CompareOrdinal(s, pos, "true", 0, 4) == 0;
            pos += b ? 4 : 5;
            return b;
        }
        if (t == typeof(string)) return Str();
        Type et = t.GetElementType();
        var items = new List<object>();
        Ws();
        pos++;
        Ws();
        if (s[pos] == ']') pos++;
        else {
            while (true) {
                items.Add(Val(et));
                Ws();
                if (s[pos] == ',') { pos++; continue; }
                pos++;
                break;
            }
        }
        Array arr = Array.CreateInstance(et, items.Count);
        for (int i = 0; i < items.Count; i++) arr.SetValue(items[i], i);
        return arr;
    }
}

class ItojProgram {
    static void Write(StringBuilder sb, object o) {
        if (o is string) {
            sb.Append('"');
            foreach (char c in (string)o) {
                if (c == '"' || c == '\\\\') sb.Append('\\\\').Append(c);
                else if (c < 0x20) sb.Append("\\\\u" + ((int)c).ToString("x4"));
                else sb.Append(c);
            }
            sb.Append('"');
        } else if (o is Array) {
            sb.Append('[');
            bool first = true;
            foreach (object x in (Array)o) {
                if (!first) sb.Append(',');
                first = false;
                Write(sb, x);
            }
            sb.Append(']');
        } else if (o is bool) sb.Append((bool)o ? "true" : "false");
        else if (o is double) sb.Append(((double)o).ToString("R", CultureInfo.InvariantCulture));
        else sb.Append(Convert.ToString(o, CultureInfo.InvariantCulture));
    }

    static void Main() {
        string text = Console.In.ReadToEnd();
        var r = new ItojReader(text.Split('\\n'));
${decls}
        var res = new Solution().${spec.name}(${spec.params.map((_, i) => `a${i}`).join(", ")});
        var sb = new StringBuilder();
        Write(sb, res);
        Console.Out.Write("\\n${RESULT_MARKER}\\n" + sb + "\\n");
        Console.Out.Flush();
    }
}
`,
    };
  },
};
