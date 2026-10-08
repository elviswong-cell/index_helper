"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, ChevronDown, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

/**
 * The Chinese text is the authoritative copy supplied by the business. Keep it
 * in one place so the expandable reference and the application gate can never
 * drift apart.
 */
const TERMS_ZH = `工作條款及聘用須知（學校服務團隊）

職位名稱定義： 本須知中所指之「主教」以下簡稱為 MT（Main Teacher），「助教」以下簡稱為 TA（Teaching Assistant）。

歡迎加入我們的教育團隊！本機構專為各合作學校提供專業教學支援。為確保學校服務品質及保障雙方權益，請詳細閱讀並確認以下工作條款與規範：

一、 職責範疇與現場工作指引

1. 崗位職責

• MT（Main Teacher - 課堂負責人）：
  • 課前準備： 課前須徹底熟悉教學大綱、簡報及教具操作；提前到達學校檢查課室設備（如投影機、音響、板書工具），確保教學順利進行。
  • 課堂主導： 負責全堂課程之講授與演示，精準掌控教學節奏與時間分配，確保於指定時間內完成當天教學目標。
  • 班級管理： 主導課堂秩序，運用專業技巧帶動學習氣氛，隨時留意全班學習專注度並適時調整講課步調。
  • 指示與帶領 TA： 課前簡短向 TA 說明當日教學重點及分工；課堂期間清晰發出指令，引導 TA 進行巡視、個別輔導或教材發放。
  • 學校對接與突發應變： 作為現場主要對接人，負責向學校負責老師打招呼，並妥善處理課堂上的突發狀況。
  • 課後跟進： 課程結束後，確認課室還原；向機構反映課堂狀況或記錄學生表現。

• TA（Teaching Assistant - 現場重點指引）：
  • 主動巡視與站立要求： 課堂進行期間，TA 必須保持站立，絕對不允許坐下。請盡量站在課室中央位置，以便全盤觀察每位同學的進度與狀況。
  • 即時協助解難： 密切留意同學的反應，發現同學遇到疑難或有需要時，必須即時主動上前協助解決，確保每位同學都能跟上進度。
  • 課堂紀錄/拍照： 按照指引進行課堂拍照與紀錄（詳見第二點）。

2. 臨時工作崗位調動與薪酬應對機制

• 彈性調配： 因應學校突發狀況（如學校臨時改期、課室異動、學生人數變動或隊友突發缺勤），機構或現場負責人有權臨時調整你的工作崗位、服務班別或教學支援內容。
• 按實際崗位發放薪酬原則：
  • 若因現場需要由 TA 臨時轉任 MT，當天／該節課將按 MT 薪酬標準發放。
  • 反之，若因學校或現場安排調動導致 MT 臨時轉任 TA，當天／該節課將按 TA 薪酬標準發放。

二、 課堂拍攝及紀錄規範（TA 特別須知）

為記錄學習成果及供機構作內部紀錄，TA 需協助拍攝課堂花絮，但必須嚴格遵守以下原則：

1. 尊重大意願與事前詢問：
  • 如需要拍攝同學手持/展示作品的清晰正面近照，必須先主動詢問並獲得同學本人同意。
  • 若同學表現出抗拒、害羞或明確拒絕，應立即停止拍攝，切勿強迫或勉強同學。

2. 以學生舒適為首要原則：
  • 拍照時必須保持適當距離、自然捕捉，切勿貼近學生面部強行拍攝，或要求學生做不自然的動作。
  • 絕不能影響課堂進行或令同學感到被侵犯、不舒服或尷尬。

3. 拍攝角度與重點：
  • 未經學生同意前，建議以側面、背面、手部操作細節、團體大遠景或單獨拍攝作品為主。

4. 私隱及版權保密：
  • 所有拍攝之照片/影片僅供機構內部或相關教學報告使用。
  • 嚴禁使用個人器材將照片上傳至個人社交平台（如 IG、FB、Threads 等），或分享給任何第三方。10分鐘

三、 工作時間與嚴禁遲到早退條款

學校服務對時間準確度要求極高，MT 與 TA 均必須嚴格遵守時間，絕不能遲到或早退：

• 準時到達： 所有人必須於課堂前 10 - 15 分鐘到達該學校指定地點（完成進校登記、佈置課室及準備器材）。
• 嚴禁遲到早退：
  • 遲到或未經許可早退屬嚴重違規行為，直接影響機構於學校的聲譽。
  • 遲到處理： 遲到者將按時間比例扣減當天薪水（或扣除指定固定金額）；嚴重遲到或屢勸不改者，機構保留終止合作及調整後續排班之權利。
  • 突發通報： 如因極不可抗力因素預計會遲到，必須至少於開課前 30 分鐘主動通知機構負責人，切勿直接聯絡學校。

四、 薪酬發放原則（早收工與遲收工處理）

• 固定薪酬保障： 本機構之服務薪酬均以排班時約定之原定工資全數發放。
• 早收工（提早完結）： 若因學校臨時變動或提早放學導致課堂提早結束，當天薪酬按原定工資全數發放，不作任何扣減。
• 遲收工（現場延誤）： 若因學校現場狀況（如學校活動延誤、等待課室清理等）導致結束時間略為延後，當天薪酬同樣按原定工資發放，不另設額外加班費。
• 註：若因個人原因（如私自早退或遲到），則仍須按考勤條款扣減相關費用。

五、 行為守則與服飾要求

1. 專業衣著規範（重要）：
  • 進出學校必須穿著得體，衣著顏色必須以樸素、沉穩為主（如黑、白、灰、深藍等深淺素色），嚴禁穿著色彩過於鮮艷、刺眼或圖案誇張之衣服。
  • 嚴禁穿著背心、短褲、拖鞋或過於休閒露膚之服飾。進校期間必須全程佩戴指定工作證。

2. 私下聯繫限制： 嚴禁私下向校方或學生索取個人聯絡方式。

3. 溝通渠道： 如對學校現場安排有任何不滿或疑問，請切勿在校方或學生面前爭執，應於課後即時向本機構反映處理。`;

