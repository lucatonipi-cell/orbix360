function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/")) return "Safari";
  return "Other";
}

export function createAnalyticsTracker(productId: string) {
  const sessionId = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const device = detectDevice();
  const browser = detectBrowser();
  let started = false;
  const lastSentAt: Record<string, number> = {};

  function post(path: string, body: unknown) {
    fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }

  return {
    trackView() {
      if (started) return;
      started = true;
      post(`/api/products/${productId}/analytics/view`, { sessionId, device, browser });
    },
    trackInteraction(kind: "rotate" | "zoom" | "fullscreen") {
      const now = Date.now();
      const minGapMs = kind === "rotate" ? 1500 : 400;
      if (lastSentAt[kind] && now - lastSentAt[kind] < minGapMs) return;
      lastSentAt[kind] = now;
      post(`/api/products/${productId}/analytics/interaction`, { sessionId, kind, device, browser });
    },
  };
}
