export type LanguageConfig = {
  image: string;
  sourceFile: string;
  compile?: string[];
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
};