const TERMS_EN = `Work Terms and Employment Guidelines (School Services Team)

Position definitions: In these guidelines, “Main Teacher” is abbreviated as MT and “Teaching Assistant” as TA.

Welcome to our education team. Our organisation provides professional teaching support to partner schools. To maintain service quality and protect the interests of both parties, please read and confirm the following terms and guidelines carefully.

1. Responsibilities and On-site Working Guidelines

1.1 Role responsibilities

• MT (Main Teacher — person responsible for the lesson):
  • Lesson preparation: Become thoroughly familiar with the syllabus, presentation materials and teaching-aid operation before class. Arrive at the school early to check classroom equipment such as the projector, audio equipment and writing tools, ensuring that teaching can proceed smoothly.
  • Leading the lesson: Deliver and demonstrate the full lesson, manage its pace and timing accurately, and complete the day’s learning objectives within the scheduled time.
  • Classroom management: Lead classroom discipline, use professional techniques to create a positive learning atmosphere, monitor the whole class’s attention and adjust the teaching pace when necessary.
  • Directing and leading the TA: Brief the TA before class on the day’s teaching focus and division of duties. During class, give clear instructions and guide the TA in monitoring students, providing individual support or distributing materials.
  • School liaison and incident response: Act as the main on-site contact, greet the teacher responsible at the school and handle unexpected classroom situations appropriately.
  • Post-lesson follow-up: Ensure the classroom is restored after the lesson, and report lesson conditions or record student performance for the organisation.

• TA (Teaching Assistant — key on-site guidelines):
  • Active monitoring and standing requirement: The TA must remain standing throughout the lesson and must not sit down. Where possible, stand near the centre of the classroom to maintain a complete view of every student’s progress and condition.
  • Immediate, proactive support: Closely observe students’ responses. If a student encounters difficulty or needs help, proactively assist at once so that every student can keep up.
  • Lesson records/photography: Take lesson photographs and records according to the guidelines in Section 2.

1.2 Temporary reassignment and corresponding pay

• Flexible deployment: In response to unexpected school circumstances, including last-minute rescheduling, classroom changes, changes in student numbers or a team member’s unexpected absence, the organisation or on-site lead may temporarily adjust your role, assigned class or teaching-support duties.
• Pay based on the role actually performed:
  • If a TA is temporarily reassigned as an MT due to on-site needs, that day/session will be paid at the MT rate.
  • Conversely, if an MT is temporarily reassigned as a TA because of school or on-site arrangements, that day/session will be paid at the TA rate.

2. Classroom Photography and Record Guidelines (Particularly for TAs)

TAs are required to help take classroom photographs for learning-outcome and internal records, subject to the following strict principles.

2.1 Respecting students’ wishes and obtaining consent in advance:
  • Before taking a clear, front-facing close-up of a student holding or presenting their work, proactively ask for and obtain the student’s consent.
  • If a student appears resistant or shy, or clearly refuses, stop photographing immediately. Never pressure or force the student.

2.2 Student comfort comes first:
  • Keep an appropriate distance and capture natural moments. Never move close to a student’s face to force a photograph or require unnatural poses.
  • Photography must never disrupt the lesson or make a student feel intruded upon, uncomfortable or embarrassed.

2.3 Angles and focus:
  • Until the student has consented, use side or rear views, close-ups of hands at work, wide group shots, or photographs of the work alone.

2.4 Privacy and copyright confidentiality:
  • All photographs and videos may be used only for the organisation’s internal records or relevant teaching reports.
  • It is strictly prohibited to upload them from a personal device to a personal social-media platform, including Instagram, Facebook or Threads, or to share them with any third party. 10 minutes

3. Working Hours and Strict Prohibition on Lateness or Early Departure

Punctuality is essential for school services. MTs and TAs must follow the scheduled times strictly and must not arrive late or leave early.

• Timely arrival: Everyone must arrive at the school’s designated location 10–15 minutes before the lesson begins, allowing time to complete school entry registration, prepare the classroom and set up equipment.
• No lateness or unauthorised early departure:
  • Arriving late or leaving early without permission is a serious violation and directly affects the organisation’s reputation with the school.
  • Handling lateness: Pay for the day may be reduced proportionately according to the period of lateness, or by a specified fixed amount. For serious or repeated lateness, the organisation reserves the right to terminate the engagement and adjust future scheduling.
  • Emergency notice: If an event genuinely beyond your control is expected to make you late, proactively notify the organisation’s person in charge at least 30 minutes before the lesson. Do not contact the school directly.

4. Pay Principles (Early Finish and Delayed Finish)

• Guaranteed agreed pay: Service pay is issued in full according to the amount agreed when the work was scheduled.
• Early finish: If a last-minute school change or early dismissal causes the lesson to finish early, the originally agreed pay for the day will be paid in full without deduction.
• Delayed finish: If on-site circumstances, such as a delayed school event or waiting for a classroom to be cleared, cause the finish time to be slightly delayed, the originally agreed pay for the day will still apply and no additional overtime payment will be made.
• Note: Deductions under the attendance terms still apply where lateness or early departure is caused by the individual.

5. Code of Conduct and Dress Requirements

5.1 Professional dress (important):
  • Dress appropriately when entering or leaving a school. Clothing colours must be simple and subdued, such as black, white, grey or dark blue. Bright, glaring colours and exaggerated patterns are strictly prohibited.
  • Vests, shorts, slippers and overly casual or revealing clothing are strictly prohibited. The designated staff identification must be worn at all times while on school premises.

5.2 Private contact restriction: Do not privately request personal contact details from the school or students.

5.3 Communication channel: If you have any dissatisfaction or questions regarding on-site arrangements, do not argue in front of school staff or students. Report the matter to the organisation promptly after the lesson.`;

