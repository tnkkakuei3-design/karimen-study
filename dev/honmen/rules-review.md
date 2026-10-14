# 本免問題の現行ルール監査

基準日: 2026-10-14。一次資料（警察庁・都道府県警）を確認。

## 本免学科の構成
文章90問各1点、危険予測5問各2点。危険予測は3肢全部正解のみ得点。100点満点90点以上合格。
出典: https://www.police.pref.miyagi.jp/menkyo/siken/siken_shiteisotufutuu.html

## 本免学科の時間
普通免許の学科試験は95問・50分。
出典: https://www.police.pref.osaka.lg.jp/tetsuduki/untenmenkyo/juken/choku/3709.html

## 生活道路の法定速度
2026年9月1日から中央線等のない生活道路の自動車の法定速度は30km/h。中央線・車両通行帯のある道路、往復分離道路等は60km/h。指定速度があれば指定に従う。
出典: https://www.pref.yamagata.jp/800032/houteihikisage.html

## 新基準原付
2025年4月1日から従来の50cc以下に加え、125cc以下かつ最高出力4.0kW以下の二輪車が一般原付に追加。すべての125cc車が原付になるわけではない。
出典: https://www.npa.go.jp/bureau/traffic/menkyo/menkyo_nirinsha.html

## 貨物車の高速道路速度
2024年4月1日から大型貨物・特定中型貨物の高速自動車国道での法定最高速度は90km/h。トレーラ、大型特殊、三輪自動車は80km/hのまま。指定速度と適用道路の条件に注意。
出典: https://www.npa.go.jp/bureau/traffic/highway/index.html

## 積載寸法
2022年5月13日から対象自動車の積載物の長さ・幅は車体の1.2倍まで、前後それぞれ車長の1/10、左右それぞれ車幅の1/10以内のはみ出し。二輪等へ一律適用しない。
出典: https://www.police.pref.osaka.lg.jp/kotsu/kaisei/13056.html

## 準中型区分
2017年3月12日に準中型免許新設。旧普通免許の5t未満・積載3t未満の経過措置を新規普通免許と混同しない。
出典: https://www.keishicho.metro.tokyo.lg.jp/menkyo/menkyo/chugata.html

## 二輪高速二人乗り
大型二輪又は普通二輪免許の期間3年以上かつ20歳以上。通行禁止指定区間は別にある。
出典: https://www.keishicho.metro.tokyo.lg.jp/kotsu/jikoboshi/highway/regu2seat_bike.html

## 自転車等の側方通過
2026年4月1日から自動車等が自転車等の右側を通過（追越しを除く）する際、十分な間隔がなければ間隔に応じた安全な速度。固定数値を一律の法定義務としない。
出典: https://www.police.pref.osaka.lg.jp/kotsu/kaisei/23662.html

## 自転車の青切符
2026年4月1日から16歳以上の自転車運転者が交通反則通告制度の対象。
出典: https://www.npa.go.jp/bureau/traffic/bicycle/info.html

## 普通・準中型の受験年齢
2026年4月1日から普通・準中型の仮免取得と本免試験受験は17歳6か月から。本免許取得可能年齢18歳とは区別。
出典: https://www.keishicho.metro.tokyo.lg.jp/menkyo/oshirase/exam_age.html

## 監査の扱い
原資料の正解はsourceAnswer、原文はsourceText/originalText等で保存。最終判断はfinal-review.jsonを優先し、旧rule-corrections.jsonは経過記録として扱う。全760問の読解と全78件のneeds-review判断は完了。

## 原付の表記方針
原資料の「原動機付自転車」「原付」は、特定小型の2023年新設より前の一般原付を意味するため、公開側text・statements・explanation内の該当語を「一般原動機付自転車」「一般原付」へ置換する。すでに「一般」「特定小型」「特例特定小型」が付いている場合や、原付全体の定義を問う記述は機械置換しない。originalText・originalStatements・sourceAnswerは維持する。特定小型も対象の標識に関する記述はこの置換だけで解決しないので個別審査。

## 追加事項
- 2025年4月1日に保管場所標章と表示義務が廃止。車庫証明制度自体は存続。https://www.police.pref.osaka.lg.jp/ochikakunokeisatsusho/keisatsushobetsujoho/12/2/koutuuka/20600.html
- 交通教則の基本記述は https://www.npa.go.jp/bureau/traffic/20241113kyousoku.pdf を参照。ただしこの版より後の法改正を上記各一次資料で補正。

## 全件読解監査の完了記録
8セット全760問の問題文・正解を逐次読解。危険予測40問は3肢ずつ読解。原資料の図との視覚的対応検証は別担当作業に依存し、ここでは全760問の画像を確認したとは主張しない。読解時点のtext/answer/statementsのハッシュをrule-audit-coverage.jsonに保存。差分適用後は検証対象ハッシュが変わる。

最終レビューは86件（全needs-review 78件を含む）、保留0件。初期に保留したh10-030・h10-079・h9-061は、原文を保存し同じ教育テーマの明確な代替設問で解決。h2-069などの不鮮明原文は推定転記として確定せず、編集由来を記録した代替設問を採用する。h4-009の画像は転記担当が修正し独立照合も合格したとの親担当報告を受領。通行条件を満たす特例特定小型原付を含める最終文面を用意済み。

適用順はfinal-review.json、次にmoped-terminology.json。後者に一般原付への置換対象ID・フィールド・置換後値と除外理由を個別記録。免許区分名「原付免許」や特定小型も対象の自賠責義務は機械置換しない。監査日付は環境のUTC日付2026-10-14に統一した。
