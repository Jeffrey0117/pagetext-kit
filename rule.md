<!-- pagetext-kit -->
## 給人看的字放內容檔（pagetext-kit）

這個專案裡，**畫面上給人看的字不直接寫在頁面程式裡**。每個頁面或元件檔旁邊放一個同名的內容檔，字都寫在那裡。

- `app/pricing/page.tsx` 的字放 `app/pricing/page.text.ts`；`components/site-header.tsx` 的字放 `components/site-header.text.ts`。
- 內容檔只放資料，不放邏輯：

  ```ts
  // app/pricing/page.text.ts
  export const text = {
    hero: { title: '一個價錢，全部功能', lead: '先用，喜歡再付' },
    plans: [
      { name: '免費', points: ['3 個專案', '社群支援'] },
      { name: '專業', points: ['不限專案', '優先支援'] },
    ],
    count: '共 {count} 個方案',
  } as const;
  ```

- 頁面裡用代號，不寫字：

  ```tsx
  import { fill } from 'pagetext-kit';
  import { text as t } from './page.text';

  <h1>{t.hero.title}</h1>
  <p>{fill(t.count, { count: t.plans.length })}</p>
  {t.plans.map((plan) => <li key={plan.name}>{plan.name}</li>)}
  ```

- **算「給人看的字」**：標題、內文、按鈕、連結文字、提示訊息（toast、錯誤提示）、表單的 placeholder、圖片的 alt、頁面標題與描述（metadata）、清單項目。
- **不算**：網址、class 名稱、程式用的代號、`console` 的訊息、資料庫來的內容。
- 一句話裡有變數，整句放內容檔、用 `{名稱}` 挖空，再用 `fill()` 填；不要把一句話切成好幾段寫在標籤裡。空格裡要放連結或粗體用 `parts()`。
- 同一段字兩個地方都要用，各自的內容檔各寫一次，不要互相 import（改一處不該動到另一處）。
- 寫完跑 `npx pagetext check`。它會列出還寫在頁面裡的字；`build` 也會先跑它，沒過就不會建置。
- 真的該留在頁面裡的（商標、單一符號），在同一行或上一行加註解 `text-ok`。不要為了讓檢查過關而亂加。
<!-- /pagetext-kit -->
