import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import {
  deleteAddress,
  ensureCustomerProfile,
  finalizeAddress,
  getOrCreateAddressDraft,
  loadCustomerAddresses,
  saveAddressDraft,
  setDefaultAddress,
  startAddressEdit,
  updateCustomerProfile,
  type AddressPatch,
  type CustomerAddress,
  type CustomerProfile,
} from "@/lib/customerAccount";

type CustomerAccountContextValue = {
  profile: CustomerProfile | null;
  addresses: CustomerAddress[];
  selectedAddress: CustomerAddress | null;
  draftAddress: CustomerAddress | null;
  loading: boolean;
  addressBookOpen: boolean;
  hubInitialView: "account" | "book";
  setAddressBookOpen: (open: boolean) => void;
  openAddressBook: () => void;
  openAccountHub: () => void;
  refresh: () => Promise<void>;
  selectAddress: (address: CustomerAddress) => void;
  beginAddressDraft: () => Promise<CustomerAddress | null>;
  beginAddressEdit: (address: CustomerAddress) => Promise<CustomerAddress | null>;
  saveDraft: (patch: AddressPatch) => Promise<CustomerAddress | null>;
  completeDraft: () => Promise<CustomerAddress | null>;
  makeDefault: (address: CustomerAddress) => Promise<void>;
  removeAddress: (address: CustomerAddress) => Promise<void>;
  saveProfile: (
    patch: Partial<Pick<CustomerProfile, "fullName" | "phone" | "email">>,
  ) => Promise<void>;
};

const CustomerAccountContext = createContext<CustomerAccountContextValue | null>(null);
const SELECTED_ADDRESS_PREFIX = "space-call:selected-address:";
const RESUME_ADDRESS_AFTER_AUTH_KEY = "space-call:resume-address-after-auth";

function selectedStorageKey(userId: string) {
  return SELECTED_ADDRESS_PREFIX + userId;
}

