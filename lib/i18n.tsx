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
  already_applied: { en: "You've applied for", zh: "你已報名" },
  status_confirmed: { en: "Confirmed", zh: "已確認" },
  status_pending: { en: "Pending review", zh: "待管理員審核" },
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
