"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "zh";

const STORAGE_KEY = "index-academy-lang";

type Dict = Record<string, { en: string; zh: string }>;

export const dict: Dict = {
  // Header / nav
  nav_jobs: { en: "Jobs", zh: "工作列表" },
  nav_my_registrations: { en: "My Applications", zh: "我的報名" },
  nav_settings: { en: "Settings", zh: "設定" },
  nav_admin: { en: "Admin", zh: "管理後台" },
  nav_invoices: { en: "Invoices", zh: "發票" },
  nav_tutors: { en: "Tutor database", zh: "導師資料庫" },
  nav_admin_invoices: { en: "Invoices", zh: "發票管理" },
  google_login: { en: "Sign in with Google", zh: "Google 登入" },
  logout: { en: "Log out", zh: "登出" },
  admin_badge: { en: "Admin", zh: "管理員" },

  // Home page
  home_title: { en: "INDEX ACADEMY Job Board", zh: "INDEX ACADEMY 工作列表" },
  home_subtitle: {
    en: "Browse all open jobs. Sign in with Google and set your phone number in Settings before applying.",
    zh: "瀏覽所有開放中的工作。報名前請先用 Google 登入，並在「設定」填寫電話號碼。",
  },
  no_open_jobs_title: { en: "No open jobs right now", zh: "目前沒有開放中的工作" },
  no_open_jobs_desc: { en: "Please check back later.", zh: "請稍後再回來查看。" },
  jobs_count: { en: "open jobs", zh: "個開放工作" },
  view_and_apply: { en: "View & apply", zh: "查看並報名" },
  open: { en: "Open", zh: "開放" },

  // Task detail
  back_to_jobs: { en: "Back to job list", zh: "返回工作列表" },
  job_not_found: { en: "Job not found", zh: "找不到此工作" },
  status_open: { en: "Open", zh: "開放報名" },
  status_cancelled: { en: "Cancelled", zh: "已取消" },
  status_closed: { en: "Closed", zh: "已截止" },
  label_date: { en: "Date", zh: "日期" },
  label_time: { en: "Time", zh: "時間" },
  label_pay: { en: "Pay", zh: "薪酬" },
  label_slots: { en: "Slots", zh: "名額" },
  label_address: { en: "Address", zh: "地址" },
  open_in_maps: { en: "Open in Google Maps", zh: "在 Google 地圖開啟" },
  label_deadline: { en: "Application deadline", zh: "報名截止" },
  deadline_passed: { en: "closed", zh: "已截止" },
  label_meeting: { en: "Online meeting", zh: "線上會議" },
  join_meet: { en: "Join Google Meet", zh: "加入 Google Meet" },
  label_notes: { en: "Notes", zh: "備註" },
  hours_suffix: { en: "hrs", zh: "小時" },
  slots_suffix: { en: "slots", zh: "名" },
  app_submitted: { en: "Application submitted", zh: "已提交報名" },
  app_cancelled: { en: "Application cancelled", zh: "已取消報名" },

  // Lessons
  lessons_count_suffix: { en: "lessons", zh: "堂" },
  total_suffix: { en: "in total", zh: "合計" },
  per_lesson: { en: "per lesson", zh: "每堂" },
  select_lessons: { en: "Select the lessons you can attend", zh: "選擇你可以出席的堂數" },
  select_lessons_hint: {
    en: "Tick every date you're available for — the admin can accept some dates and decline others.",
    zh: "勾選你有空的日期。管理員可以只接受其中部分日期。",
  },
  select_all: { en: "Select all", zh: "全選" },
  clear_all: { en: "Clear", zh: "清除" },
  select_lesson_required: { en: "Please select at least one lesson", zh: "請至少選擇一堂課" },
  full_still_apply_hint: {
    en: "Full lessons can still be applied for — you'll go on the reserve list for those dates.",
    zh: "已額滿的堂數仍可報名，該日期會列入後備名單。",
  },
  th_lesson: { en: "Lesson", zh: "堂數" },
  th_date: { en: "Date", zh: "日期" },
  th_time: { en: "Time", zh: "時間" },
  th_status: { en: "Status", zh: "狀態" },
  th_slots_left: { en: "Slots left", zh: "剩餘名額" },
  th_filled: { en: "Filled", zh: "已確認" },
  th_decision: { en: "Decision", zh: "審批" },
  th_school: { en: "School", zh: "學校" },
  th_course: { en: "Course", zh: "課程" },
  th_price: { en: "Price", zh: "金額" },
  th_name: { en: "Name", zh: "姓名" },
  th_contact: { en: "Contact", zh: "聯絡方式" },
  th_scrc: { en: "SCRC", zh: "性罪行查核" },
  th_bank: { en: "Bank details", zh: "銀行資料" },
  th_lessons: { en: "Lessons", zh: "堂數" },
  th_earned: { en: "Earned", zh: "已完成金額" },
  th_role: { en: "Role", zh: "職位" },

  // Profile — SCRC & bank
  settings_subtitle_full: {
    en: "Complete every field below before you can apply for jobs — we need your SCRC and payment details on file.",
    zh: "報名工作前必須填妥以下所有資料，包括性罪行定罪紀錄查核 (SCRC) 及銀行資料。",
  },
  profile_complete_title: { en: "Profile complete", zh: "資料已齊全" },
  profile_complete_desc: {
    en: "You can apply for jobs and submit invoices.",
    zh: "你可以報名工作及遞交 Invoice。",
  },
  profile_incomplete_title: { en: "Profile incomplete", zh: "資料尚未齊全" },
  profile_incomplete_desc: { en: "Still required:", zh: "尚欠：" },
  profile_incomplete_badge: { en: "Incomplete", zh: "資料不全" },
  profile_saved: { en: "Profile saved", zh: "資料已儲存" },
  profile_required_title: { en: "Complete your profile first", zh: "請先完成個人資料" },
  profile_required_desc: {
    en: "These details are required before you can apply:",
    zh: "報名前必須先提交以下資料：",
  },
  profile_required_toast: {
    en: "Please complete your profile in Settings first",
    zh: "請先在「設定」完成個人資料",
  },
  field_phone: { en: "Phone number", zh: "電話號碼" },
  field_scrcUrl: { en: "SCRC document", zh: "性罪行定罪紀錄查核 (SCRC)" },
  field_bankName: { en: "Bank name", zh: "銀行名稱" },
  field_bankAccount: { en: "Bank account number", zh: "銀行帳戶號碼" },
  field_bankAccountName: { en: "Account holder name", zh: "帳戶持有人姓名" },
  scrc_title: { en: "SCRC document", zh: "性罪行定罪紀錄查核 (SCRC)" },
  scrc_desc: {
    en: "Upload a photo or scan of your Sexual Conviction Record Check result. Required before applying.",
    zh: "請上載性罪行定罪紀錄查核結果的相片或掃描檔。報名前必須提交。",
  },
  scrc_on_file: { en: "Document on file", zh: "已提交文件" },
  scrc_none: { en: "No document uploaded yet", zh: "尚未上載文件" },
  scrc_upload: { en: "Upload document", zh: "上載文件" },
  scrc_replace: { en: "Replace document", zh: "重新上載" },
  scrc_uploaded: { en: "Document uploaded", zh: "文件已上載" },
  scrc_view_document: { en: "View uploaded document", zh: "查看已上載文件" },
  uploading: { en: "Uploading...", zh: "上載中..." },
  upload_failed: { en: "Upload failed", zh: "上載失敗" },
  view: { en: "View", zh: "查看" },
  missing: { en: "Missing", zh: "未提交" },
  bank_title: { en: "Bank details", zh: "銀行資料" },
  bank_desc: {
    en: "Used to pay you and printed on your invoices.",
    zh: "用作出糧，並會顯示在你的 Invoice 上。",
  },
  bank_name_placeholder: { en: "e.g. HSBC", zh: "例如：滙豐銀行" },
  bank_account_placeholder: { en: "e.g. 123-456789-001", zh: "例如：123-456789-001" },
  bank_holder_placeholder: { en: "Name on the bank account", zh: "銀行帳戶上的姓名" },
  bank_holder_hint: {
    en: "Must match the name on the bank account exactly.",
    zh: "必須與銀行帳戶上的姓名完全相同。",
  },

  // Invoices — freelancer
  invoices_title: { en: "Invoices", zh: "發票 Invoice" },
  invoices_subtitle: {
    en: "Bill for lessons you've finished and track when you get paid.",
    zh: "為已完成的堂數開立 Invoice，並查看出糧進度。",
  },
  invoice_need_sign_in: {
    en: "Sign in to submit invoices for your completed lessons",
    zh: "登入後即可為已完成的堂數遞交 Invoice",
  },
  new_invoice_title: { en: "New invoice", zh: "建立 Invoice" },
  new_invoice_desc: {
    en: "Only lessons that have already finished can be billed.",
    zh: "只有已經結束的堂數才可以開立 Invoice。",
  },
  no_completed_lessons: {
    en: "No completed lessons to bill yet. Once a confirmed lesson finishes it appears here.",
    zh: "暫時沒有可開立 Invoice 的堂數。已確認的堂數結束後就會在此顯示。",
  },
  billing_month: { en: "Billing month", zh: "帳單月份" },
  already_invoiced: { en: "Already invoiced", zh: "已開立" },
  invoice_month_exists: {
    en: "You've already sent an invoice for this month. Sending another replaces it — the latest one is the one that counts.",
    zh: "你已為此月份遞交過 Invoice。再次遞交會取代舊的，我們以最新一張為準。",
  },
  total_label: { en: "Total", zh: "合計" },
  preview_pdf: { en: "Download preview", zh: "下載預覽" },
  send_invoice: { en: "Send invoice", zh: "發送 Invoice" },
  send_invoice_note: {
    en: "The PDF is emailed to avery@indexacademy.io and joe@indexgame.hk, and saved to your history.",
    zh: "PDF 會寄至 avery@indexacademy.io 及 joe@indexgame.hk，並儲存在你的紀錄中。",
  },
  invoice_sent: { en: "Invoice sent to", zh: "Invoice 已寄至" },
  invoice_send_failed: { en: "Failed to send invoice", zh: "發送 Invoice 失敗" },
  invoice_needs_bank: {
    en: "Your bank details are needed on the invoice. Still required:",
    zh: "Invoice 需要你的銀行資料。尚欠：",
  },
  invoice_history: { en: "Invoice history", zh: "Invoice 紀錄" },
  invoice_history_desc: {
    en: "Every invoice you've sent, and whether it's been paid.",
    zh: "你已遞交的所有 Invoice 及出糧狀態。",
  },
  no_invoices: { en: "No invoices yet", zh: "尚未有 Invoice" },
  invoice_submitted: { en: "Invoice received", zh: "已收到 Invoice" },
  invoice_paid: { en: "Paid", zh: "已出糧" },
  invoice_superseded: { en: "Replaced", zh: "已被取代" },
  download: { en: "Download", zh: "下載" },
  cutoff_before: {
    en: "The 23rd of each month is the cut-off. Invoices sent on or before the 23rd are paid this month.",
    zh: "每月 23 日為截數日。於 23 日或之前遞交的 Invoice 會在本月出糧。",
  },
  cutoff_after: {
    en: "The 23rd has passed. Invoices sent now will be paid next month.",
    zh: "已過 23 日截數日，現在遞交的 Invoice 將順延至下個月出糧。",
  },

  // Invoices — admin
  admin_invoices_title: { en: "Invoices", zh: "發票管理" },
  admin_invoices_subtitle: {
    en: "Invoices submitted by freelancers. Mark them paid once payment is made.",
    zh: "自由工作者遞交的 Invoice。出糧後請標記為「已出糧」。",
  },
  invoice_list: { en: "Submitted invoices", zh: "已遞交的 Invoice" },
  invoice_list_desc: {
    en: "Filter by status or billing month.",
    zh: "可按狀態或帳單月份篩選。",
  },
  stat_total_invoices: { en: "Total invoices", zh: "Invoice 總數" },
  stat_awaiting_payment: { en: "Awaiting payment", zh: "待出糧" },
  stat_outstanding: { en: "Outstanding amount", zh: "待付金額" },
  filter_all: { en: "All", zh: "全部" },
  filter_month: { en: "Month", zh: "月份" },
  mark_paid: { en: "Mark paid", zh: "標記已出糧" },
  mark_unpaid: { en: "Undo payment", zh: "取消已出糧" },
  invoice_marked_paid: { en: "Marked as paid", zh: "已標記為已出糧" },
  invoice_marked_unpaid: { en: "Payment undone", zh: "已取消出糧標記" },
  invoice_deleted: { en: "Invoice deleted", zh: "Invoice 已刪除" },
  invoice_delete_confirm: {
    en: "Delete this invoice? This cannot be undone.",
    zh: "確定刪除此 Invoice？此操作無法復原。",
  },
  submitted_on: { en: "submitted", zh: "遞交於" },
  paid_on: { en: "paid", zh: "出糧於" },

  // Tutor database
  tutors_title: { en: "Tutor database", zh: "導師資料庫" },
  tutors_subtitle: {
    en: "Everyone who has registered, with their SCRC, bank details and lesson history.",
    zh: "所有已登記的導師，包括 SCRC、銀行資料及上堂紀錄。",
  },
  tutors_count: { en: "tutors", zh: "位導師" },
  tutors_filter_desc: {
    en: "Search by name, email or phone, and filter lesson counts by month.",
    zh: "可用姓名、電郵或電話搜尋，並按月份篩選堂數。",
  },
  tutors_search_placeholder: {
    en: "Search by name, email or phone...",
    zh: "搜尋姓名、電郵或電話...",
  },
  no_tutors: { en: "No tutors match this filter", zh: "沒有符合條件的導師" },
  completed_suffix: { en: "completed", zh: "已完成" },
  view_detail: { en: "View", zh: "查看" },
  back_to_tutors: { en: "Back to tutor database", zh: "返回導師資料庫" },
  confirmed_lessons_total: { en: "confirmed lessons", zh: "堂已確認" },
  edit_tutor_data: { en: "Account data", zh: "帳戶資料" },
  edit_tutor_data_desc: {
    en: "Corrections made here overwrite what the tutor entered.",
    zh: "在此修改會覆寫導師自行填寫的資料。",
  },
  delete_account_data: { en: "Delete account data", zh: "刪除帳戶資料" },
  tutor_delete_confirm: {
    en: "Delete this tutor's profile, SCRC document and bank details? Their lesson and invoice records are kept. This cannot be undone.",
    zh: "確定刪除此導師的個人資料、SCRC 文件及銀行資料？上堂及 Invoice 紀錄會保留。此操作無法復原。",
  },
  tutor_deleted: { en: "Account data deleted", zh: "帳戶資料已刪除" },
  lesson_history: { en: "Lesson history", zh: "上堂紀錄" },
  lesson_history_desc: {
    en: "Confirmed lessons only. Filter by month.",
    zh: "只顯示已確認的堂數，可按月份篩選。",
  },
  no_lessons_for_filter: { en: "No lessons in this period", zh: "此期間沒有堂數" },
  completed_total: { en: "Completed total", zh: "已完成合計" },
  upcoming: { en: "Upcoming", zh: "未開始" },
  login_title: { en: "Sign in to INDEX ACADEMY", zh: "登入 INDEX ACADEMY" },
  login_desc: { en: "Sign in with your Google account to apply for jobs", zh: "使用你的 Google 帳號登入，即可報名工作" },
  firebase_not_configured: { en: "Firebase not configured", zh: "Firebase 未設定" },
  login_admin_notice: { en: "You're signed in as an admin — head to the admin backend to manage jobs", zh: "你已登入為管理員，可以前往後台管理任務" },
  login_terms: { en: "By signing in you agree to our Terms of Service and Privacy Policy.", zh: "登入即表示同意我們的使用條款與隱私權政策。" },
  already_applied: { en: "You've applied for", zh: "你已報名" },
  status_confirmed: { en: "Confirmed", zh: "已確認" },
  status_pending: { en: "Pending review", zh: "待管理員審核" },
  status_declined: { en: "Declined", zh: "已拒絕" },
  status_reserve: { en: "Reserve list", zh: "後備名單" },
  cancel_application: { en: "Cancel application", zh: "取消報名" },
  please_sign_in: {
    en: "Please sign in with Google to apply",
    zh: "請先用 Google 登入才能報名",
  },
  past_deadline: { en: "Application deadline has passed", zh: "已過報名截止時間" },
  no_phone_title: { en: "Phone number not set", zh: "尚未設定電話號碼" },
  no_phone_desc: {
    en: "You must add a phone number before applying, so we can contact you.",
    zh: "報名前必須先填寫電話號碼，方便我們聯絡你。",
  },
  go_to_settings: { en: "Go to Settings", zh: "前往設定電話號碼" },
  select_position: { en: "Select position", zh: "選擇職位" },
  full: { en: "Full", zh: "已額滿" },
  confirmed_of: { en: "confirmed", zh: "已確認" },
  contact_phone: { en: "Contact phone", zh: "聯絡電話" },
  edit: { en: "edit", zh: "修改" },
  submit_application: { en: "Submit application", zh: "提交報名" },
  submitting: { en: "Submitting...", zh: "報名中..." },
  submit_note: {
    en: "You'll be placed on the pending list; once an admin confirms you'll receive a confirmation email.",
    zh: "提交後會進入待審核名單，管理員手動確認後你會收到確認電郵。",
  },
  loading: { en: "Loading...", zh: "載入中..." },
  load_failed: { en: "Failed to load job", zh: "載入工作失敗" },
  phone_required_toast: { en: "Please set your phone number in Settings first", zh: "請先在「設定」填寫電話號碼" },
  anonymous: { en: "Anonymous", zh: "匿名" },
  apply_failed: { en: "Application failed", zh: "報名失敗" },
  cancel_failed: { en: "Cancel failed", zh: "取消失敗" },
  deadline_closed_paren: { en: " (closed)", zh: "（已截止）" },
  pos_mt: { en: "MT (Lead Mentor)", zh: "MT 主導師" },
  pos_ta: { en: "TA (Teaching Assistant)", zh: "TA 助教" },
  invalid_phone: { en: "Please enter a valid phone number", zh: "請輸入有效的電話號碼" },
  phone_save_success: { en: "Phone number saved", zh: "電話號碼已儲存" },
  save_failed: { en: "Save failed", zh: "儲存失敗" },
  phone_placeholder: { en: "e.g. 9123 4567", zh: "例如：9123 4567" },
  load_reg_failed: { en: "Failed to load applications", zh: "載入報名失敗" },
  view_reg_need_sign_in: { en: "Sign in to view the jobs you've applied for", zh: "登入後即可查看你已報名的工作" },
  firebase_not_set_title: { en: "Firebase not configured", zh: "尚未設定 Firebase" },
  firebase_not_set_desc: { en: "Set up .env.local first to view applications", zh: "請先設定 .env.local 才能查看報名" },

  // Settings
  settings_title: { en: "Settings", zh: "設定" },
  settings_subtitle: {
    en: "A phone number is required before you can apply for jobs.",
    zh: "報名工作前必須先填寫電話號碼，方便我們聯絡你。",
  },
  contact_phone_title: { en: "Contact phone", zh: "聯絡電話" },
  contact_phone_desc: {
    en: "This will be shared with the admin when you apply.",
    zh: "此電話號碼會隨你的報名一併提交給管理員。",
  },
  phone_saved: {
    en: "Phone number saved — you can now apply for jobs",
    zh: "電話號碼已設定，你可以報名工作了",
  },
  save: { en: "Save", zh: "儲存" },
  saving: { en: "Saving...", zh: "儲存中..." },
  account_info: { en: "Account", zh: "帳號資料" },
  name_label: { en: "Name", zh: "姓名" },
  email_label: { en: "Email", zh: "電郵" },
  need_sign_in: { en: "Sign-in required", zh: "需要登入" },
  need_sign_in_desc: {
    en: "Please sign in with Google to manage your profile",
    zh: "請先用 Google 登入才能設定個人資料",
  },

  // My registrations
  my_reg_title: { en: "My Applications", zh: "我的報名" },
  my_reg_subtitle: {
    en: "All jobs you've applied for — confirmed and pending",
    zh: "所有你已報名的工作 — 已確認與待審核",
  },
  refresh: { en: "Refresh", zh: "重新整理" },
  no_applications_title: { en: "No applications yet", zh: "尚未報名任何工作" },
  no_applications_desc: { en: "Browse jobs to find one that interests you", zh: "到工作列表找一個你感興趣的工作" },
  browse_jobs: { en: "Browse jobs", zh: "瀏覽工作" },
  deleted_job: { en: "(job removed)", zh: "（工作已刪除）" },

  // Admin
  admin_title: { en: "Admin", zh: "管理後台" },
  admin_subtitle: {
    en: "Create, edit, and cancel jobs, and review applications",
    zh: "建立、編輯、取消工作，並查看每個工作的報名名單",
  },
  new_job: { en: "New job", zh: "建立新工作" },
  cancel: { en: "Cancel", zh: "取消" },

  // Admin — access states
  admin_need_login_title: { en: "Sign-in required", zh: "需要登入" },
  admin_need_login_desc: { en: "Please sign in to access the admin backend", zh: "請先登入以存取管理後台" },
  admin_denied_title: { en: "Access denied", zh: "權限不足" },
  admin_denied_desc: {
    en: "Your account is not an admin. Ask a system admin to add your UID to NEXT_PUBLIC_ADMIN_UIDS.",
    zh: "你的帳號不是管理員，無法存取後台。若需管理員權限，請聯絡系統管理員把你的 UID 加入 NEXT_PUBLIC_ADMIN_UIDS。",
  },
  admin_no_jobs_title: { en: "No jobs yet", zh: "尚未建立任何工作" },
  admin_no_jobs_desc: { en: "Create your first Index Academy job", zh: "開始建立你的第一個工作" },
  admin_create_first_job: { en: "Create first job", zh: "建立第一個工作" },
  admin_load_failed: { en: "Failed to load jobs", zh: "載入工作失敗" },
  refreshing: { en: "Refreshing...", zh: "重新整理中..." },

  // Admin — job card
  manage_registrations: { en: "Manage applications", zh: "管理報名" },
  cancel_job: { en: "Cancel job", zh: "取消工作" },
  reopen_job: { en: "Reopen", zh: "重新開放" },
  no_action: { en: "No action", zh: "無操作" },
  admin_confirmed_slots: { en: "Confirmed slots", zh: "已確認名額" },
  job_cancelled_toast: { en: "Job cancelled", zh: "工作已取消" },
  job_reopened_toast: { en: "Job reopened", zh: "工作已重新開放" },
  job_deleted_toast: { en: "Job deleted", zh: "工作已刪除" },
  job_status_update_failed: { en: "Update failed", zh: "更新失敗" },
  confirm_delete_job: { en: "Delete this job? This cannot be undone.", zh: "確定刪除此工作？此操作無法復原。" },

  // Admin — task detail / applications
  back_to_admin: { en: "Back to admin", zh: "返回後台" },
  back_to_job_detail: { en: "Back to job detail", zh: "返回工作詳情" },
  edit_job_btn: { en: "Edit", zh: "編輯" },
  job_not_found_admin: { en: "Job not found", zh: "找不到此工作" },
  registrations_title: { en: "Applications", zh: "報名名單" },
  no_applications_admin: { en: "No applications yet", zh: "目前沒有人報名" },
  applied_count: { en: "applied", zh: "人報名" },
  confirmed_short: { en: "confirmed", zh: "已確認" },
  pending_short: { en: "pending", zh: "待審核" },
  confirm_btn: { en: "Confirm", zh: "確認" },
  decline_btn: { en: "Decline", zh: "拒絕" },
  reserve_btn: { en: "Reserve", zh: "後備" },
  confirm_all: { en: "Accept all", zh: "全部接受" },
  reserve_all: { en: "Reserve all", zh: "全部後備" },
  decline_all: { en: "Decline all", zh: "全部拒絕" },
  save_decisions: { en: "Save & notify", zh: "儲存並通知" },
  no_changes: { en: "No changes", zh: "沒有變更" },
  notify_by_email: { en: "Email the applicant", zh: "寄電郵通知" },
  decisions_saved: { en: "Decisions saved", zh: "已儲存審批" },
  email_sent: { en: "Notification email sent", zh: "已寄出通知電郵" },
  email_skipped_pending: {
    en: "Saved — no email sent while lessons are still pending",
    zh: "已儲存，但仍有待審核的堂數，未寄出電郵",
  },
  lessons_confirmed_suffix: { en: "lessons accepted", zh: "堂已確認" },
  remove_application: { en: "Remove application", zh: "移除報名" },
  lesson_roster_title: { en: "Lesson roster", zh: "各堂名單" },
  lesson_roster_desc: {
    en: "Confirmed staff for each lesson. Slots are counted per lesson.",
    zh: "每堂已確認的人手。名額按每堂計算。",
  },
  confirmed_toast: { en: "Confirmed", zh: "已確認" },
  declined_toast: { en: "Declined", zh: "已拒絕" },
  reserved_toast: { en: "Moved to reserve list", zh: "已加入後備名單" },
  confirm_failed: { en: "Confirm failed", zh: "確認失敗" },
  decline_failed: { en: "Decline failed", zh: "拒絕失敗" },
  reserve_failed: { en: "Failed", zh: "操作失敗" },
  email_failed_toast: { en: "Status updated, but the notification email failed to send", zh: "已更新狀態，但通知電郵寄送失敗" },
  remove_confirm: { en: "Remove this application?", zh: "確定移除此報名？" },
  removed_toast: { en: "Removed", zh: "已移除" },
  remove_failed: { en: "Remove failed", zh: "移除失敗" },
  load_failed_generic: { en: "Failed to load", zh: "載入失敗" },

  // Admin — job form
  create_job_title: { en: "Create new job", zh: "建立新工作" },
  create_job_desc: { en: "Fill in the details to create a new job", zh: "填寫以下資訊以建立一個新的工作" },
  edit_job_title: { en: "Edit job", zh: "編輯工作" },
  edit_job_desc: { en: "Update the details of a published job", zh: "更新已發布工作的內容" },
  need_admin_permission: { en: "Admin permission required to create jobs", zh: "需要管理員權限才能建立工作" },
  job_created_toast: { en: "Job created", zh: "工作已建立" },
  job_create_failed: { en: "Failed to create job", zh: "建立失敗" },
  job_updated_toast: { en: "Job updated", zh: "工作已更新" },
  job_update_failed: { en: "Failed to update job", zh: "更新失敗" },

  form_school_name: { en: "School / event name *", zh: "學校／活動名稱 *" },
  form_school_placeholder: { en: "e.g. Sample Primary School_VR art", zh: "例如：陳南昌夫人小學_VR art" },
  form_address: { en: "School address", zh: "學校地址" },
  form_address_placeholder: { en: "e.g. 28 Tokyo St, Sham Shui Po, Kowloon", zh: "例如：九龍深水埗東京街28號" },
  form_map_url: { en: "Google Maps link", zh: "Google 地圖連結" },
  form_date: { en: "Date *", zh: "日期 *" },
  form_start_time: { en: "Start time *", zh: "開始時間 *" },
  form_end_time: { en: "End time *", zh: "結束時間 *" },
  form_lessons: { en: "Lessons *", zh: "課堂 *" },
  form_lesson: { en: "Lesson", zh: "課堂" },
  form_lessons_hint: {
    en: "A course can run over several lessons. Applicants pick which dates they can attend.",
    zh: "一個課程可以有多堂。報名者可以選擇出席哪幾堂。",
  },
  form_lesson_title: { en: "Label (optional)", zh: "名稱（選填）" },
  form_lesson_title_placeholder: { en: "e.g. Workshop day 1", zh: "例如：工作坊第一日" },
  form_add_lesson: { en: "Add lesson", zh: "新增一堂" },
  form_add_next_week: { en: "Add + 1 week", zh: "新增下星期同一時間" },
  form_remove_lesson: { en: "Remove lesson", zh: "刪除此堂" },
  form_error_no_lesson: { en: "Add at least one lesson", zh: "請至少新增一堂課" },
  form_slots_per_lesson_hint: {
    en: "Slots apply to each lesson — e.g. 5 TA slots means 5 TAs per lesson.",
    zh: "名額按每堂計算 — 例如 5 個 TA 名額即每堂 5 位 TA。",
  },
  form_rate_unit: { en: "Pay rate unit", zh: "薪資單位" },
  form_rate_hourly: { en: "Hourly", zh: "按小時" },
  form_rate_daily: { en: "Daily", zh: "按日" },
  form_mt_slots: { en: "MT slots", zh: "MT 名額" },
  form_ta_slots: { en: "TA slots", zh: "TA 名額" },
  form_mt_rate_hourly: { en: "MT hourly rate (HK$)", zh: "MT 時薪 (HK$)" },
  form_mt_rate_daily: { en: "MT daily rate (HK$)", zh: "MT 日薪 (HK$)" },
  form_ta_rate_hourly: { en: "TA hourly rate (HK$)", zh: "TA 時薪 (HK$)" },
  form_ta_rate_daily: { en: "TA daily rate (HK$)", zh: "TA 日薪 (HK$)" },
  form_deadline: { en: "Application deadline (optional)", zh: "報名截止時間（選填）" },
  form_meet_url: { en: "Google Meet link (optional)", zh: "Google Meet 連結（選填）" },
  form_meet_datetime: { en: "Meeting date & time (optional)", zh: "會議日期與時間（選填）" },
  form_notes: { en: "Notes (optional)", zh: "備註（可選）" },
  form_notes_placeholder: {
    en: "e.g. Bring a laptop, arrive 10 minutes early...",
    zh: "例如：需帶電腦、需提前 10 分鐘到場...",
  },
  form_error_datetime: { en: "Please fill in date and time", zh: "請填寫日期與時間" },
  form_error_end_after_start: { en: "End time must be after start time", zh: "結束時間必須晚於開始時間" },
  save_changes: { en: "Save changes", zh: "儲存變更" },
  saving_short: { en: "Saving...", zh: "儲存中..." },
  create_job_btn: { en: "Create job", zh: "建立工作" },
  creating: { en: "Creating...", zh: "建立中..." },
} as const;

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dict) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "en" || stored === "zh") setLangState(stored);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  }

  function t(key: keyof typeof dict): string {
    return dict[key]?.[lang] ?? String(key);
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
