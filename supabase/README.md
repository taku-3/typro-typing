📘 Typro README / 開発運用ドキュメント（完成版）
🧩 概要

Typro は、プログラミング学習と連動したタイピングゲームです。
教育用途を前提に設計されており、成長可視化・ランキング・オンライン対戦などを軸に開発されています。

🏗 技術構成
フロントエンド
Next.js（App Router）
TypeScript
Tailwind CSS
Vercel（ホスティング）
バックエンド
Supabase
PostgreSQL（DB）
Edge Functions（API）
独自JWT認証（Supabase Authは未使用）
メール送信
Resend
ドメイン / DNS
Cloudflare
本番ドメイン：https://typro.app
🔐 認証方式（重要）

Typroは 独自JWT認証 を採用

特徴
Supabase Authは使用しない
Edge FunctionsでJWTを発行・検証
HS256で署名
🔄 認証フロー
① サインアップ
username + password + email
minors → parental_consent 必須
② メール認証
auth-email-verify-request
トークン生成（DB保存）
メール送信（Resend）
/verify-email?token=xxx
auth-email-verify-confirm
emails.verified_at 更新
③ ログイン
username + password
JWT発行
④ パスワード再設定
/forgot-password
auth-password-reset-request
メール送信
/reset-password?token=xxx
auth-password-reset-confirm
credentials.password_hash 更新
🗄 DB構成（主要テーブル）
players
id
display_name
kind（guest / registered）
credentials
username（unique）
password_hash
emails
email
is_primary
verified_at
consents
parental_consent
consented_at
password_reset_tokens
token_hash
expires_at
used_at
email_verification_tokens
token_hash
expires_at
used_at
⚙️ Edge Functions一覧
認証系
auth-signup
auth-login
auth-password-change
auth-account-delete
メール関連
auth-email-verify-request
auth-email-verify-confirm
パスワード再設定
auth-password-reset-request
auth-password-reset-confirm
その他
mypage-get
leaderboard-get
score-submit
🔑 環境変数
Supabase（Edge Functions Secrets）
PROJECT_URL=https://xxxxx.supabase.co
SERVICE_ROLE_KEY=xxxxx
JWT_SECRET=xxxxx

RESEND_API_KEY=xxxxx
RESEND_FROM_EMAIL=Typro <noreply@typro.app>

APP_BASE_URL=https://typro.app
PASSWORD_RESET_URL_BASE=https://typro.app/reset-password

PASSWORD_RESET_TOKEN_SECRET=xxxxx
PASSWORD_RESET_EXPIRES_MINUTES=15
フロント（Vercel）
NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL=https://xxxxx.supabase.co/functions/v1
🚀 本番デプロイ手順
① DB migration
supabase db push
② Functionsデプロイ
supabase functions deploy

または個別

supabase functions deploy auth-email-verify-request
③ フロントデプロイ
git push origin main

→ Vercel自動デプロイ

④ ドメイン設定
CloudflareでDNS設定
Vercelに typro.app 追加
🧪 本番チェックリスト
認証
サインアップできる
メール届く
認証リンク動く
ログイン
JWT発行される
パスワード再設定
メール届く
再設定できる
マイページ
認証状態表示
再送ボタン
⚠️ 注意点（今回のハマりポイント）
1. config.toml未登録

→ Functionが存在しない扱い

2. verify_jwt設定
verify_jwt = false

→ 独自JWTの場合必須

3. migration未反映

→ 本番で500エラー

4. Edge Function Secrets

→ env不足でメール送信失敗

5. ドメイン未接続

→ NXDOMAINエラー

📈 今後の開発ロードマップ
優先度高
オンライン対戦（1vs1）
マッチング機能
次
ランキングUI改善
弱点分析
長期
Typroポイント
サブスク / チケット課金
🧠 開発方針
migrationベースでDB管理
Edge FunctionsでAPI完結
フロントは疎結合
セキュリティ優先（token・hash）
🧩 今後の拡張前提
guest → registered統合
デバイス紐付け
リアルタイム通信（WebSocket）