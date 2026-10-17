export type LanguageConfig = {
  image: string;
  sourceFile: string;
  compile?: string[];
  compileTimeoutMs?: number;
  run: string[];
  // Approximate CPU time the runtime itself burns before user code starts (JVM, Mono, Node).
  // It is measured inside the container together with the program, so it is subtracted
  // from the charged time instead of counting against the problem's time limit.
  startupMs?: number;
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
    startupMs: 300,
  },
  python: {
    image: "itoj-judge-python:latest",
    sourceFile: "main.py",
    run: ["python3", "main.py"],
    startupMs: 20,
  },
  csharp: {
    image: "itoj-judge-csharp:latest",
    sourceFile: "Main.cs",
    compile: ["mcs", "-out:main.exe", "Main.cs"],
    run: ["mono", "main.exe"],
    startupMs: 120,
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
    startupMs: 50,
  },
  go: {
    image: "itoj-judge-go:latest",
    sourceFile: "main.go",
    // The generated driver is shipped as a second source file next to the student's code.
    compile: [
      "sh",
      "-c",
      "cp -r /opt/gocache /sandbox/.gocache && GOCACHE=/sandbox/.gocache go build -o main main.go driver.go",
    ],
    compileTimeoutMs: 30000,
    run: ["./main"],
  },
};
