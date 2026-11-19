'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Finds words meant for people that are written straight into a page instead of
// its text file. Two things count:
//   1. anything a visitor reads inside the markup: text between tags, a quoted
//      string put there with {...}, and attributes people see or hear (placeholder, alt, ...)
//   2. any quoted string with Chinese / Japanese / Korean in a page file — on these
//      sites that is always something a person reads (a toast, a page title, a label)
// Text files (*.text.ts and friends) are where the words belong, so they are skipped.

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'out', 'coverage', '.vercel', '.turbo']);
const PAGE_FILE = /\.(tsx|jsx)$/;
const NOT_CHECKED = /\.(test|spec|stories)\.[jt]sx$|\.text\.[jt]sx?$/;
const SEEN_ATTRS = new Set(['placeholder', 'alt', 'title', 'label', 'aria-label', 'aria-description', 'aria-placeholder', 'aria-roledescription', 'aria-valuetext']);
const LETTER = /\p{L}/u;
const CJK = /[぀-ヿ㐀-鿿가-힯]/;
const ENTITY = /&#?[a-z0-9]+;/gi;
const OK_LINE = /text-ok(?!-file)/;
const OK_FILE = /text-ok-file/;
const MAX_FILES = 20000;

const squash = (s) => String(s).replace(/\s+/g, ' ').trim();
const hasWords = (s) => LETTER.test(String(s).replace(ENTITY, ''));

// Our own TypeScript first: it is known to have the parser. (TypeScript 7 cannot be called from JavaScript.)
function loadParser(root) {
  for (const from of ['typescript', path.join(root, 'node_modules', 'typescript')]) {
    try { const ts = require(from); if (typeof ts.createSourceFile === 'function') return ts; } catch (_) { /* try the next one */ }
  }
  throw new Error('找不到可以用的 TypeScript（需要 5.x）。在這個專案跑 npm i -D typescript@5');
}

function pageFiles(dir, ignore, root, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (out.length >= MAX_FILES) break;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (ignore.some((p) => rel === p || rel.startsWith(`${p}/`))) continue;
    if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) pageFiles(full, ignore, root, out); }
    else if (PAGE_FILE.test(entry.name) && !NOT_CHECKED.test(entry.name)) out.push(full);
  }
  return out;
}

// Returns [{ line, text, why }] for one file's source.
function checkSource(ts, file, code) {
  if (OK_FILE.test(code)) return [];
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, /\.jsx$/.test(file) ? ts.ScriptKind.JSX : ts.ScriptKind.TSX);
  const lines = code.split(/\r?\n/);
  const found = new Map();
  const add = (node, text, why) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const excused = OK_LINE.test(lines[line - 1] || '') || OK_LINE.test(lines[line - 2] || '');
    if (!excused && !found.has(node.pos)) found.set(node.pos, { line, text: squash(text).slice(0, 60), why });
  };
  const isQuoted = (n) => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);
  const isConsole = (n) => ts.isCallExpression(n) && /^console\./.test(n.expression.getText());

  // A value that ends up on screen: follow it through ?: && || ?? + ( ) and `...${}...`.
  const shown = (n, why) => {
    if (!n) return;
    if (isQuoted(n)) { if (hasWords(n.text)) add(n, n.text, why); return; }
    if (ts.isTemplateExpression(n)) {
      const fixed = n.head.text + n.templateSpans.map((s) => s.literal.text).join(' ');
      if (hasWords(fixed)) add(n, n.getText().slice(1, -1), why);
      return;
    }
    if (ts.isParenthesizedExpression(n)) { shown(n.expression, why); return; }
    if (ts.isConditionalExpression(n)) { shown(n.whenTrue, why); shown(n.whenFalse, why); return; }
    if (ts.isBinaryExpression(n)) { shown(n.left, why); shown(n.right, why); }
  };

  const visit = (node, quiet) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isJsxText(node)) {
      if (hasWords(node.text)) add(node, node.text, '字直接寫在標籤裡');
    } else if (ts.isJsxExpression(node) && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      shown(node.expression, '字直接寫在標籤裡');
    } else if (ts.isJsxAttribute(node) && SEEN_ATTRS.has(node.name.getText())) {
      const init = node.initializer;
      shown(init && ts.isJsxExpression(init) ? init.expression : init, `字直接寫在 ${node.name.getText()} 裡`);
    }
    const hush = quiet || isConsole(node);
    if (!hush) {
      if (isQuoted(node) && CJK.test(node.text)) add(node, node.text, '字直接寫在程式裡');
      else if (ts.isTemplateExpression(node) && CJK.test(node.head.text + node.templateSpans.map((s) => s.literal.text).join(''))) add(node, node.getText().slice(1, -1), '字直接寫在程式裡');
    }
    ts.forEachChild(node, (c) => visit(c, hush));
  };
  visit(sf, false);
  return [...found.values()].sort((a, b) => a.line - b.line);
}

// Returns { files: number, problems: [{ file, line, text, why }] }. file is relative to root.
function check(root, { ignore = [] } = {}) {
  const base = path.resolve(root);
  const ts = loadParser(base);
  const files = pageFiles(base, ignore.map((p) => String(p).replace(/\\/g, '/').replace(/\/+$/, '')), base);
  const problems = files.flatMap((full) => {
    const file = path.relative(base, full).split(path.sep).join('/');
    return checkSource(ts, full, fs.readFileSync(full, 'utf8')).map((p) => ({ file, ...p }));
  });
  return { files: files.length, problems };
}

module.exports = { check, checkSource, loadParser };
