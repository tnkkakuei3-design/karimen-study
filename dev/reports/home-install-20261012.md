# ホーム画面への追加案内とアイコン

- 初回のスマートフォン表示で、小さな非モーダルの案内カードを表示。
- 「追加方法を見る」「あとで」。表示済みフラグは学習記録とは別のキーに保存。
- 表示後の再読み込み・再訪・別タブでの再案内を抑制。
- 学習・模試の途中、ホーム画面からの起動、PCでは自動案内しない。
- 設定からiPhone/iPadとAndroidの手順を確認可能。閉じると設定へ戻る。
- Androidのブラウザがインストール要求を提供した場合のみ、ユーザー操作から要求を表示。提供されない場合も手動手順を表示。
- 既存の学習がある場合だけ記録の書き出し・読み込みを案内。
- iOS向け180pxアイコン、192px/512px manifestアイコン、表示名「仮免ドリル」を設定。
- インストールに不要なサービスワーカーやオフラインキャッシュは追加していない。

## アイコン

元の画像: `assets/characters/D013.png`（正面のプーリーくん）。
Built-in image_genによる編集。文字なしの青背景に、同じキャラクターの頭と上半身を大きく配置。
配信用PNGは生成画像を縮小し、256色に最適化した。

出力: `assets/icons/apple-touch-icon.png`, `assets/icons/karimen-192.png`, `assets/icons/karimen-512.png`。

最終プロンプト:

> Edit target: the attached existing photograph of the green plush mascot プーリーくん. Make a finished square 1024x1024 home-screen app icon for the Japanese study app 仮免ドリル. Preserve this exact character's face, asymmetrical eyes, eyelashes, red lips, green fuzzy fabric and photoreal plush texture; do not reinterpret or redraw as a cartoon or stylized AI character. Only change framing and background: crop to the head and upper shoulders, enlarge and center the face. Face and green head silhouette must read clearly at 60px. Keep the complete top of the head with a little breathing room and leave the eyes and mouth well inside the central 65% of the canvas for circular/rounded OS masking. Flat solid blue background #066be9 covering the entire square, crisp clean cutout edges. No text, letters, logos, badges, added objects, gradients, drop shadows, borders, app frame or rounded corners baked into the image. One single icon only, no mockup, no grid. Preserve the source character identity exactly.

## 確認

既存の問題・採点・復習・画面遷移テストに加え、`test-home-install.mjs` で次を検証:
初回、再訪、閉じる、設定から開き直す、ホーム画面起動、PC、保存不可、進行中/再開時の模試、学習記録の不変性、記録書き出し、Androidのシステム要求のキャンセル・手動手順、アイコンの実寸。

表示確認用: `dev/visual-review.html` の「ホーム追加」各画面（隔離された見本データ）。
実機のiOS共有メニュー/ホーム画面への最終追加はクラウドブラウザでは検証できない。

## 参照

- https://support.apple.com/ja-jp/guide/iphone/iph42ab2f3a7/ios
- https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
- https://support.google.com/chrome/answer/9658361?hl=ja&co=GENIE.Platform%3DAndroid
- https://web.dev/learn/pwa/installation-prompt
