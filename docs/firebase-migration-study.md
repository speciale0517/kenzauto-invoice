# Firebase移行 検討メモ（2026-10-07）

直輝さんから「localStorage方式をFirebase方式にしたい」という提案があり、その検討結果をまとめる。
**次回セッションで移行の設計を行う。** コードはまだ変更していない。

- 説明資料（直輝さん向け・中学生にもわかる版）：「Firebaseにするとどうなる？」 https://claude.ai/artifact/TXt2aCty4fNJqCawFYYqVV （非公開。共有するには画面の共有メニューから操作）

## 現状（2026-10-07時点）

- `index.html` 1ファイルで完結。保存先はlocalStorage（プレフィックス`ken_`）
- 保存キー：`ken_shop` / `ken_ledger` / `ken_customers` / `ken_vehicles` / `ken_templates` / `ken_lastbackup`
- 各データを配列・オブジェクトごと丸ごと`JSON.stringify`して`setStoreItem()`で保存（`saveLedgerToStorage()`等）
- localStorageの上限は約5MB。`estimateStorageUsageBytes()`で4MB超過時に警告
- 伝票No・お客様コードは高水位マーク（`shop.invoiceSeq` / `shop.customerSeq`）で採番

## Firebase（Cloud Firestore）無料枠（Sparkプラン）

| 項目 | 無料枠 |
|---|---|
| 保存容量 | 1 GiB |
| 読み取り | 50,000回/日 |
| 書き込み | 20,000回/日 |
| 削除 | 20,000回/日 |
| 通信量 | 10 GiB/月 |
| 1ドキュメント最大サイズ | 1 MiB（一般に知られている仕様。今回は未確認） |

- 無料枠を超えるとその日は使えなくなる。Blazeプラン（従量課金）にも同じ無料枠が付き、超えた分だけ課金
- Cloud Storage（画像などのファイル保存）は2026-02-03以降Blazeプラン必須（5GBまで無料）
- **公式ページはこの環境から開けず、第三者のまとめサイトで確認した値。設計前に公式の料金ページで再確認すること**
- 試算：請求書1件を数KBとすると年1,000件で数MB。容量は問題にならない。読み取り回数は、毎回全件を読み込む作りにしないこと（キャッシュ前提）

## メリット

1. 複数の端末（PC・iPad・スマホ）でデータを共有できる
2. 端末の故障や買い替え、Safariのデータ消去、iOSによる自動削除でデータが消えなくなる
3. 容量の心配がほぼなくなる
4. 共同利用や、派生版（`kzs_`）の複数店舗対応へ広げやすい

## デメリット・リスク

1. ネット接続が前提になる。オフライン中に複数の端末で同時に編集すると、データがぶつかる
2. Firebaseのログイン機能はfile://では動かないため、Firebase Hosting等での公開とログインが必要になる
3. セキュリティルールを誤ると顧客の個人情報（氏名・電話番号・住所）が外部から丸見えになる（最大のリスク）
4. Googleの料金・仕様変更に依存する
5. 台帳は1件ずつのドキュメントに分割して保存する作りへの変更が必要（1MiB上限）。採番も複数の端末で同時に使っても番号が重ならない処理（トランザクション等）に作り直す必要がある
6. Playwrightのテストに、Firebaseのテスト用環境（エミュレータ）を組み込む必要がある

## 開発期間の目安（実働）

| 工程 | 期間 |
|---|---|
| Firebaseの準備（プロジェクト作成、Hosting公開、ログイン設定） | 2〜3日 |
| 保存の仕組みの置き換え（Firestore用に書き換え、台帳を1件ずつ保存する形にする） | 5〜7日 |
| 採番の作り直し、オフライン対応、同時編集でぶつかったときの処理 | 3〜5日 |
| 今のlocalStorage／バックアップJSONからの移行機能 | 2〜3日 |
| セキュリティルールの作成と検証 | 2〜3日 |
| テストの組み直しと、iPad実機での確認 | 3〜5日 |
| **合計** | **約3〜5週間**（試験運用込みで1〜2か月） |

## 推奨案

段階的に移行する。

1. **第1段階（1〜2週間）**：localStorageはそのまま残し、Firestoreへの自動バックアップだけを追加する
2. **第2段階（3〜5週間）**：複数の端末で同時に使いたい要望がはっきりしてから、本格的に移行する

## 次回セッション（設計）で決めること

- [ ] 直輝さんの一番の目的：複数の端末で使いたいのか、データを失いたくないのか（→ 第1段階のみか、全面移行か）
- [ ] 同時に使う端末の台数・利用者（お父さんのみか、スタッフも使うか）
- [ ] ログイン方式（Googleアカウント／メール＋パスワード）と、利用者の権限
- [ ] Firestoreのデータ構造（`shops/{shopId}/invoices/{invoiceId}`等。顧客・車両・定型文の分け方）
- [ ] 採番の方式（トランザクションでカウンタを更新する、など）
- [ ] オフライン方針（Firestoreのオフライン保存を使うか、同時編集でぶつかったときの扱い）
- [ ] 公開方法（Firebase Hosting）と、今の「HTML1ファイルで完結」方針をどう扱うか（CDN読み込み・SRI方針との整合）
- [ ] 既存データの移行手順（localStorage／バックアップJSONからの取り込み）
- [ ] 将来、車検証の写真などを保存するか（Blazeプランへの登録の要否）
- [ ] 派生版（`ケンズ請求書アプリ/`、`kzs_`）にも適用するか

## 出典

- [Cloud Firestore Free Plan 2026（costbench）](https://costbench.com/software/database-as-service/firestore/free-plan/)
- [Spark vs Blaze: the Firebase pricing guide（DEV Community）](https://dev.to/androve2k/spark-vs-blaze-the-firebase-pricing-guide-i-wish-id-read-sooner-onb)
- [Firebase Pricing in 2026（budgetforge）](https://www.budgetforge.dev/tools/firebase-pricing-2026)
- [Cloud Storage for Firebase 料金変更FAQ（公式）](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- [Firebase Pricing（公式）](https://firebase.google.com/pricing)
