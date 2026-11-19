---
name: pagetext-kit
description: 開新網站（Next / React）時、或使用者說「字放內容檔」「pagetext」「新站的寫法」時載入。規定畫面上給人看的字不寫在標籤裡，集中放每頁旁邊的 .text.ts，build 前自動檢查。舊站不要套。
---

# pagetext-kit — 打法

**新站的寫法：畫面上給人看的字不寫在標籤裡，集中放每頁的內容檔。**

這是 EJS 那一代「樣板一份、資料另外傳進來」的老做法，加上一道自動檢查讓它變成強制。
換到的東西：字在哪裡永遠只有一個答案（fastFix 點了就改得準、AI 改文案不用翻整個元件）、
之後要多語系或把字搬進資料庫，頁面程式都不用再改。

## 何時觸發

- **開新站**：專案一建好、寫第一個頁面之前就接上。
- 使用者說「字放內容檔」「照 pagetext 寫」「新站的寫法」。
- **不要套在舊站**（2026-11-19 Jeff 定案）：coursebloom 那種已經寫好的站跑檢查會有近萬處，維持原樣。
  fastFix 兩種寫法都改得動，不需要為了它搬。

## 接線（照抄能跑）

```bash
npm i github:Jeffrey0117/pagetext-kit
npx pagetext init        # 規則寫進 CLAUDE.md；build 改成先跑檢查
```

之後每個頁面 / 元件檔旁邊放同名的內容檔：

```ts
// app/pricing/page.text.ts
export const text = {
  hero: { title: '一個價錢，全部功能', lead: '先用，喜歡再付' },
  plans: [{ name: '免費', points: ['3 個專案'] }, { name: '專業', points: ['不限專案'] }],
  count: '共 {count} 個方案',
} as const;
```

```tsx
// app/pricing/page.tsx
import { fill } from 'pagetext-kit';
import { text as t } from './page.text';

<h1>{t.hero.title}</h1>
<p>{fill(t.count, { count: t.plans.length })}</p>
```

檢查：`npx pagetext check`（有漏就列出檔案與行號，結束碼 1）。

## 模式

- **一個檔一個內容檔，同名**：`site-header.tsx` ↔ `site-header.text.ts`。不要全站一大包，AI 改一頁只需要看那一頁的字。
- **清單也放內容檔**：方案、特色、FAQ 這種陣列整個放進去，頁面只管 `.map`。
- **一句話不要切開**：有變數就整句放內容檔用 `{名稱}` 挖空，`fill()` 填。空格裡要放連結或粗體用 `parts()`。
- **不要跨檔共用字**：兩個地方剛好同一句，各寫一次。共用了，改一處會動到另一處，也會讓 fastFix 要多問一次。
- **頁面標題、toast、錯誤提示也算**：檢查會抓頁面檔裡所有帶中日韓文的字串，不只標籤裡的。
- **真的該留的**（商標、單一符號）在同一行或上一行註解 `text-ok`；整個檔放行用 `text-ok-file`。
- **別人產生的元件**（shadcn 的 `components/ui`）在 package.json 設 `"pagetext": { "ignore": ["components/ui"] }`。

## 地雷

- **vercel.json 自己寫了 `buildCommand`**：Vercel 不會走 package.json 的 build，檢查擋不住。改成 `npm run build`。`init` 會提醒。
- **英文字只抓得到標籤裡的**。標籤外的英文字串分不出是給人看的還是程式用的（class、代號），所以不抓；
  中文站沒差，純英文站的 toast 之類要自己留意。
- **TypeScript 7 不能從 JavaScript 呼叫**，所以這個 kit 自帶 typescript 5 來讀檔（唯一的依賴）。
- `.ts` 檔（API、伺服器程式）不檢查，只看 `.tsx` / `.jsx`。API 回的錯誤訊息不在管轄範圍。
- 檢查是為了擋「忘記」，不是擋人。不要為了過關亂加 `text-ok`。

## 之後可以長的方向（還沒做）

- 內容檔搬進資料庫，改字不用重新建置。代號不變，頁面不用改。
- 把舊頁面的字自動抽成內容檔的搬家工具。
