import { splitType } from "../../function-spec";
import { RESULT_MARKER, type LanguageHarness } from "../types";

function cppType(type: string): string {
  const { base, dims } = splitType(type);
  let out = { int: "int", long: "long long", double: "double", bool: "bool", string: "string" }[base];
  for (let i = 0; i < dims; i++) out = `vector<${out}>`;
  return out;
}

const PRELUDE = `#include <bits/stdc++.h>
using namespace std;
`;

const RUNTIME = `
static void __itoj_ws(const string& s, size_t& p) { while (p < s.size() && isspace((unsigned char)s[p])) p++; }
static void __itoj_read(const string& s, size_t& p, long long& v) {
    __itoj_ws(s, p);
    char* e;
    v = strtoll(s.c_str() + p, &e, 10);
    p = e - s.c_str();
}
static void __itoj_read(const string& s, size_t& p, int& v) { long long x; __itoj_read(s, p, x); v = (int)x; }
static void __itoj_read(const string& s, size_t& p, double& v) {
    __itoj_ws(s, p);
    char* e;
    v = strtod(s.c_str() + p, &e);
    p = e - s.c_str();
}
static void __itoj_read(const string& s, size_t& p, bool& v) {
    __itoj_ws(s, p);
    v = s.compare(p, 4, "true") == 0;
    p += v ? 4 : 5;
}
static void __itoj_put_utf8(string& out, unsigned code) {
    if (code < 0x80) out += (char)code;
    else if (code < 0x800) { out += (char)(0xC0 | (code >> 6)); out += (char)(0x80 | (code & 0x3F)); }
    else { out += (char)(0xE0 | (code >> 12)); out += (char)(0x80 | ((code >> 6) & 0x3F)); out += (char)(0x80 | (code & 0x3F)); }
}
static void __itoj_read(const string& s, size_t& p, string& v) {
    __itoj_ws(s, p);
    p++;
    v.clear();
    while (s[p] != '"') {
        char c = s[p++];
        if (c == '\\\\') {
            char e = s[p++];
            switch (e) {
                case 'n': v += '\\n'; break;
                case 't': v += '\\t'; break;
                case 'r': v += '\\r'; break;
                case 'b': v += '\\b'; break;
                case 'f': v += '\\f'; break;
                case 'u': __itoj_put_utf8(v, (unsigned)stoul(s.substr(p, 4), nullptr, 16)); p += 4; break;
                default: v += e;
            }
        } else v += c;
    }
    p++;
}
template <class T>
static void __itoj_read(const string& s, size_t& p, vector<T>& v) {
    v.clear();
    __itoj_ws(s, p);
    p++;
    __itoj_ws(s, p);
    if (s[p] == ']') { p++; return; }
    while (true) {
        T x;
        __itoj_read(s, p, x);
        v.push_back(x);
        __itoj_ws(s, p);
        if (s[p] == ',') { p++; continue; }
        p++;
        break;
    }
}

static void __itoj_write(ostream& o, int v) { o << v; }
static void __itoj_write(ostream& o, long long v) { o << v; }
static void __itoj_write(ostream& o, bool v) { o << (v ? "true" : "false"); }
static void __itoj_write(ostream& o, double v) {
    char buf[64];
    snprintf(buf, sizeof buf, "%.17g", v);
    o << buf;
}
static void __itoj_write(ostream& o, const string& v) {
    o << '"';
    for (unsigned char c : v) {
        if (c == '"' || c == '\\\\') o << '\\\\' << (char)c;
        else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\\\u%04x", c); o << b; }
        else o << (char)c;
    }
    o << '"';
}
template <class T>
static void __itoj_write(ostream& o, const vector<T>& v) {
    o << '[';
    for (size_t i = 0; i < v.size(); i++) {
        if (i) o << ',';
        const T& x = v[i];
        __itoj_write(o, x);
    }
    o << ']';
}
`;

export const cpp: LanguageHarness = {
  starter: (spec) =>
    [
      "// Đã có sẵn #include <bits/stdc++.h> và using namespace std;",
      "class Solution {",
      "public:",
      `    ${cppType(spec.returns)} ${spec.name}(${spec.params.map((p) => `${cppType(p.type)}& ${p.name}`).join(", ")}) {`,
      "        ",
      "    }",
      "};",
      "",
    ].join("\n"),

  build: (spec, source) => {
    const decls = spec.params
      .map(
        (p, i) =>
          `    ${cppType(p.type)} a${i};\n    { size_t p = 0; __itoj_read(lines[${i}], p, a${i}); }`,
      )
      .join("\n");
    return {
      "main.cpp": `${PRELUDE}${source}
${RUNTIME}
int main() {
    string text((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
    vector<string> lines;
    {
        string cur;
        for (char c : text) {
            if (c == '\\n') { lines.push_back(cur); cur.clear(); }
            else if (c != '\\r') cur += c;
        }
        lines.push_back(cur);
    }
    while (lines.size() < ${spec.params.length}) lines.push_back("");
${decls}
    Solution sol;
    auto res = sol.${spec.name}(${spec.params.map((_, i) => `a${i}`).join(", ")});
    cout << "\\n${RESULT_MARKER}\\n";
    __itoj_write(cout, res);
    cout << "\\n";
    cout.flush();
    return 0;
}
`,
    };
  },
};
