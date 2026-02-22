# 認証完了ページ - make-it-tech.com 実装指示書

## 概要

DrinkManagementアプリのSupabase認証メール（サインアップ確認・パスワードリセット等）のリンクをタップした後、「認証完了」画面を表示し、アプリへディープリンクで戻すための中間ページを追加する。

現状はメールのリンクをタップするとlocalhostのようなURLが表示されてページが開けない状態になっている。

---

## 配置先URL

```
https://make-it-tech.com/apps/drink-management/auth-callback
```

## ソースファイル

```
drink-management/web/auth-callback.html
```

このHTMLファイルをそのまま上記URLでアクセスできるように配置する。

---

## 動作フロー

1. ユーザーがメール内のリンクをタップ
2. Supabaseサーバーが認証を検証
3. `https://make-it-tech.com/apps/drink-management/auth-callback#access_token=...&refresh_token=...` にリダイレクト
4. ページが「認証が完了しました」を表示
5. 0.5秒後に `drinkmanagement://auth/callback` へ自動ディープリンク
6. アプリが開きトークンを受け取り認証完了

## ページの3つの状態

- **ローディング**: トークン処理中（一瞬だけ表示）
- **成功**: 「認証が完了しました」+「アプリを開く」ボタン
- **エラー**: トークンが無効/期限切れの場合

## 技術的な補足

- HTMLファイルは単体で動作する（外部依存なし）
- JavaScriptがURLのハッシュフラグメント(`#`)からトークンを読み取り、`drinkmanagement://` スキームのディープリンクを構築する
- サーバーサイドの処理は不要（静的HTMLのみ）

---

## Supabase Dashboardの設定変更

ページを配置した後、以下を設定する。

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. DrinkManagementプロジェクトを選択
3. **Authentication** → **URL Configuration**
4. **Redirect URLs** に以下を追加:
   ```
   https://make-it-tech.com/apps/drink-management/auth-callback
   ```
5. 保存

※既存の `drinkmanagement://auth/callback` は削除しない

---

## チェックリスト

- [ ] `https://make-it-tech.com/apps/drink-management/auth-callback` にauth-callback.htmlを配置
- [ ] スマホで正常に表示されることを確認
- [ ] ディープリンク（`drinkmanagement://`）が発火することを確認
- [ ] Supabase Dashboard → Redirect URLsに `https://make-it-tech.com/apps/drink-management/auth-callback` を追加
