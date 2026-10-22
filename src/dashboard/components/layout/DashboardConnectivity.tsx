import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";

export default function DashboardConnectivity() {
  const { t } = useLanguage();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="dashboard-connectivity">
      <WifiOff className="size-4 shrink-0" />
      <span>
        {t(
          "You are offline. Keep this page open to preserve your draft. Saving requires a connection.",
        )}
      </span>
    </div>
  );
}
