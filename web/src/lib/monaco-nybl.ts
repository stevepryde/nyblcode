import type { Monaco } from "@monaco-editor/react";

export function registerNyblLanguage(monaco: Monaco) {
  if (monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === "nybl")) {
    return;
  }

  monaco.languages.register({ id: "nybl" });

  monaco.languages.setMonarchTokensProvider("nybl", {
    keywords: [
      "let", "const", "fn", "pub", "return", "if", "else", "while",
      "for", "in", "repeat", "break", "continue", "use", "as",
      "struct", "enum", "match", "try", "ref",
    ],
    literals: ["true", "false", "none"],
    builtinGameFns: [
      "move", "turn", "grab", "drop", "say", "wait", "look", "position",
      "facing", "gem_ahead", "gem_here", "wall_ahead", "path_ahead",
      "has_gem", "has_key", "has_diamond", "key_ahead", "key_here",
      "diamond_ahead", "diamond_here", "pit_ahead", "inventory", "grid_size",
    ],
    builtinUtilFns: [
      "range", "str", "int", "type", "abs", "min", "max", "len", "print",
      "inspect", "rand", "try_call", "panic", "sqrt", "sin", "cos", "tan",
      "floor", "ceil", "round", "exp", "log", "pow",
    ],
    operators: [
      "==", "!=", "<=", ">=", "&&", "||", "+=", "-=", "*=", "/=", "%=",
      "=>", "::", "+", "-", "*", "/", "%", "=", "<", ">", "!", "..",
    ],
    symbols: /[=><!~?:&|+\-*/%@#.]+/,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/[a-zA-Z_]\w*/, {
          cases: {
            "@keywords": "keyword",
            "@literals": "constant.language",
            "@builtinGameFns": "support.function",
            "@builtinUtilFns": "support.function",
            "@default": "identifier",
          },
        }],
        [/[ \t\r\n]+/, "white"],
        [/"/, { token: "string.quote", next: "@string" }],
        [/\d+\.\d+/, "number.float"],
        [/\d+/, "number"],
        [/@symbols/, {
          cases: {
            "@operators": "operator",
            "@default": "",
          },
        }],
        [/[{}()[\]]/, "@brackets"],
        [/[,;]/, "delimiter"],
      ],
      string: [
        [/\{/, { token: "string.interpolation.bracket", next: "@interpolation" }],
        [/\\[\\nrt"{}]/, "string.escape"],
        [/[^"\\{]+/, "string"],
        [/"/, { token: "string.quote", next: "@pop" }],
      ],
      interpolation: [
        [/\}/, { token: "string.interpolation.bracket", next: "@pop" }],
        [/[a-zA-Z_]\w*/, {
          cases: {
            "@keywords": "keyword",
            "@literals": "constant.language",
            "@builtinGameFns": "support.function",
            "@builtinUtilFns": "support.function",
            "@default": "identifier",
          },
        }],
        [/\d+\.\d+/, "number.float"],
        [/\d+/, "number"],
        [/@symbols/, {
          cases: {
            "@operators": "operator",
            "@default": "",
          },
        }],
        [/[{}()[\]]/, "@brackets"],
        [/[ \t]+/, "white"],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration("nybl", {
    comments: { lineComment: "//" },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ],
  });
}
