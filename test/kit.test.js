'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { fill, parts, check } = require('..');

const BIN = path.join(__dirname, '..', 'bin', 'pagetext.js');

function site(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pagetext-'));
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content, 'utf8');
  }
  return root;
}
const texts = (root, options) => check(root, options).problems.map((p) => p.text);

const GOOD_PAGE = `import { fill } from 'pagetext-kit';
import { text as t } from './page.text';

export const metadata = { title: t.meta.title };

export default function Page({ count }: { count: number }) {
  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="text-4xl font-bold">{t.hero.title}</h1>
      <p>{fill(t.count, { count })}</p>
      <input placeholder={t.form.email} aria-label={t.form.email} />
      <ul>{t.plans.map((plan) => <li key={plan.name}>{plan.name}</li>)}</ul>
      <span>·</span> <span>&nbsp;</span> <b>{count}</b>
      <a href="/pricing" target="_blank">{count > 0 ? t.more : t.none}</a>
    </main>
  );
}
`;
const GOOD_TEXT = `export const text = {
  meta: { title: '方案與價格' },
  hero: { title: '一個價錢，全部功能' },
  count: '共 {count} 個方案',
  form: { email: '你的 Email' },
  plans: [{ name: '免費' }, { name: '專業' }],
  more: '看更多', none: '還沒有',
} as const;
`;

test('a page whose words are all in its text file passes', () => {
  const root = site({ 'app/page.tsx': GOOD_PAGE, 'app/page.text.ts': GOOD_TEXT });
  assert.deepEqual(check(root), { files: 1, problems: [] });
});

test('words written in the markup are found, with where and why', () => {
  const root = site({ 'app/page.tsx': `export default function Page({ ok }: { ok: boolean }) {
  return (
    <main>
      <h1>立即免費開始</h1>
      <p>{'Hello there'}</p>
      <p>{ok ? '成功' : 'Failed'}</p>
      <p>{\`共 \${3} 筆\`}</p>
      <input placeholder="Your email" alt={ok ? 'Logo' : undefined} />
    </main>
  );
}
` });
  const { problems } = check(root);
  assert.deepEqual(problems.map((p) => [p.line, p.text]), [
    [4, '立即免費開始'], [5, 'Hello there'], [6, '成功'], [6, 'Failed'], [7, '共 ${3} 筆'], [8, 'Your email'], [8, 'Logo'],
  ]);
  assert.equal(problems[0].file, 'app/page.tsx');
  assert.match(problems[5].why, /placeholder/);
});

test('Chinese in a page file outside the markup is found too (toast, page title), but not in console or imports', () => {
  const root = site({ 'app/page.tsx': `import x from './中文路徑';
export const metadata = { title: '方案與價格' };
export default function Page() {
  const save = () => { console.log('存檔了'); toast('已儲存'); };
  return <button onClick={save} className="btn">{x}</button>;
}
` });
  assert.deepEqual(texts(root), ['方案與價格', '已儲存']);
});

test('English outside the markup is left alone: class names, urls, keys', () => {
  const root = site({ 'app/page.tsx': `export default function Page({ kind }: { kind: string }) {
  const cls = kind === 'primary' ? 'bg-black text-white' : 'bg-white';
  return <a href="/pricing" className={cls} data-kind="primary" />;
}
` });
  assert.deepEqual(texts(root), []);
});

test('text-ok excuses one line, text-ok-file a whole file; text files, tests and ignored folders are not looked at', () => {
  const root = site({
    'app/a.tsx': 'export const A = () => <b>Classroo</b>; // text-ok\n',
    'app/b.tsx': '// text-ok\nexport const B = () => <b>Classroo</b>;\nexport const C = () => <b>漏掉的</b>;\n',
    'app/c.tsx': '/* text-ok-file */\nexport const D = () => <b>整個檔都放行</b>;\n',
    'app/page.text.ts': "export const text = { a: '字在這裡' };\n",
    'app/page.test.tsx': 'export const T = () => <b>測試裡的字</b>;\n',
    'components/ui/button.tsx': 'export const U = () => <b>別人產生的</b>;\n',
    'node_modules/x/y.tsx': 'export const N = () => <b>套件</b>;\n',
  });
  assert.deepEqual(texts(root, { ignore: ['components/ui'] }), ['漏掉的']);
});

test('the command exits 1 and lists the places; 0 when clean; settings come from package.json', () => {
  const root = site({
    'package.json': JSON.stringify({ name: 's', scripts: { build: 'next build' }, pagetext: { ignore: ['components/ui'] } }),
    'app/page.tsx': 'export default () => <h1>立即免費開始</h1>;\n',
    'components/ui/x.tsx': 'export default () => <b>放行</b>;\n',
  });
  const bad = spawnSync(process.execPath, [BIN, 'check', root], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /app\/page\.tsx:1 {2}「立即免費開始」/);
  assert.doesNotMatch(bad.stdout, /放行/);
  fs.writeFileSync(path.join(root, 'app/page.tsx'), "import { text as t } from './page.text';\nexport default () => <h1>{t.title}</h1>;\n");
  assert.equal(spawnSync(process.execPath, [BIN, 'check', root], { encoding: 'utf8' }).status, 0);
});

test('init writes the rule once and makes the build run the check first', () => {
  const root = site({ 'package.json': JSON.stringify({ name: 's', scripts: { build: 'next build' } }), 'CLAUDE.md': '# 我的站\n' });
  execFileSync(process.execPath, [BIN, 'init', root]);
  execFileSync(process.execPath, [BIN, 'init', root]);
  const doc = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
  assert.match(doc, /^# 我的站\n\n<!-- pagetext-kit -->/);
  assert.equal(doc.split('<!-- pagetext-kit -->').length, 2, 'not added twice');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.build, 'pagetext check && next build');
  assert.equal(pkg.scripts['check:text'], 'pagetext check');
});

test('fill and parts put values into the blanks, and say so when one is missing', () => {
  assert.equal(fill('共 {count} 堂課，{name} 開的', { count: 3, name: '小明' }), '共 3 堂課，小明 開的');
  const link = { tag: 'a' };
  assert.deepEqual(parts('同意 {terms} 後繼續', { terms: link }), ['同意 ', link, ' 後繼續']);
  assert.throws(() => fill('共 {count} 堂課', {}), /需要 count/);
});
