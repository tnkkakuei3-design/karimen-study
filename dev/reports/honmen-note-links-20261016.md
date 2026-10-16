# 本免203問の図解ノート対応（2026-10-16）

- 前回：760問中557問が個別ノートに対応。203問は一覧へ移動。
- 今回：未対応203問の設問と解説を読み、問題IDごとに対応テーマを明示。760問中760問が個別テーマへ移動可能。
- 既存557問のリンク先は変更なし。仮免の共有ノート本文も変更なし。本免表示時だけ必要な補足を合成。
- 本免専用18テーマを追加。合計89テーマ。夜間・悪天候・視覚・疲労・点検・定員・積載・けん引・事故救護・保険・検査標章・保管場所・災害・駐車など。
- 個別の対応一覧は `honmen-note-links-20261016.json`。前回の未対応一覧は履歴として保持。

## 実装

`honmen/note-links.js` に203問の明示対応と18テーマ、既存ノートへの補足を定義。`related` とテーマ別練習の `questions` が同じ明示対応を優先する。旧キーワード判定によって明示対応が上書きされない。

## 検証

- 760問すべての直接リンクと逆引きの整合性。
- 未対応だった203問すべて：解答画面→正しいテーマを展開→元の解答画面へ戻る。
- 新18テーマすべて：練習ボタンの表示件数、出題件数、対象IDの一致。
- 既存557問のリンク先維持、共有NOTES非変更を基準コミットと比較。
- test-honmen、test-parity-audit、test-course-unification、test-notebook、ビルドと差分チェック。
- iPhone実機の操作・横向き・文字拡大は、この自動テストでは確認できない。

## 内容の確認資料

既存設問・解説と照合し、追加の説明は以下の公的資料も確認。保管場所標章の2025年廃止と、検査標章の貼付位置を区別した。

- 警察庁「交通の方法に関する教則」 https://www.npa.go.jp/bureau/traffic/20241113kyousoku.pdf
- 国土交通省・日常点検 https://www.mlit.go.jp/jidosha/anzen/02maintenance/daily_check.html
- 警察庁・地震発生時の措置 https://www.npa.go.jp/bureau/traffic/seibi2/saigaiji/daizisinnunntennsya.html
- 国土交通省・検査標章 https://www.jidoushatouroku-portal.mlit.go.jp/jidousha/kensatoroku/about/inspect/sticker/index.html
- 警視庁・保管場所の要件 https://www.keishicho.metro.tokyo.lg.jp/tetsuzuki/kotsu/hokan/syako_syousai/youken.html
- 広島県警・保管場所標章の廃止 https://www.pref.hiroshima.lg.jp/site/police-koutsuu2/hyousyou-haishi.html
- 神奈川県警・制限外積載 https://www.police.pref.kanagawa.jp/tetsuzuki/kotsukankei/mesf1039.html
- 道路交通法（車輪止め等） https://laws.e-gov.go.jp/law/335AC0000000105
