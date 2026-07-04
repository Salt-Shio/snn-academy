# 範例頁面二（同分類多頁測試）

用來驗證同一個 `nav`/`sidebar` 分類底下放兩篇頁面時，側邊欄會不會正確列出兩者。

一般清單也順便測一下：

- 項目一
- 項目二

分段函數範例（測試 KaTeX 的 `cases` 環境）：

$$
f(x) =
\begin{cases}
1 & x \ge V_{th} \\
0 & x < V_{th}
\end{cases}
$$

程式碼區塊測試：

```ts
function demo(x: number): number {
  return x > 0 ? 1 : 0
}
```
