const drafts = new Set<string>();
export function setDashboardDraftDirty(key: string, dirty: boolean) {
  if (dirty) drafts.add(key);
  else drafts.delete(key);
}
export function hasDashboardUnsavedChanges() {
  return drafts.size > 0;
}
export function confirmDashboardDiscard() {
  return (
    !hasDashboardUnsavedChanges() ||
    window.confirm(
      document.documentElement.lang === "ar"
        ? "لديك تعديلات غير محفوظة. هل تريد مغادرة الصفحة وفقدانها؟"
        : "You have unsaved changes. Leave this page and discard them?",
    )
  );
}

/** Guard all in-app History navigations, including links outside wouter. */
export function installDashboardNavigationGuard() {
  const history = window.history;
  const push = history.pushState;
  const replace = history.replaceState;
  // Stamp the current entry without notifying router subscribers during insertion.
  const replaceSilently = typeof History === "undefined" ? replace : History.prototype.replaceState;
  const indexKey = "__spaceCallDraftIndex";
  let index = 0;
  let currentUrl = window.location.href;
  let currentState = history.state;
  let restoring = false;
  const stamp = (state: unknown, value: number) => ({
    ...(state && typeof state === "object" ? state : {}),
    [indexKey]: value,
  });
  replaceSilently.call(history, stamp(currentState, index), "", currentUrl);
  currentState = history.state;
  function allow(url: string | URL | null | undefined) {
    const target = new URL(url == null ? window.location.href : String(url), window.location.href);
    if (target.pathname === window.location.pathname || target.pathname === "/dashboard/login")
      return true;
    if (!confirmDashboardDiscard()) return false;
    drafts.clear();
    return true;
  }
  history.pushState = function (state, unused, url) {
    if (!allow(url)) return;
    push.call(history, stamp(state, ++index), unused, url);
    currentUrl = window.location.href;
    currentState = history.state;
  };
  history.replaceState = function (state, unused, url) {
    if (!allow(url)) return;
    replace.call(history, stamp(state, index), unused, url);
    currentUrl = window.location.href;
    currentState = history.state;
  };
  const onPop = (event: PopStateEvent) => {
    if (restoring) {
      restoring = false;
      event.stopImmediatePropagation();
      return;
    }
    const targetIndex = event.state?.[indexKey];
    if (!confirmDashboardDiscard()) {
      event.stopImmediatePropagation();
      if (typeof targetIndex === "number" && targetIndex !== index) {
        restoring = true;
        history.go(index - targetIndex);
      } else replace.call(history, currentState, "", currentUrl);
      return;
    }
    drafts.clear();
    index = typeof targetIndex === "number" ? targetIndex : index;
    currentUrl = window.location.href;
    currentState = history.state;
  };
  const onUnload = (event: BeforeUnloadEvent) => {
    if (!hasDashboardUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  };
  window.addEventListener("popstate", onPop, true);
  window.addEventListener("beforeunload", onUnload);
  return () => {
    history.pushState = push;
    history.replaceState = replace;
    window.removeEventListener("popstate", onPop, true);
    window.removeEventListener("beforeunload", onUnload);
    drafts.clear();
  };
}
