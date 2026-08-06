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
4. 啟用 **Cloud Storage**（存放 SCRC 文件）
5. 取得 Firebase config（Web app）
6. 複製 `.env.example` 為 `.env.local` 並填入：

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
    // Registrations: users create/cancel their own; admins review everyone's
    match /registrations/{regId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null &&
        (resource.data.userId == request.auth.uid || isAdmin());
    }
    // Profiles: users manage their own; admins read and correct any
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      allow read, write, delete: if isAdmin();
    }
    // Invoices: freelancers submit and read their own; admins manage all
    match /invoices/{invoiceId} {
      allow read: if request.auth != null &&
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin();
    }
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

⚠️ 上面用 `request.auth.token.admin` 作管理員判斷。應用程式本身用 `NEXT_PUBLIC_ADMIN_UIDS`
只控制介面顯示，**並不是安全邊界** — 必須同時設定 Firebase custom claims（或把
`isAdmin()` 改成讀 `users/{uid}.admin` 欄位），否則規則會擋住管理員的操作。

### Storage 規則 Storage rules

SCRC 是敏感個人文件，只有本人與管理員可以讀取：

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /scrc/{uid}/{file} {
      allow read: if request.auth != null &&
        (request.auth.uid == uid || request.auth.token.admin == true);
      allow write: if request.auth != null && request.auth.uid == uid
        && request.resource.size < 5 * 1024 * 1024;
      allow delete: if request.auth != null &&
        (request.auth.uid == uid || request.auth.token.admin == true);
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

### Task（課程，可以有多堂）
```ts
{
  id: string
  schoolName: string        // 學校／活動名稱
  startAt: Timestamp        // 第一堂開始時間（由 lessons 自動計算）
  endAt: Timestamp          // 最後一堂結束時間（由 lessons 自動計算）
  lessons: [                // 每一堂課
    {
      id: string            // 穩定 id，編輯時不會變
      startAt: Timestamp
      endAt: Timestamp
      title?: string        // 例如「工作坊第一日」
    }
  ],
  positions: {              // 每堂的職位名額
    ta: number              // TA 名額（每堂）
    mt: number              // MT 名額（每堂）
  },
  rates?: { mt: number; ta: number }
  rateUnit?: 'hourly' | 'daily'
  address?: string          // 學校地址
  mapUrl?: string
  deadline?: Timestamp      // 報名截止
  meetUrl?: string
  meetAt?: Timestamp
  notes?: string            // 備註／說明
  status: 'open' | 'closed' | 'cancelled'
  createdBy: string         // 管理員 uid
  createdAt: Timestamp
}
```

沒有 `lessons` 的舊資料仍可正常顯示：系統會用 `startAt`／`endAt` 當成單一堂課。

### Registration（報名）
```ts
{
  id: string
  taskId: string
  userId: string
  userEmail: string
  userName: string
  userPhone: string
  position: 'ta' | 'mt'
  lessonIds: string[]                            // 報名者選擇出席的堂數
  lessonStatuses: {                              // 管理員逐堂審批
    [lessonId]: 'pending' | 'confirmed' | 'declined' | 'reserve'
  }
  status: 'pending' | 'confirmed' | 'declined' | 'reserve'  // lessonStatuses 的總結
  createdAt: Timestamp
  confirmedAt?: Timestamp
}
```

## 報名邏輯 Enrollment Logic

- 建立工作時，管理員可以加入多堂課（日期／時間／名稱）
- 報名者在課堂表格中勾選自己可以出席的堂數，全部堂數預設勾選
- 報名後每一堂都是 `pending`，等待管理員審批
- 管理員可以**逐堂**選擇「確認／後備／拒絕」——即接受部分日期、拒絕其他日期，
  一次儲存後只寄出一封通知電郵
- 名額按**每堂**計算：確認時會檢查該堂該職位是否已滿
- `status` 由 `lessonStatuses` 總結而成：任何一堂已確認 → `confirmed`；
  否則仍有待審核 → `pending`；否則有後備 → `reserve`；全部拒絕 → `declined`

## 通知電郵 Notification Emails

管理員儲存審批後（可取消勾選「寄電郵通知」），系統會透過 Resend 寄出詳細電郵，內容包括：

- 學校／活動名稱、職位、薪酬
- 地址（附 Google 地圖連結）
- 報名截止時間、線上會議連結
- 每一堂的日期、時間與審批結果（確認／不需要／後備）
- 備註／說明（如有）

需要在環境變數設定 `RESEND_API_KEY`，以及可選的 `RESEND_FROM_EMAIL`。

## 個人資料與 SCRC Profile & SCRC

報名任何工作之前，導師必須在「設定」填妥：

| 欄位 | 說明 |
| --- | --- |
| 電話號碼 | 聯絡用 |
| SCRC 文件 | 性罪行定罪紀錄查核結果（圖片或 PDF），存放於 Firebase Storage |
| 銀行名稱 / 帳戶號碼 / 帳戶持有人姓名 | 出糧用，並會印在 Invoice 上 |

`registerForTask()` 會在伺服器邏輯再檢查一次，資料不齊全就無法報名。
上載的圖片會在瀏覽器先縮至最長邊 1600px 才上傳，避免手機相片過大。

## Invoice 流程 Invoicing

### 導師

1. 課堂**結束後**才會在 `/invoices` 出現（未上完的堂不能開 Invoice）
2. 選擇帳單月份 → 勾選該月已完成的堂數（預設全選）
3. 「發送 Invoice」會在瀏覽器產生 PDF，寄至 `avery@indexacademy.io` 與
   `joe@indexgame.hk`，同時在 Firestore 留底
4. 每人每月一張：再次遞交同月 Invoice，舊的會標記為 `superseded`（以最新一張為準）
5. 可隨時查看狀態：已收到 Invoice → 已出糧

### 管理員

`/admin/invoices` 可按狀態／月份篩選、下載 PDF、標記「已出糧」。

### PDF 產生方式

Invoice 依照公司範本以 Canvas 繪製，再包成 A4 PDF（`lib/invoice-pdf.ts`）。
之所以用點陣而非 PDF 文字圖層，是因為學校名稱是中文 — 內嵌 CJK 字型會令
bundle 增加數 MB，而瀏覽器本身已有中文字型，繪製後輸出既細（約 130KB）又穩定。

收件者寫死在 `/api/send-invoice` 伺服器端，客戶端只能提供 PDF，不能指定收件地址。

## 導師資料庫 Tutor database

`/admin/tutors`：

- 搜尋姓名／電郵／電話，並可按月份篩選堂數
- 每位導師顯示 SCRC 連結、銀行資料、已確認堂數、已完成金額
- 點入可查看逐堂紀錄與 Invoice 紀錄，並可修改或刪除帳戶資料
  （刪除只清除個人資料與 SCRC，上堂與 Invoice 紀錄保留）

## 授權 License

MIT
