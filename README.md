# さぎぬま幼稚園 おやじ倶楽部 Web

在園児の保護者向けの、イベント告知・参加確認・写真共有などを1か所にまとめる会員制サイト。
スマホ最優先・無料運用を基本方針とする。**動画機能は一切実装しない。写真は画像のみ、イベント告知チラシは画像/PDFに対応。**

- フロント: React + Vite + TypeScript + Tailwind CSS（HashRouter）
- バックエンド: Supabase（Auth / PostgreSQL / RLS / Storage）
- ホスティング: GitHub Pages（GitHub Actions で自動デプロイ）

現在の実装状況は末尾「実装フェーズ」を参照（Phase 1 = MVP）。

---

## 1. 必要なもの
- Node.js 20 以上
- GitHub アカウント
- Supabase アカウント（無料）

## 2. ローカル起動

```bash
npm install
cp .env.example .env      # 値を Supabase の情報に書き換える
npm run dev               # http://localhost:5173
```

ローカルでは `.env` の `VITE_BASE=/` にしておくと動作が分かりやすい。

## 3. Supabase セットアップ

1. https://supabase.com でプロジェクトを新規作成（Region は Tokyo 推奨）。
2. **SQL Editor** で以下を順に実行:
   - `supabase/migrations/0001_init.sql`（テーブル・RLS・関数）
   - `supabase/migrations/0002_photos.sql`（写真テーブル・Privateバケット `event-photos`・Storageポリシー）
   - `supabase/migrations/0003_accounting.sql`（会計系テーブル・Privateバケット `receipts`・職員のみポリシー）
   - `supabase/migrations/0004_surveys.sql`（アンケート・ご意見テーブル・ポリシー）
   - `supabase/migrations/0005_roles.sql`（役職の任命RPC・歴代取得関数）
   - `supabase/migrations/0006_announcements.sql`（お知らせテーブル・参加人数のRealtime設定）
   - `supabase/migrations/0007_updates.sql`（告知メディア・加盟者・総予算・意見返信・管理削除）
   - `supabase/migrations/0008_self_delete.sql`（本人のアカウント削除）
   - `supabase/migrations/0009_fk_setnull.sql`（削除時のFK調整）
   - `supabase/migrations/0010_event_end_time_and_owner_trigger.sql`（イベント終了時間・オーナー自動付与トリガー）
   - `supabase/migrations/0011_set_signup_code.sql`（園コードを `saginuma-2026` に設定）
   - `supabase/migrations/0012_tshirt_delivery.sql`（Tシャツ受け渡し管理）
   - `supabase/migrations/0013_first_registered_admin.sql`（初回登録者を会長・オーナーにする）
   - `supabase/migrations/0014_feedback_threads.sql`（ご意見・ご質問の個別やりとり）
   - `supabase/seed.sql`（園コード・クラス・オーナー設定 ※後述）
3. **Authentication > Providers > Email** を有効化。
   メールアドレスを使わず「氏名 + パスワード」で登録するため、**Confirm email = OFF** にする。
4. **Authentication > URL Configuration** の `Site URL` / `Redirect URLs` に
   本番URL（例 `https://<ユーザー名>.github.io/oyaji-club-web/`）を追加。
5. **Storage**：`0002_photos.sql` が Private バケット `event-photos` とポリシーを自動作成する。
   写真は会員のみ閲覧（署名付きURL・検索エンジン非公開）。手動作成は不要。

### 環境変数

| 変数 | 取得場所 | 用途 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase > Project Settings > API > Project URL | 接続先 |
| `VITE_SUPABASE_ANON_KEY` | 同 > Project API keys > `anon public` | 公開キー（RLSで保護） |
| `VITE_BASE` | 自分で指定 | Pages の base パス（例 `/oyaji-club-web/`、独自ドメインは `/`） |

> `anon key` はビルド成果物（公開JS）に埋め込まれるが、これは正常。
> データは Supabase 側の **Row Level Security (RLS)** で保護され、キー単体では何も取得・変更できない。

## 4. 管理者・園コードの初期設定

`supabase/seed.sql` を編集して実行する。

1. **園コード**（新規登録に必須の共有コード）:
   ```sql
   update app_config set signup_code = 'saginuma-2026' where id = 1;
   ```
   このコードを LINE 等で保護者に配布する。変更すれば以後の新規登録を止められる。