const CONSENT_ZH =
  "我已詳細閱讀、充分理解並完全同意遵守上述「工作條款及聘用須知」之所有內容。 (註：勾選此項即代表本人同意以此電子記錄作為具法律效力之合約確認)";

const CONSENT_EN =
  "I have read and fully understood all of the above Work Terms and Employment Guidelines, and I agree to comply with them in full. (Note: By selecting this box, I agree that this electronic record constitutes a legally binding confirmation of the agreement.)";

function TermsBody({ lang }: { lang: "en" | "zh" }) {
  return (
    <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
      {lang === "zh" ? TERMS_ZH : TERMS_EN}
    </div>
  );
}

export function TermsAndConduct() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[20px] glass overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="press flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <ScrollText className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="flex-1">
          <span className="block text-sm font-semibold">
            {lang === "zh" ? "工作條款及聘用須知" : "Work Terms and Employment Guidelines"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {lang === "zh"
              ? "報名前請細閱。按此展開全文。"
              : "Please read before applying. Tap to expand."}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="border-t border-white/60 px-5 py-5">
          <TermsBody lang={lang} />
          {lang === "en" && (
            <p className="mt-5 text-xs text-muted-foreground">
              This English translation is provided for convenience. The Chinese version is
              authoritative.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function ApplicationTermsDialog({
  open,
  onOpenChange,
  onAccept,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  submitting: boolean;
}) {
  const { lang } = useLang();
  const [accepted, setAccepted] = useState(false);

  function changeOpen(next: boolean) {
    if (!next) setAccepted(false);
    onOpenChange(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-start gap-3 border-b border-border px-5 py-4">
            <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-semibold">
                {lang === "zh"
                  ? "工作條款及聘用須知"
                  : "Work Terms and Employment Guidelines"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                {lang === "zh"
                  ? "請細閱全部內容，並在下方確認同意後才可提交報名。"
                  : "Read the full terms and confirm your agreement before submitting."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto px-5 py-4">
            <TermsBody lang={lang} />
            {lang === "en" && (
              <p className="mt-5 text-xs text-muted-foreground">
                This English translation is provided for convenience. The Chinese version is
                authoritative.
              </p>
            )}
          </div>

          <div className="space-y-4 border-t border-border bg-background px-5 py-4">
            <p className="font-semibold">
              {lang === "zh" ? "電子確認與條款簽署" : "Electronic Confirmation and Acceptance"}
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white/50 p-3 text-sm leading-6">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
              <span>{lang === "zh" ? CONSENT_ZH : CONSENT_EN}</span>
            </label>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" disabled={submitting}>
                  {lang === "zh" ? "取消" : "Cancel"}
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                disabled={!accepted || submitting}
                onClick={onAccept}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting
                  ? lang === "zh"
                    ? "報名中..."
                    : "Submitting..."
                  : lang === "zh"
                    ? "同意條款並提交報名"
                    : "Agree and submit"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

