const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = process.cwd();
const srcRoot = path.join(root, "src");

function badScore(s) {
  let score = 0;

  for (const ch of s) {
    const cp = ch.codePointAt(0);

    if (cp === 0x00C3) score += 8;
    else if (cp === 0x00C2) score += 7;
    else if (cp === 0xFFFD) score += 30;
    else if (cp >= 0x80 && cp <= 0x9F) score += 12;
  }

  const patterns = [/Ã\?/g,/â\?/g,/Ã╬/g,/â┼/g,/â†/g,/Ãƒ/g,/Ã‡/g];

  for (const re of patterns) {
    const m = s.match(re);
    if (m) score += m.length * 15;
  }

  return score;
}

function walk(dir) {
  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (full.includes(path.join("src", "generated"))) continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }

  return out;
}

const issues = [];

for (const file of walk(srcRoot)) {
  const source = fs.readFileSync(file, "utf8");

  const kind =
    file.endsWith(".tsx") ? ts.ScriptKind.TSX :
    file.endsWith(".jsx") ? ts.ScriptKind.JSX :
    file.endsWith(".js") ? ts.ScriptKind.JS :
    ts.ScriptKind.TS;

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind
  );

  function check(text, node) {
    if (!text || badScore(text) === 0) return;

    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf, false));
    issues.push(
      `${path.relative(root,file)}:${pos.line + 1}: ${text.replace(/\s+/g," ").trim()}`
    );
  }

  function visit(node) {
    if (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        node.kind === ts.SyntaxKind.TemplateHead ||
        node.kind === ts.SyntaxKind.TemplateMiddle ||
        node.kind === ts.SyntaxKind.TemplateTail ||
        ts.isJsxText(node)) {
      check(node.text ?? node.getText(sf), node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
}

if (issues.length) {
  console.error("[ERRO] Mojibake ainda presente em textos reais:");
  for (const issue of issues) console.error(issue);
  console.error(`TOTAL=${issues.length}`);
  process.exit(2);
}

console.log("[OK] Auditor AST: nenhum mojibake em textos reais.");
process.exit(0);
