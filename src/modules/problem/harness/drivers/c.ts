import { splitType, type BaseType } from "../../function-spec";
import { RESULT_MARKER, type LanguageHarness } from "../types";

const C_TYPE: Record<BaseType, string> = {
  int: "int",
  long: "long long",
  double: "double",
  bool: "bool",
  string: "char*",
};

// Suffix used by the helper functions in RUNTIME (rd_<s>, arr_<s>, arr2_<s>, wr_<s>, ...).
const SUFFIX: Record<BaseType, string> = {
  int: "int",
  long: "long",
  double: "double",
  bool: "bool",
  string: "str",
};

const PRELUDE = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <math.h>
#include <ctype.h>
`;

const RUNTIME = `
static void itoj_ws(const char** p) { while (**p && isspace((unsigned char)**p)) (*p)++; }
static int rd_int(const char** p) { itoj_ws(p); char* e; long long v = strtoll(*p, &e, 10); *p = e; return (int)v; }
static long long rd_long(const char** p) { itoj_ws(p); char* e; long long v = strtoll(*p, &e, 10); *p = e; return v; }
static double rd_double(const char** p) { itoj_ws(p); char* e; double v = strtod(*p, &e); *p = e; return v; }
static bool rd_bool(const char** p) { itoj_ws(p); bool v = strncmp(*p, "true", 4) == 0; *p += v ? 4 : 5; return v; }
static char* rd_str(const char** p) {
    itoj_ws(p);
    (*p)++;
    size_t cap = 16, n = 0;
    char* out = (char*)malloc(cap);
    while (**p != '"' && **p) {
        char c = *(*p)++;
        if (c == '\\\\') {
            char e = *(*p)++;
            switch (e) {
                case 'n': c = '\\n'; break;
                case 't': c = '\\t'; break;
                case 'r': c = '\\r'; break;
                case 'b': c = '\\b'; break;
                case 'f': c = '\\f'; break;
                case 'u': {
                    char hex[5] = {(*p)[0], (*p)[1], (*p)[2], (*p)[3], 0};
                    unsigned code = (unsigned)strtoul(hex, NULL, 16);
                    *p += 4;
                    char tmp[3];
                    int len = 0;
                    if (code < 0x80) tmp[len++] = (char)code;
                    else if (code < 0x800) { tmp[len++] = (char)(0xC0 | (code >> 6)); tmp[len++] = (char)(0x80 | (code & 0x3F)); }
                    else { tmp[len++] = (char)(0xE0 | (code >> 12)); tmp[len++] = (char)(0x80 | ((code >> 6) & 0x3F)); tmp[len++] = (char)(0x80 | (code & 0x3F)); }
                    for (int i = 0; i < len; i++) {
                        if (n + 2 >= cap) { cap *= 2; out = (char*)realloc(out, cap); }
                        out[n++] = tmp[i];
                    }
                    continue;
                }
                default: c = e;
            }
        }
        if (n + 2 >= cap) { cap *= 2; out = (char*)realloc(out, cap); }
        out[n++] = c;
    }
    (*p)++;
    out[n] = 0;
    return out;
}

#define ITOJ_DEFINE_ARR(S, T) \\
static T* arr_##S(const char** p, int* n) { \\
    int cap = 4; \\
    T* a = (T*)malloc(sizeof(T) * cap); \\
    *n = 0; \\
    itoj_ws(p); (*p)++; itoj_ws(p); \\
    if (**p == ']') { (*p)++; return a; } \\
    for (;;) { \\
        if (*n == cap) { cap *= 2; a = (T*)realloc(a, sizeof(T) * cap); } \\
        a[(*n)++] = rd_##S(p); \\
        itoj_ws(p); \\
        if (**p == ',') { (*p)++; continue; } \\
        (*p)++; break; \\
    } \\
    return a; \\
} \\
static T** arr2_##S(const char** p, int* n, int** cols) { \\
    int cap = 4; \\
    T** a = (T**)malloc(sizeof(T*) * cap); \\
    *cols = (int*)malloc(sizeof(int) * cap); \\
    *n = 0; \\
    itoj_ws(p); (*p)++; itoj_ws(p); \\
    if (**p == ']') { (*p)++; return a; } \\
    for (;;) { \\
        if (*n == cap) { cap *= 2; a = (T**)realloc(a, sizeof(T*) * cap); *cols = (int*)realloc(*cols, sizeof(int) * cap); } \\
        a[*n] = arr_##S(p, &(*cols)[*n]); \\
        (*n)++; \\
        itoj_ws(p); \\
        if (**p == ',') { (*p)++; continue; } \\
        (*p)++; break; \\
    } \\
    return a; \\
} \\
static void wr1_##S(T* a, int n) { \\
    putchar('['); \\
    for (int i = 0; i < n; i++) { if (i) putchar(','); wr_##S(a[i]); } \\
    putchar(']'); \\
} \\
static void wr2_##S(T** a, int n, int* cols) { \\
    putchar('['); \\
    for (int i = 0; i < n; i++) { if (i) putchar(','); wr1_##S(a[i], cols[i]); } \\
    putchar(']'); \\
}

