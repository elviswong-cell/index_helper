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
NEXT_PUBLIC_FIREBASE_APP_ID=...

# 管理員 UID（逗號分隔）Admin UIDs, comma-separated
NEXT_PUBLIC_ADMIN_UIDS=...

# 寄信 Email（Resend）— 僅伺服器端，勿加 NEXT_PUBLIC_ 前綴
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

`.env.local` 已被 `.gitignore` 排除，不會提交到 Git。

### 3. 設定 Firestore 安全規則 Firestore security rules

規則已收錄在本 repo 的 [`firestore.rules`](./firestore.rules)（Firestore）與
[`storage.rules`](./storage.rules)（Cloud Storage，SCRC 文件），並由
[`firebase.json`](./firebase.json) 指向它們。用 Firebase CLI 部署：

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules --project minds-56fa1
```

或把兩個檔案的內容貼到 Firebase Console → Firestore / Storage → Rules。

⚠️ 規則用 `request.auth.token.admin`（Firebase Auth custom claim）作管理員判斷。
應用程式本身用 `NEXT_PUBLIC_ADMIN_UIDS` **只控制介面顯示，並不是安全邊界** ——
就算某個 UID 在 `NEXT_PUBLIC_ADMIN_UIDS` 裡、能看到 `/admin/tutors` 頁面，
Firestore 仍會擋掉它的讀取請求，直到該 UID 也有 `admin: true` 這個 custom
claim 為止。這正是「導師資料庫」頁面顯示 **Failed to load / 0 tutors** 最常見
的原因 —— 見下面第 4 步。

### 4. 設定管理員 Set admin

`NEXT_PUBLIC_ADMIN_UIDS` 只是讓對的人看到 `/admin` 選單；要讓 Firestore 規則真
的放行，必須另外幫同一批 UID 設定 Firebase Auth custom claim。用
[`scripts/set-admin.js`](./scripts/set-admin.js)：

```bash
# 1) Firebase Console → Project settings → Service accounts →
#    Generate new private key，下載 JSON（妥善保管，不要提交到 git）
export FIREBASE_SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)"

# 2) 幫 NEXT_PUBLIC_ADMIN_UIDS 裡的每個 UID 設定 admin claim
npm run set-admin
# 或指定特定 UID
npm run set-admin -- your-user-uid

# 撤銷：
npm run set-admin -- --revoke your-user-uid
```

跑完之後，該使用者必須**登出再重新登入**（custom claim 只在簽發新的 ID token
時才會生效，不會馬上套用到已登入的 session）。

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

## 開發流程 Development

```bash
git clone https://github.com/elviswong-cell/index_helper.git
cd index_helper
npm install
cp .env.example .env.local   # 填入 Firebase / Resend 設定
npm run dev
```

提交前建議先跑：

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # 正式建置
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
├── .eslintrc.json         # ESLint 設定（next lint）
├── .gitignore
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

看到 **Failed to load / 0 tutors** 但確定自己是管理員？代表 Firestore 規則還
不放行你的 UID —— 見上面「[設定管理員 Set admin](#4-設定管理員-set-admin)」。

## 授權 License

MIT
