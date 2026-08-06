"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ScrollText } from "lucide-react";
import { useLang } from "@/lib/i18n";

/**
 * Working rules every TA/MT must follow, shown at the foot of the job
 * application page. The Chinese text is the authoritative version — the
 * English is a convenience translation for the EN locale.
 */
export function TermsAndConduct() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const c = lang === "zh" ? ZH : EN;

  return (
    <section className="rounded-[20px] glass overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="press flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <ScrollText className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="flex-1">
          <span className="block text-sm font-semibold">{c.title}</span>
          <span className="block text-xs text-muted-foreground">{c.subtitle}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-white/60 px-5 py-5 space-y-6 text-sm leading-relaxed">
          <p className="text-muted-foreground">{c.intro}</p>

          <div className="space-y-3">
            <h3 className="font-semibold">{c.s1Title}</h3>
            <dl className="space-y-3">
              {c.s1Items.map((item) => (
                <div key={item.term}>
                  <dt className="font-medium">{item.term}</dt>
                  <dd className="text-muted-foreground">
                    {typeof item.desc === "string" ? (
                      item.desc
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {item.desc.map((line) => (
                          <li key={line} className="flex gap-2">
                            <span className="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">{c.s2Title}</h3>

            <div className="space-y-2">
              <p className="font-medium">{c.s2aTitle}</p>
              <p className="text-muted-foreground">{c.s2aBody}</p>
              <p className="rounded-xl border border-border bg-white/50 px-3 py-2 text-xs italic text-muted-foreground">
                {c.s2aNote}
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-medium">{c.s2bTitle}</p>
              <ul className="space-y-1 text-muted-foreground">
                {c.s2bItems.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
            <p className="text-destructive">
              <span className="font-semibold">{c.warnTitle}</span> {c.warnBody}
            </p>
          </div>

          {lang === "en" && (
            <p className="text-xs text-muted-foreground">{EN.authoritative}</p>
          )}
        </div>
      )}
    </section>
  );
}

const ZH = {
  title: "學校助教 (TA) 及導師 (MT) 工作守則與職責",
  subtitle: "報名前請細閱。按此展開全文。",
  intro:
    "為了確保教學質素及校園紀律，請所有助教 (TA) 及導師 (MT) 嚴格遵守以下工作守則：",
  s1Title: "一、工作守則與要求",
  s1Items: [
    { term: "守時", desc: "請務必準時，並於上課前 10 至 15 分鐘到達學校。" },
    {
      term: "儀容整潔",
      desc: [
        "服飾須保持整潔得體。",
        "嚴禁佩戴帽子。",
        "男導師如蓄長髮請束起。",
        "男女導師均必須穿着長褲。",
      ],
    },
    {
      term: "課堂記錄",
      desc: "必須將課堂照片（如學生使用 iPad／手提電腦上課，或導師協助學生的情況）上載至指定的雲端硬碟 (Drive) 連結以作記錄。",
    },
  ],
  s2Title: "二、薪酬與出糧安排",
  s2aTitle: "1. 提交 Invoice 流程",
  s2aBody:
    "請在系統中勾選您在該月份參與的所有活動項目，然後點擊「發送 Invoice (Send Invoice)」，系統會自動生成並發送 PDF Invoice 給我們。",
  s2aNote:
    "每位同事每個月只需遞交一張 Invoice（建議累積該月所有活動後一次過勾選發送）。如收到多於一張，我們將以最後遞交／最新的一張為準。",
  s2bTitle: "2. 截數與出糧日",
  s2bItems: [
    "每月的 23 日為截數日。",
    "凡於 23 日或之前遞交的 Invoice，將於當月安排出糧；若於 23 日後遞交，則順延至下個月處理。",
  ],
  warnTitle: "重要聲明：",
  warnBody: "如果未能遵守上述守則，本公司有權扣發薪金，並不予再次錄用。",
} as const;

const EN = {
  title: "Working rules and duties for Teaching Assistants (TA) and Mentors (MT)",
  subtitle: "Please read before applying. Tap to expand.",
  intro:
    "To maintain teaching quality and school discipline, all TAs and MTs must strictly follow the rules below:",
  s1Title: "1. Rules and requirements",
  s1Items: [
    {
      term: "Punctuality",
      desc: "Always be on time — arrive at the school 10 to 15 minutes before the lesson starts.",
    },
    {
      term: "Grooming and dress",
      desc: [
        "Clothing must be neat and presentable.",
        "Hats are strictly not allowed.",
        "Male mentors with long hair must tie it back.",
        "All mentors, male and female, must wear long trousers.",
      ],
    },
    {
      term: "Lesson records",
      desc: "Photos of the lesson (students working on iPads / laptops, or mentors assisting students) must be uploaded to the designated Google Drive link as a record.",
    },
  ],
  s2Title: "2. Pay and payment schedule",
  s2aTitle: "1. Submitting your invoice",
  s2aBody:
    "Tick every activity you took part in that month in the system, then press \"Send Invoice\". A PDF invoice is generated and sent to us automatically.",
  s2aNote:
    "Each person submits only one invoice per month — collect all of that month's activities and send them in one go. If we receive more than one, the most recently submitted invoice is the one that counts.",
  s2bTitle: "2. Cut-off and payment day",
  s2bItems: [
    "The 23rd of each month is the cut-off date.",
    "Invoices submitted on or before the 23rd are paid within that month; invoices submitted after the 23rd roll over to the following month.",
  ],
  warnTitle: "Important:",
  warnBody:
    "Failure to follow these rules entitles the company to withhold payment and to decline future engagements.",
  authoritative:
    "This English text is a translation for convenience. The Chinese version is authoritative.",
} as const;