static void wr_int(int v) { printf("%d", v); }
static void wr_long(long long v) { printf("%lld", v); }
static void wr_double(double v) { printf("%.17g", v); }
static void wr_bool(bool v) { fputs(v ? "true" : "false", stdout); }
static void wr_str(const char* v) {
    putchar('"');
    for (const unsigned char* c = (const unsigned char*)v; *c; c++) {
        if (*c == '"' || *c == '\\\\') { putchar('\\\\'); putchar(*c); }
        else if (*c < 0x20) printf("\\\\u%04x", *c);
        else putchar(*c);
    }
    putchar('"');
}

ITOJ_DEFINE_ARR(int, int)
ITOJ_DEFINE_ARR(long, long long)
ITOJ_DEFINE_ARR(double, double)
ITOJ_DEFINE_ARR(bool, bool)
ITOJ_DEFINE_ARR(str, char*)
`;

// C has no vectors, so arrays follow the LeetCode C convention: pointer + length
// (2D adds a column-size array); array results use returnSize / returnColumnSizes.
function paramDecl(type: string, name: string): string {
  const { base, dims } = splitType(type);
  const t = C_TYPE[base];
  if (dims === 0) return `${t} ${name}`;
  if (dims === 1) return `${t}* ${name}, int ${name}Size`;
  return `${t}** ${name}, int ${name}Size, int* ${name}ColSizes`;
}

function returnDecl(type: string): { ret: string; extra: string } {
  const { base, dims } = splitType(type);
  const t = C_TYPE[base];
  if (dims === 0) return { ret: t, extra: "" };
  if (dims === 1) return { ret: `${t}*`, extra: "int* returnSize" };
  return { ret: `${t}**`, extra: "int* returnSize, int** returnColumnSizes" };
}

export const c: LanguageHarness = {
  starter: (spec) => {
    const { ret, extra } = returnDecl(spec.returns);
    const params = [...spec.params.map((p) => paramDecl(p.type, p.name)), ...(extra ? [extra] : [])];
    return [
      "// Đã có sẵn stdio.h, stdlib.h, string.h, stdbool.h, math.h, ctype.h",
      "// Mảng truyền dạng (con trỏ, độ dài); mảng trả về cấp phát bằng malloc và gán *returnSize.",
      `${ret} ${spec.name}(${params.join(", ")}) {`,
      "    ",
      "}",
      "",
    ].join("\n");
  },

  build: (spec, source) => {
    const decls: string[] = [];
    const args: string[] = [];
    spec.params.forEach((p, i) => {
      const { base, dims } = splitType(p.type);
      const t = C_TYPE[base];
      const s = SUFFIX[base];
      decls.push(`    p = lines[${i}];`);
      if (dims === 0) {
        decls.push(`    ${t} a${i} = rd_${s}(&p);`);
        args.push(`a${i}`);
      } else if (dims === 1) {
        decls.push(`    int a${i}n; ${t}* a${i} = arr_${s}(&p, &a${i}n);`);
        args.push(`a${i}`, `a${i}n`);
      } else {
        decls.push(`    int a${i}n; int* a${i}c; ${t}** a${i} = arr2_${s}(&p, &a${i}n, &a${i}c);`);
        args.push(`a${i}`, `a${i}n`, `a${i}c`);
      }
    });

    const { base, dims } = splitType(spec.returns);
    const t = C_TYPE[base];
    const s = SUFFIX[base];
    let call: string;
    let write: string;
    if (dims === 0) {
      call = `${t} res = ${spec.name}(${args.join(", ")});`;
      write = `wr_${s}(res);`;
    } else if (dims === 1) {
      call = `int rn = 0; ${t}* res = ${spec.name}(${[...args, "&rn"].join(", ")});`;
      write = `wr1_${s}(res, rn);`;
    } else {
      call = `int rn = 0; int* rc = NULL; ${t}** res = ${spec.name}(${[...args, "&rn", "&rc"].join(", ")});`;
      write = `wr2_${s}(res, rn, rc);`;
    }

    return {
      "main.c": `${PRELUDE}${source}
${RUNTIME}
int main(void) {
    size_t cap = 1 << 16, len = 0;
    char* text = (char*)malloc(cap);
    int ch;
    while ((ch = getchar()) != EOF) {
        if (len + 2 >= cap) { cap *= 2; text = (char*)realloc(text, cap); }
        text[len++] = (char)ch;
    }
    text[len] = 0;
    const char* lines[${spec.params.length}];
    {
        char* cur = text;
        for (int i = 0; i < ${spec.params.length}; i++) {
            lines[i] = cur;
            char* nl = strchr(cur, '\\n');
            if (!nl) { cur += strlen(cur); continue; }
            *nl = 0;
            cur = nl + 1;
        }
    }
    const char* p;
${decls.join("\n")}
    ${call}
    printf("\\n${RESULT_MARKER}\\n");
    ${write}
    printf("\\n");
    fflush(stdout);
    return 0;
}
`,
    };
  },
};
