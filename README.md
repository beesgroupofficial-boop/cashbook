# 現金出納帳（Bee's）

React + Vite + Firebase（Auth / Firestore）、Vercel で公開する構成です。

## 1. Firebase の準備

1. Firebase コンソールで新しいプロジェクトを作成し、ウェブアプリを追加して設定値を控えます。
2. **Authentication** で「メール / パスワード」を有効にし、使う人のアカウントを「ユーザーを追加」で作成します。
3. **Firestore Database** を作成します（ロケーションは asia-northeast1 か asia-northeast2）。
4. **利用者の登録**：Authentication のユーザー一覧に出る各人の「ユーザー UID」をコピーし、Firestore に `members` コレクションを作って、ドキュメント ID を UID にしたドキュメントを追加します（フィールドは `name: "ゆり"` など何でも可）。登録がない人はログインしても使えません。
5. ルールを反映します。

```bash
firebase login            # すでにログイン済みなら不要
firebase use --add        # 作ったプロジェクトを選ぶ
firebase deploy --only firestore:rules
```

## 2. ローカルで動かす

```bash
cp .env.example .env      # Firebase の設定値を入れる
npm install
npm run dev
```

## 3. Vercel に公開

1. GitHub にリポジトリを作って push します（`.env` は `.gitignore` 済み）。
2. Vercel で「Add New → Project」からリポジトリを読み込みます。Framework は Vite のまま。
3. **Environment Variables** に `.env` と同じ 6 つの `VITE_FIREBASE_...` を登録して Deploy。

## 4. 使い始め

ホームの「設定」で、スプレッドシートの最終行の現金在高を繰越金として保存してください。

## データ構成（Firestore）

| コレクション | 内容 |
|---|---|
| `txns` | 入出金（日付・区分・店舗・入金/出金・金額・メモ・入力者） |
| `sales` | 店舗別売上（売上日・店舗・金額・メモ）。入力した日の入金として現金在高に加算 |
| `counts` | 金庫チェック（金種ごとの枚数・小口・実際・帳簿・差異・メモ） |
| `settings/main` | 繰越金 |
| `members/{uid}` | 利用できる人の一覧（コンソールから追加） |
