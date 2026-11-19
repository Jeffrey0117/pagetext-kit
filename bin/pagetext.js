#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { check } = require('../lib/check');

const RULE_FILE = path.join(__dirname, '..', 'rule.md');
const MARK = '<!-- pagetext-kit -->';
const CHECK_STEP = 'pagetext check';

const say = (line) => process.stdout.write(`${line}\n`);

function readSettings(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).pagetext || {}; } catch (_) { return {}; }
}

function runCheck(root) {
  const settings = readSettings(root);
  const { files, problems } = check(root, { ignore: Array.isArray(settings.ignore) ? settings.ignore : [] });
  if (!problems.length) { say(`pagetext：看了 ${files} 個頁面檔，字都在內容檔裡 ✓`); return 0; }
  for (const p of problems) say(`${p.file}:${p.line}  「${p.text}」  ${p.why}`);
  say('');
  say(`pagetext：${problems.length} 處的字還寫在頁面裡。搬到旁邊的 .text.ts（規則見 CLAUDE.md，或跑 npx pagetext rule）`);
  return 1;
}

// Puts the rule where the AI reads it, and makes the build run the check first.
function runInit(root) {
  const rule = fs.readFileSync(RULE_FILE, 'utf8');
  const doc = path.join(root, 'CLAUDE.md');
  const current = fs.existsSync(doc) ? fs.readFileSync(doc, 'utf8') : '';
  if (current.includes(MARK)) say('CLAUDE.md 已經有這條規則，沒動');
  else { fs.writeFileSync(doc, `${current.trimEnd()}${current.trim() ? '\n\n' : ''}${rule}`); say('CLAUDE.md：加上規則'); }

  const pkgFile = path.join(root, 'package.json');
  if (!fs.existsSync(pkgFile)) { say('這裡沒有 package.json，build 的檢查沒辦法接上'); return 1; }
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  const scripts = pkg.scripts || {};
  const build = scripts.build && !scripts.build.includes(CHECK_STEP) ? `${CHECK_STEP} && ${scripts.build}` : scripts.build;
  const next = { ...pkg, scripts: { ...scripts, 'check:text': CHECK_STEP, ...(build ? { build } : {}) } };
  fs.writeFileSync(pkgFile, `${JSON.stringify(next, null, 2)}\n`);
  say(build ? `package.json：build 會先跑檢查（${build}）` : 'package.json：加了 check:text（這個專案沒有 build 指令，之後自己接上）');
  if (fs.existsSync(path.join(root, 'vercel.json')) && /"buildCommand"/.test(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))) {
    say('注意：vercel.json 自己寫了 buildCommand，Vercel 不會走 package.json 的 build。把它改成 npm run build，檢查才擋得住。');
  }
  return 0;
}

const [command = 'check', dir = '.'] = process.argv.slice(2);
const root = path.resolve(dir);
try {
  if (command === 'check') process.exitCode = runCheck(root);
  else if (command === 'init') process.exitCode = runInit(root);
  else if (command === 'rule') say(fs.readFileSync(RULE_FILE, 'utf8'));
  else { say('用法：pagetext check [資料夾] | pagetext init [資料夾] | pagetext rule'); process.exitCode = 2; }
} catch (err) {
  say(`pagetext：${err.message}`);
  process.exitCode = 2;
}