2. **クラス登録**: 初期投入は `insert into classes ...` を実際の組名に合わせて編集。運用開始後はサイト内の「お世話係 > クラス管理」から追加・修正できる。
3. **サイトオーナー設定**:
   - まず自分がサイトから「新規登録（園コード入力）」を完了する。
   - `0013_first_registered_admin.sql` 実行後は、最初に登録したアカウントへ会長・オーナー権限が自動付与される。
   - 手動で付与する場合は、`seed.sql` の `<YOUR_EMAIL>` を Supabase Auth の内部メールに変えてオーナー付与SQLを実行。
   - メールなし登録では、オーナー自動付与より `seed.sql` または「お世話係 > 役職管理」での付与を推奨。
   - オーナー権限は永久保持（会長職とは独立）。会長・お世話係の付与はサイト内の「お世話係 > 役職管理」から操作できる。

## 5. GitHub リポジトリ & Pages 公開

1. **Public** リポジトリを作成（Pages 無料公開の前提）。
2. リポジトリ名に合わせて `VITE_BASE` を決める（Actions は自動でリポジトリ名を使用）。
3. **Settings > Secrets and variables > Actions** に登録:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Settings > Pages > Build and deployment > Source = GitHub Actions** を選択。
5. `main` に push すると `.github/workflows/deploy.yml` が自動でビルド＆公開する。

```bash
git init
git add -A
git commit -m "init: おやじ倶楽部 Web Phase 1"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/oyaji-club-web.git
git push -u origin main
```

公開URL: `https://<ユーザー名>.github.io/oyaji-club-web/`

## 6. 無料運用について（なぜこの構成か）

| サービス | 無料枠(目安) | 位置づけ |
|---|---|---|
| GitHub Pages | サイト1GB / 帯域100GB/月 | フロント公開。十分 |
| Supabase Free | DB 500MB / Storage 1GB / 50,000 MAU / 7日無操作で一時停止 | 認証・DB・写真 |

- **写真容量(1GB)** が唯一のボトルネック。アップロード時に長辺約1600–2000px・WebP圧縮＋サムネ生成で節約する（Phase 2）。目安 約2,500–4,000枚。
- **7日無操作の自動停止**対策として、通常アクセスがない期間は GitHub Actions の週次ジョブで軽くアクセスする運用を追加予定。
- 容量が増えた場合のみ、最小コストで Supabase の Storage を拡張する。

## 7. セキュリティ方針
- 権限判定はすべて **DB(RLS)** で強制。画面の出し分けは補助のみ。
- 新規登録は **園コード必須**（子どもの写真・個人情報を扱うため入口を限定）。
- 写真は Phase 2 で **Private Storage + 署名付きURL**（検索エンジン非公開・会員のみ閲覧）。
- 参加世帯一覧では**大人の氏名は表示しない**（世帯名＋子ども名＋クラスのみ）。

## 8. ディレクトリ構成
```
src/
  lib/         supabase / 圧縮 / 日付など
  context/     認証コンテキスト
  hooks/       クラス取得など
  components/  UI部品・レイアウト・ガード
  pages/       一般ページ
  pages/mypage 世帯・家族・子ども・アレルギー
  pages/staff  お世話係専用
supabase/
  migrations/  スキーマ・RLS・関数
  seed.sql     初期データ・オーナー設定
```

## 9. 実装フェーズ
- **Phase 1（済）**: 認証(園コード)・世帯/家族/子ども/クラス・イベント一覧/詳細・参加登録/人数/世帯一覧・お世話係のイベント作成/公開
- **Phase 2（済）**: 写真（複数アップロード・自動圧縮WebP+サムネ・HEIC変換・Privateギャラリー・署名付きURL・拡大/スワイプ・単体&複数(zip)DL・権限別削除）
- **Phase 3（済）**: お世話係ダッシュボード・イベント複製・参加状況管理（世帯別参加者・人数内訳・連絡欄・参加者アレルギー一覧）
- **Phase 4（済）**: 会計（準備・買い物＋予算、レシート画像＋立替精算、料金形式、当日受付＋ゲスト参加、当日会計＋金額変更＋集計）
- **Phase 5（済）**: アンケート（設問作成/並替・5段階/単一/複数/はいいいえ/自由記述・回答・自動集計）・Tシャツサイズ集計・ご意見/質問（匿名可・未確認管理）
- **Phase 6（済）**: 役職の任命UI（会長がお世話係任命/解除・次期会長指名、オーナーは強制変更）・年度別役職履歴・歴代役職ページ・マイページ役職履歴・過去イベント年度別・イベント実績（参加/収入/支出/収支・前年実績リンク）
- **Phase 7（済）**: お知らせ・参加人数Realtime・PWA対応
- **Phase 8（済）**: 告知画像/PDF・加盟者名簿・アカウント名簿・ご意見返信公開・受付集金・総予算・アカウント削除
- **Phase 8.3（済）**: イベント終了時間・ホームのチラシ表示・お世話係クラス管理
- 今後: Supabase自動停止対策、運用テスト、スマホ実機での表示調整
