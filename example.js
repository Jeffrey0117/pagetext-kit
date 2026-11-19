'use strict';
// node example.js — makes a tiny site, checks it, fixes it, checks again.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fill, parts, check } = require('./index');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pagetext-example-'));
const write = (name, content) => {
  fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  fs.writeFileSync(path.join(root, name), content);
};
const show = (line) => process.stdout.write(`${line}\n`);

write('app/page.tsx', 'export default function Page() {\n  return <h1 className="text-4xl">一個價錢，全部功能</h1>;\n}\n');
show('字寫在標籤裡：');
for (const p of check(root).problems) show(`  ${p.file}:${p.line}  「${p.text}」  ${p.why}`);

write('app/page.text.ts', "export const text = { title: '一個價錢，全部功能', count: '共 {count} 個方案' } as const;\n");
write('app/page.tsx', "import { text as t } from './page.text';\nexport default function Page() {\n  return <h1 className=\"text-4xl\">{t.title}</h1>;\n}\n");
show(`搬到內容檔之後：${check(root).problems.length} 處`);

show(fill('共 {count} 個方案', { count: 2 }));
show(JSON.stringify(parts('同意 {terms} 後繼續', { terms: '條款' })));
fs.rmSync(root, { recursive: true, force: true });
