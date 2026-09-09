import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { useWishlistStore } from "@/stores/wishlistStore";

/** Keep one translated notification per user action across all product views. */
export function useWishlistToggle() {
  const { t } = useLanguage();
  return (handle: string) => {
    const store = useWishlistStore.getState();
    const removing = store.handles.includes(handle);
    store.toggle(handle);
    toast.success(t(removing ? "wishlistRemoved" : "wishlistAdded"));
  };
}
