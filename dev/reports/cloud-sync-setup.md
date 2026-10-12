# 第2段階：ログイン・自動保存・端末間同期

対象: `https://karimen-study.pages.dev/` / GitHub `tnkkakuei3-design/karimen-study`

## 今回の状態

コード・自動テストを追加。CloudflareのD1接続、Google OAuthクライアント設定、本番のiPhone確認は未実施。設定を完了するまでクラウド機能は非表示で、従来の端末内保存を継続する。

## 管理者が行う設定（秘密値をチャットに貼らない）

1. Cloudflareの **ストレージとデータベース → D1 SQL Database → データベースを作成**。名前は `karimen-study-db`。
2. **Workers & Pages → karimen-study → 設定 → バインディング → 追加 → D1データベース**。
   - 変数名: **`DB`**（大文字）
   - データベース: **`karimen-study-db`**
   - 本番（Production）に設定。プレビューへ本番DBや認証の秘密値を共有しない。
3. Google Cloud Consoleで対象プロジェクトを作成または選択し、Google Auth Platformでブランド情報・対象ユーザーを設定。外部ユーザーのテスト用として自分のGoogleアカウントを追加する。
4. **クライアント → クライアントを作成 → ウェブアプリケーション**。
   - アプリ名: `仮免ドリル`
   - ホームページ: `https://karimen-study.pages.dev/`
   - プライバシーポリシー: `https://karimen-study.pages.dev/privacy.html`
   - 承認済みリダイレクトURI: **`https://karimen-study.pages.dev/api/auth/callback`**
   - リクエストするスコープは `openid email` のみ。ドライブや連絡先の権限は不要。
5. Cloudflare Pagesの **設定 → 変数とシークレット** の本番環境に次を追加。

|名前|種類|値|
|---|---|---|
|`GOOGLE_CLIENT_ID`|テキスト|Googleで作成したクライアントID|
|`GOOGLE_CLIENT_SECRET`|シークレット（暗号化）|Googleで発行したクライアントシークレット|
|`CLOUD_ALLOWED_EMAILS`|シークレット|初回検証に使う自分のGoogleメールアドレス|
|`CLOUD_ENABLED`|テキスト|`true`|

6. 最新版のデプロイを再実行。環境設定は新しいデプロイで反映する。初回アクセス時に `CREATE TABLE IF NOT EXISTS` で必要な表を作成するため、SQLの手動貼り付けは不要。
7. 新サイトの **設定 → クラウドに学習記録を保存 → Googleでログイン** を試す。下の確認がすべて通ってから、一般公開する場合に `CLOUD_ALLOWED_EMAILS` を削除し、Google側の公開ステータスや必要な検証を完了する。アカウント削除UIは一般公開前に追加する。

Googleがブランド/ドメイン検証を要求する場合はその画面に従う。公開完了と推測せず実際のログイン結果を確認する。

## 本番確認（未実施）

- 旧サイトから新サイトへの転送後、回答数・復習数・途中の問題が一致する。
- ログインして「クラウドに保存済み」になる。
- 1問回答し、再読み込み後も残る。
- 記録のない別ブラウザ/端末で同じGoogleアカウントにログインし、回答数・復習予定・途中の問題が戻る。
- 一時的なオフライン中に回答し、オンライン復帰後に同期される。
- 模試の残り時間が復帰後に増えず、未回答問題が正解率の分母に入らない。
- ログアウト後も端末の記録は残る。別アカウントを選ぶと既存の個人記録の送信を止める。

## 実装と保護

- Pages Functions: `/api/auth/start`, `/api/auth/callback`, `/api/auth/me`, `/api/auth/logout`, `/api/progress`, `/api/cloud/config`。
- Google OAuth authorization-code + PKCE、state Cookie、nonce、署名・issuer・audience・期限の検証。`oauth4webapi@3.8.8`のMIT配布版を同梱。Googleトークンは端末へ返さず保存しない。
- セッションはSecure/HttpOnly/SameSite Cookie、DBにはトークンのSHA-256のみ。30日で失効。
- 更新は同一Originと独自ヘッダー必須。ユーザーIDはセッションから取得し、他人の保存領域を指定できない。本番ドメイン以外ではAPIを無効にする。
- D1の比較更新（revision）で競合を検出。古い端末の一括上書きを禁止。
- 回答IDを使って統合し、再送や応答喪失で二重計上しない。今後の回答はオフラインでもイベントとして端末内に記録。
- 画面内の保存は従来のlocalStorage/IndexedDBバックアップを使用。解答中は他端末の画面を適用せず、学習画面を閉じた後に統合する。既知のクラウド版に対する本人の新しい回答は解答中でも送信可能。
- 途中の模試の順序・回答・残り時間を保持。複数端末に同じモードの別セッションがあると、新しいセッションを再開欄に、他方を以前の記録へ保管する。
- 最新版・直近30版・過去30日の日ごとの最終版を保持。個人バックアップの点数をランキングの信頼できる点数として流用しない。
- 機能未設定・通信エラー・認証期限切れでも通常学習と端末内保存は継続する。

## 明示的な制限・残作業

- **設定前なのでクラウド保存はまだ稼働していない。** このファイルは公開確認の代わりではない。
- 初回同期前から別端末に異なる古い履歴があり、同じ問題の集計が重複する場合、正確な合算に必要な回答IDがない。推測で加算せず両方を保持して同期を停止する。通常の空の別端末への復元、同期導入後の複数端末での回答は自動で処理する。
- クラウドに紐づけた記録の「初期化」は、再同期による復活や誤消去を避けるため無効。アカウント/クラウド記録の削除と安全なアカウント切替UIは一般公開前に追加する。
- サーバー側の要求上限はUTF-8で900,000バイト、回答イベント50,000件。上限を超えても端末内の学習は止めずクラウド保存エラーを表示。長期運用向けのイベント圧縮は未実装。
- 非表示時のブラウザ通信完了は保証しない。最後の同期が未完了なら端末内に保持し、次の起動時に再送する。
- 第3段階のランキング/成長履歴、第4段階の飲食店タップ集計、第5段階のチャットは未実装。

## 検証

`npm test` / `npm run build`。`test-cloud.mjs` はSQLite実トランザクション、署名付きテストIDトークンを使うOAuthライブラリの実処理、認可・CSRF・nonce・PKCE・期限・競合・履歴を検証。`test-cloud-client.mjs` はDOM環境で端末側の同期と障害時を検証する。本物のGoogleログイン、Cloudflare D1、本番iPhoneの動作は管理者設定後に確認する。

公式手順:
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.google.com/identity/protocols/oauth2/web-server
