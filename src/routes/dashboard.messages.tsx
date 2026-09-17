import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";

import { DashboardCard } from "@/dashboard/components/DashboardCard";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/messages")({ component: MessagesPage });

function MessagesPage() {
  const { text } = useDashboardLanguage();
  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header">
        <p>{text("الرسائل", "Messages")}</p>
        <h1>{text("رسائل المتجر", "Store Messages")}</h1>
        <p>
          {text(
            "المسار جاهز لربط رسائل العملاء أو مركز الدعم لاحقاً بدون تغيير بنية الـDashboard.",
            "This workspace is ready for a future customer messaging or support integration without changing the dashboard architecture.",
          )}
        </p>
      </header>
      <DashboardCard className="grid min-h-[360px] place-items-center p-8 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="size-6" />
          </span>
          <h2 className="mt-4 text-sm font-black">
            {text("لا توجد رسائل بعد", "No messages yet")}
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {text(
              "عند ربط قناة دعم أو رسائل العملاء ستظهر المحادثات هنا ضمن نفس النظام.",
              "When a support or customer messaging channel is connected, conversations will appear here in the same system.",
            )}
          </p>
        </div>
      </DashboardCard>
    </section>
  );
}
