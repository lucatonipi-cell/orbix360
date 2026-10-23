// Global vanilla-JS behaviours shared by every server-rendered page:
// flash-message toasts, destructive-action confirmations, and copy-to-clipboard.
// Kept dependency-free and framework-free so it loads on every page cheaply.

function ensureStack(): HTMLElement {
  let stack = document.querySelector<HTMLElement>(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

export function showToast(message: string, type: "success" | "error" | "info" = "info") {
  const stack = ensureStack();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  stack.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.25s";
    window.setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function initFlashFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const notice = params.get("notice");
  const type = (params.get("type") as "success" | "error" | "info") || "success";
  if (notice) {
    showToast(notice, type);
    params.delete("notice");
    params.delete("type");
    const query = params.toString();
    const newUrl = window.location.pathname + (query ? `?${query}` : "");
    window.history.replaceState({}, "", newUrl);
  }
}

function initConfirmations() {
  document.addEventListener("submit", (e) => {
    const form = e.target as HTMLFormElement;
    const confirmMsg = form.getAttribute?.("data-confirm");
    if (confirmMsg && !window.confirm(confirmMsg)) {
      e.preventDefault();
    }
  });
  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest?.("a[data-confirm]");
    if (link && !window.confirm(link.getAttribute("data-confirm") || "")) {
      e.preventDefault();
    }
  });
}

function initCopyButtons() {
  document.addEventListener("click", async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-copy]");
    if (!btn) return;
    const text = btn.getAttribute("data-copy") || "";
    try {
      await navigator.clipboard.writeText(text);
      showToast("Código copiado.", "success");
    } catch {
      showToast("Não foi possível copiar automaticamente.", "error");
    }
  });
}

initFlashFromQuery();
initConfirmations();
initCopyButtons();

(window as any).OrbixToast = showToast;
