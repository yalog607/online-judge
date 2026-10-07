export type LanguageConfig = {
  image: string;
  sourceFile: string;
  compile?: string[];
  compileTimeoutMs?: number;
  run: string[];
};

export const LANGUAGES: Record<string, LanguageConfig> = {
  cpp: {
    image: "itoj-judge-cpp:latest",
    sourceFile: "main.cpp",
    compile: ["g++", "-O2", "-o", "main", "main.cpp"],
    run: ["./main"],
  },
  java: {
    image: "itoj-judge-java:latest",
    sourceFile: "Main.java",
    compile: ["javac", "Main.java"],
    run: ["java", "Main"],
  },
  python: {
    image: "itoj-judge-python:latest",
    sourceFile: "main.py",
    run: ["python3", "main.py"],
  },
  csharp: {
    image: "itoj-judge-csharp:latest",
    sourceFile: "Main.cs",
    compile: ["mcs", "-out:main.exe", "Main.cs"],
    run: ["mono", "main.exe"],
  },
  c: {
    image: "itoj-judge-c:latest",
    sourceFile: "main.c",
    compile: ["gcc", "-O2", "-o", "main", "main.c", "-lm"],
    run: ["./main"],
  },
  javascript: {
    image: "itoj-judge-javascript:latest",
    sourceFile: "main.js",
    run: ["node", "main.js"],
  },
  go: {
    image: "itoj-judge-go:latest",
    sourceFile: "main.go",
    compile: [
      "sh",
      "-c",
      "cp -r /opt/gocache /sandbox/.gocache && GOCACHE=/sandbox/.gocache go build -o main main.go",
    ],
    compileTimeoutMs: 30000,
    run: ["./main"],
  },
};
