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
