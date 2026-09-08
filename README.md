# さぎぬま幼稚園 おやじ倶楽部 Web

在園児の保護者向けの、イベント告知・参加確認・写真共有などを1か所にまとめる会員制サイト。
スマホ最優先・無料運用を基本方針とする。**動画機能は一切実装しない（画像のみ）。**

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
   - `supabase/seed.sql`（園コード・クラス・オーナー設定 ※後述）
3. **Authentication > Providers > Email** を有効化。
   本番運用では **Confirm email = ON** を推奨（実在アドレスの確認）。
   確認 ON の場合、登録者はメール内リンクを開いた後にログイン→登録が自動完了する。
4. **Authentication > URL Configuration** の `Site URL` / `Redirect URLs` に
   本番URL（例 `https://<ユーザー名>.github.io/oyaji-club-web/`）を追加。
5. **Storage** は Phase 2（写真機能）で Private バケットを追加する。

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
   update app_config set signup_code = 'SAGINUMA2026' where id = 1;
   ```
   このコードを LINE 等で保護者に配布する。変更すれば以後の新規登録を止められる。
2. **クラス登録**: `insert into classes ...` を実際の組名に合わせて編集。
3. **サイトオーナー設定**:
   - まず自分がサイトから「新規登録（園コード入力）」を完了する。
   - `seed.sql` の `<YOUR_EMAIL>` を自分のメールに変え、オーナー付与SQLを実行。
   - オーナー権限は永久保持（会長職とは独立）。会長・お世話係の付与は今後のフェーズでサイトから操作可能にする。

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
- Phase 2: 写真（圧縮アップロード・Privateギャラリー・署名付きURL・DL・削除権限）
- Phase 3: お世話係の高度機能（複製・ダッシュボード・参加状況管理）
- Phase 4: 会計（準備買物・予算・立替精算・当日受付・当日会計）
- Phase 5: アンケート・アレルギー集計・Tシャツ集計・ご意見管理
- Phase 6: 役職履歴・歴代ページ・過去イベント実績
- Phase 7: HEIC変換・Realtime・お知らせ・PWA検討
