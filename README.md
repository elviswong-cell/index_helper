# Helper Recruitment 招聘平台

A real production-grade Helper recruitment platform built with Next.js 14, Firebase, and Tailwind CSS. 繁體中文介面，支援 Google 登入、任務管理、報名及後備名單。

## 功能 Features

- 🔐 Google 登入（Firebase Authentication）
- 👤 管理員：建立、修改、取消任務；查看報名名單
- 📋 一般用戶：瀏覽任務、報名、確認或後備狀態
- 📱 響應式設計：手機與電腦皆適用
- 🎨 乾淨 high-tech 深色介面
- 💾 Firestore 即時資料庫

## 技術棧 Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Firebase** (Auth + Firestore)
- **Tailwind CSS** + shadcn-style 元件
- **Radix UI** primitives
- **lucide-react** icons
- **date-fns** 日期格式化

## 快速開始 Quick Start

### 1. 安裝依賴 Install dependencies

```bash
npm install
# 或
pnpm install
```

### 2. 設定 Firebase Set up Firebase

1. 前往 https://console.firebase.google.com/ 建立新專案
2. 啟用 **Authentication** → **Google** 登入
3. 啟用 **Firestore Database**（以 production mode 開始）
4. 取得 Firebase config（Web app）
5. 複製 `.env.example` 為 `.env.local` 並填入：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 3. 設定 Firestore 安全規則 Firestore security rules

在 Firebase Console → Firestore → Rules：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tasks: anyone signed in can read; only admins can write
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null && request.auth.token.admin == true;
    }
    // Registrations: users can read/write their own
    match /registrations/{regId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

### 4. 設定管理員 Set admin

在 Firebase Console → Firestore，於 `tasks` collection 加入第一筆任務時，需要設定管理員。最簡單的做法是用 Firebase Auth 的 Custom Claims：

```bash
# 使用 Firebase Admin SDK 在本機執行
node scripts/set-admin.js your-user-uid
```

或在 Cloud Functions 中設定。或者改用簡單方式：在 `users/{uid}` document 加入 `{ "admin": true }`，並把 rule 改為 `request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.admin == true`。

### 5. 啟動開發伺服器 Start dev server

```bash
npm run dev
```

打開 http://localhost:3000

### 6. 部署到 Vercel Deploy to Vercel

```bash
npm i -g vercel
vercel
```

或在 https://vercel.com 直接 import 此 repo。記得在 Vercel project settings 加入上述環境變數。

## 推送到 GitHub Push to GitHub

### 選項 A：我幫你建立（需要 GitHub PAT）

把一個 GitHub Personal Access Token（classic, `repo` scope）傳給 Elvisbot，我會直接建立 repo 並推送。

### 選項 B：自己建立

```bash
git init
git add .
git commit -m "Initial commit: Helper recruitment platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/helper-recruitment.git
git push -u origin main
```

## 專案結構 Project Structure

```
.
├── app/                    # Next.js App Router
│   ├── admin/             # 管理員頁面
│   ├── login/             # 登入頁
│   ├── tasks/             # 任務列表
│   ├── my-registrations/  # 我的報名
│   ├── layout.tsx         # 根 layout
│   ├── page.tsx           # 首頁
│   └── globals.css        # 全域樣式
├── components/
│   ├── ui/                # shadcn-style 元件
│   ├── auth-provider.tsx  # Firebase Auth context
│   └── header.tsx         # 頁首
├── lib/
│   ├── firebase.ts        # Firebase 初始化
│   ├── db.ts              # Firestore 操作
│   ├── types.ts           # TypeScript 型別
│   └── utils.ts           # 共用工具
├── .env.example           # 環境變數範本
├── tailwind.config.ts
├── next.config.mjs
└── package.json
```

## 資料模型 Data Model

### Task
```ts
{
  id: string
  schoolName: string        // 學校／活動名稱
  startAt: Timestamp        // 開始時間
  endAt: Timestamp          // 結束時間
  positions: {              // 職位名額
    ta: number              // TA 名額
    mt: number              // MT 名額
  },
  hourlyRate: number        // 時薪
  notes?: string            // 備註
  status: 'open' | 'closed' | 'cancelled'
  createdBy: string         // 管理員 uid
  createdAt: Timestamp
}
```

### Registration
```ts
{
  id: string
  taskId: string
  userId: string
  userEmail: string
  userName: string
  position: 'ta' | 'mt'
  status: 'confirmed' | 'waitlist'
  createdAt: Timestamp
}
```

## 報名邏輯 Enrollment Logic

- 用戶報名時，檢查該職位 confirmed 名額
- 若未滿 → status = `confirmed`
- 若已滿 → status = `waitlist`（灰色顯示）

## 授權 License

MIT
