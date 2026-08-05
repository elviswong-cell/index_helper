"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import { createTask } from "@/lib/db";

export default function NewTaskPage() {
  const { user, configured } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [ta, setTa] = useState(1);
  const [mt, setMt] = useState(1);
  const [taRate, setTaRate] = useState(150);
  const [mtRate, setMtRate] = useState(200);
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.isAdmin) {
      toast("error", "需要管理員權限");
      return;
    }
    if (!date || !startTime || !endTime) {
      toast("error", "請填寫日期與時間");
      return;
    }
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (end <= start) {
      toast("error", "結束時間必須晚於開始時間");
      return;
    }
    setSubmitting(true);
    try {
      const id = await createTask(
        {
          schoolName,
          startAt: start as unknown as Date,
          endAt: end as unknown as Date,
          positions: { ta, mt },
          rates: { ta: taRate, mt: mtRate },
          ...(address ? { address } : {}),
          ...(mapUrl ? { mapUrl } : {}),
          ...(notes ? { notes } : {}),
          status: "open",
          createdBy: user.uid,
        } as never,
        user.uid,
      );
      toast("success", "工作已建立");
      router.push(`/admin/tasks/${id}`);
    } catch (err) {
      console.error(err);
      toast("error", "建立失敗");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user?.isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          需要管理員權限才能建立工作
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          返回後台
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            建立新工作
          </CardTitle>
          <CardDescription>填寫以下資訊以建立一個新的工作</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="schoolName">學校／活動名稱 *</Label>
              <Input
                id="schoolName"
                placeholder="例如：陳南昌夫人小學_VR art"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">學校地址</Label>
              <Input
                id="address"
                placeholder="例如：九龍深水埗東京街28號"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapUrl">Google 地圖連結</Label>
              <Input
                id="mapUrl"
                type="url"
                placeholder="https://maps.app.goo.gl/..."
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">日期 *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">開始時間 *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">結束時間 *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ta">TA 名額</Label>
                <Input
                  id="ta"
                  type="number"
                  min={0}
                  value={ta}
                  onChange={(e) => setTa(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taRate">TA 時薪 (HK$)</Label>
                <Input
                  id="taRate"
                  type="number"
                  min={0}
                  step={10}
                  value={taRate}
                  onChange={(e) => setTaRate(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt">MT 名額</Label>
                <Input
                  id="mt"
                  type="number"
                  min={0}
                  value={mt}
                  onChange={(e) => setMt(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mtRate">MT 時薪 (HK$)</Label>
                <Input
                  id="mtRate"
                  type="number"
                  min={0}
                  step={10}
                  value={mtRate}
                  onChange={(e) => setMtRate(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註（可選）</Label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：需帶電腦、需提前 10 分鐘到場..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !configured} className="gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    建立中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    建立工作
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin")}
                disabled={submitting}
              >
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