export function CustomerAccountProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, openAuth } = useCustomerAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [draftAddress, setDraftAddress] = useState<CustomerAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [hubInitialView, setHubInitialView] = useState<"account" | "book">("book");
  const [resumeAfterAuth, setResumeAfterAuth] = useState(false);

  const chooseSelected = useCallback((list: CustomerAddress[], userId: string) => {
    let storedId = "";
    try {
      storedId = window.localStorage.getItem(selectedStorageKey(userId)) || "";
    } catch {
      // Storage is optional.
    }

    const next =
      list.find((address) => address.id === storedId) ||
      list.find((address) => address.isDefault) ||
      list[0] ||
      null;
    setSelectedAddress(next);
    if (next) {
      try {
        window.localStorage.setItem(selectedStorageKey(userId), next.id);
      } catch {
        // Storage is optional.
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setAddresses([]);
      setSelectedAddress(null);
      setDraftAddress(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [nextProfile, nextAddresses] = await Promise.all([
        ensureCustomerProfile(user),
        loadCustomerAddresses(user.id),
      ]);
      setProfile(nextProfile);
      setAddresses(nextAddresses);
      chooseSelected(nextAddresses, user.id);
    } finally {
      setLoading(false);
    }
  }, [chooseSelected, user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!user) return;

    let storedResume = false;
    try {
      storedResume = window.sessionStorage.getItem(RESUME_ADDRESS_AFTER_AUTH_KEY) === "1";
      if (storedResume) window.sessionStorage.removeItem(RESUME_ADDRESS_AFTER_AUTH_KEY);
    } catch {
      // Session storage is optional.
    }

    if (!resumeAfterAuth && !storedResume) return;
    setResumeAfterAuth(false);
    setHubInitialView("book");
    setAddressBookOpen(true);
  }, [resumeAfterAuth, user]);

  const openAddressBook = useCallback(() => {
    if (!user) {
      setResumeAfterAuth(true);
      try {
        window.sessionStorage.setItem(RESUME_ADDRESS_AFTER_AUTH_KEY, "1");
      } catch {
        // The in-memory fallback still covers OTP sign-in without a redirect.
      }
      openAuth();
      return;
    }
    setHubInitialView("book");
    setAddressBookOpen(true);
  }, [openAuth, user]);

  const openAccountHub = useCallback(() => {
    if (!user) {
      openAuth();
      return;
    }
    setHubInitialView("account");
    setAddressBookOpen(true);
  }, [openAuth, user]);

  const selectAddress = useCallback(
    (address: CustomerAddress) => {
      setSelectedAddress(address);
      if (user) {
        try {
          window.localStorage.setItem(selectedStorageKey(user.id), address.id);
        } catch {
          // Storage is optional.
        }
      }
    },
    [user],
  );

  const beginAddressDraft = useCallback(async () => {
    if (!user) {
      setResumeAfterAuth(true);
      openAuth();
      return null;
    }
    const draft = await getOrCreateAddressDraft(user.id);
    setDraftAddress(draft);
    return draft;
  }, [openAuth, user]);

  const beginAddressEdit = useCallback(
    async (address: CustomerAddress) => {
      if (!user) {
        setResumeAfterAuth(true);
        openAuth();
        return null;
      }
      const draft = await startAddressEdit(user.id, address.id);
      setDraftAddress(draft);
      return draft;
    },
    [openAuth, user],
  );

  const saveDraft = useCallback(
    async (patch: AddressPatch) => {
      if (!user) return null;
      const current = draftAddress ?? (await getOrCreateAddressDraft(user.id));
      const saved = await saveAddressDraft(user.id, current.id, patch);
      setDraftAddress(saved);
      return saved;
    },
    [draftAddress, user],
  );

  const completeDraft = useCallback(async () => {
    if (!user) return null;
    const current = draftAddress ?? (await getOrCreateAddressDraft(user.id));
    const completed = await finalizeAddress(current.id);
    setDraftAddress(null);
    const nextAddresses = await loadCustomerAddresses(user.id);
    setAddresses(nextAddresses);
    selectAddress(completed);
    return completed;
  }, [draftAddress, selectAddress, user]);

  const makeDefault = useCallback(
    async (address: CustomerAddress) => {
      if (!user) return;
      const updated = await setDefaultAddress(address.id);
      const next = (await loadCustomerAddresses(user.id)).map((item) =>
        item.id === updated.id ? updated : item,
      );
      setAddresses(next);
      selectAddress(updated);
    },
    [selectAddress, user],
  );

  const removeAddress = useCallback(
    async (address: CustomerAddress) => {
      if (!user) return;
      await deleteAddress(user.id, address);

      let next = await loadCustomerAddresses(user.id);
      if (address.isDefault && next.length > 0 && !next.some((item) => item.isDefault)) {
        await setDefaultAddress(next[0].id);
        next = await loadCustomerAddresses(user.id);
      }

      setAddresses(next);
      chooseSelected(next, user.id);
    },
    [chooseSelected, user],
  );

  const saveProfile = useCallback(
    async (patch: Partial<Pick<CustomerProfile, "fullName" | "phone" | "email">>) => {
      if (!user) return;
      const updated = await updateCustomerProfile(user.id, patch);
      setProfile(updated);
    },
    [user],
  );

  const value = useMemo<CustomerAccountContextValue>(
    () => ({
      profile,
      addresses,
      selectedAddress,
      draftAddress,
      loading,
      addressBookOpen,
      hubInitialView,
      setAddressBookOpen,
      openAddressBook,
      openAccountHub,
      refresh,
      selectAddress,
      beginAddressDraft,
      beginAddressEdit,
      saveDraft,
      completeDraft,
      makeDefault,
      removeAddress,
      saveProfile,
    }),
    [
      profile,
      addresses,
      selectedAddress,
      draftAddress,
      loading,
      addressBookOpen,
      hubInitialView,
      openAddressBook,
      openAccountHub,
      refresh,
      selectAddress,
      beginAddressDraft,
      beginAddressEdit,
      saveDraft,
      completeDraft,
      makeDefault,
      removeAddress,
      saveProfile,
    ],
  );

  return (
    <CustomerAccountContext.Provider value={value}>{children}</CustomerAccountContext.Provider>
  );
}

export function useCustomerAccount() {
  const value = useContext(CustomerAccountContext);
  if (!value) {
    throw new Error("useCustomerAccount must be used within CustomerAccountProvider");
  }
  return value;
}
