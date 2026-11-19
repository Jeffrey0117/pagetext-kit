# pagetext-kit

新站的寫法：**畫面上給人看的字不寫在標籤裡，集中放每頁旁邊的內容檔。** 附自動檢查，違反就不給建置。

```tsx
// 以前
<h1 className="text-4xl">一個價錢，全部功能</h1>

// 現在
<h1 className="text-4xl">{t.hero.title}</h1>      // app/pricing/page.tsx
hero: { title: '一個價錢，全部功能' }              // app/pricing/page.text.ts
```

為什麼：字在哪裡永遠只有一個答案。點網頁改字的工具（[fastFix](https://github.com/Jeffrey0117/tampermonkey-fastfix)）改得準，
AI 改文案不用翻整個元件，之後要多語系或把字搬進資料庫，頁面程式不用再動。

## 裝

```bash
npm i github:Jeffrey0117/pagetext-kit
npx pagetext init
```

`init` 做兩件事：把規則寫進 `CLAUDE.md`（AI 讀得到），把 `build` 改成先跑檢查。

## 指令

| 指令 | 做什麼 |
|---|---|
| `pagetext check [資料夾]` | 列出還寫在頁面裡的字（檔案:行號）。有就結束碼 1 |
| `pagetext init [資料夾]` | 規則寫進 CLAUDE.md，build 接上檢查 |
| `pagetext rule` | 印出規則全文 |

## 檢查抓什麼

- 標籤之間的字、用 `{'...'}` 放進去的字串、`{ok ? '成功' : '失敗'}` 這種
- 人看得到或聽得到的屬性：`placeholder` `alt` `title` `label` `aria-label` 等
- 頁面檔（`.tsx` / `.jsx`）裡任何帶中日韓文的字串：頁面標題、toast、錯誤提示

不抓：`*.text.ts`、測試檔、`console.*` 的訊息、import 路徑、class 名稱與網址、`.ts` 檔。

放行：同一行或上一行註解 `text-ok`；整個檔 `text-ok-file`；整個資料夾在 package.json 設

```json
{ "pagetext": { "ignore": ["components/ui"] } }
```

## 帶變數的句子

```js
const { fill, parts } = require('pagetext-kit');

fill('共 {count} 堂課', { count: 3 });                       // '共 3 堂課'
parts('同意 {terms} 後繼續', { terms: <a key="t">條款</a> }); // ['同意 ', <a/>, ' 後繼續']
```

少給一個值會直接丟錯，不會默默印出 `{count}`。

## 依賴

只有 `typescript@5`（用它讀 JSX）。TypeScript 7 沒有可以從 JavaScript 呼叫的介面，所以不用專案自己的那份。

打法與地雷見 [SKILL.md](./SKILL.md)。
