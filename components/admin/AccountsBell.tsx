"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Alert = { severity: "high" | "medium"; where: string; message: string };

/** Floating alerts bell for the Accounting pages: payment and bill checks, dismissable, refreshed every minute. */
export default function AccountsBell() {
  const path = usePathname() ?? "";
  const on =
    path.startsWith("/admin/invoices") ||
    path.startsWith("/admin/payment-plans");
  const [mismatches, setMismatches] = useState<Alert[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>(() => {
    try {
      return typeof window === "undefined"
        ? []
        : JSON.parse(localStorage.getItem("yaft_pp_dismissed") || "[]");
    } catch {
      return [];
    }
  });
  const pull = useCallback(
    () =>
      fetch("/api/admin/payment-plans", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j) setMismatches(j.mismatches ?? []);
        })
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    if (!on) return;
    pull();
    const t = setInterval(pull, 60000);
    return () => clearInterval(t);
  }, [on, pull]);
  const dismiss = (keys: string[]) => {
    const next = [...new Set([...seen, ...keys])];
    setSeen(next);
    try {
      localStorage.setItem("yaft_pp_dismissed", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  if (!on) return null;
  const items = mismatches.map((m) => ({
    ...m,
    key: `${m.where}|${m.message}`,
  }));
  const live = items.filter((m) => !seen.includes(m.key));
  return (
    <div
      style={{
        position: "fixed",
        top: 112,
        right: 20,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={() => setBellOpen((o) => !o)}
        aria-label={`Alerts (${live.length})`}
        style={{
          position: "relative",
          background: "#111",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: 999,
          width: 42,
          height: 42,
          cursor: "pointer",
          fontSize: 18,
        }}
      >
        &#128276;
        {live.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#d42b38",
              color: "#fff",
              borderRadius: 999,
              fontSize: 11,
              minWidth: 18,
              height: 18,
              lineHeight: "18px",
              textAlign: "center",
              fontFamily: "var(--mono)",
            }}
          >
            {live.length}
          </span>
        )}
      </button>
      {bellOpen && (
        <div
          style={{
            width: 360,
            maxWidth: "calc(100vw - 40px)",
            maxHeight: "60vh",
            overflowY: "auto",
            background: "#141414",
            border: "1px solid #333",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,.5)",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2px 4px 8px",
              fontFamily: "var(--mono)",
              fontSize: 12,
            }}
          >
            <span>Alerts ({live.length})</span>
            {live.length > 0 && (
              <button
                type="button"
                onClick={() => dismiss(live.map((m) => m.key))}
                style={{
                  background: "none",
                  border: 0,
                  color: "var(--brass)",
                  cursor: "pointer",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                }}
              >
                Dismiss all
              </button>
            )}
          </div>
          {live.length === 0 ? (
            <p style={{ fontSize: 13, opacity: 0.7, padding: "6px 4px" }}>
              All clear. Payments and bills agree.
            </p>
          ) : (
            live.map((m) => (
              <div
                key={m.key}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "8px 6px",
                  borderTop: "1px solid #262626",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    marginTop: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    flex: "0 0 8px",
                    background: m.severity === "high" ? "#d42b38" : "#ffb300",
                  }}
                />
                <span style={{ flex: 1 }}>
                  <strong>{m.where}</strong>
                  <br />
                  {m.message}
                </span>
                <button
                  type="button"
                  onClick={() => dismiss([m.key])}
                  aria-label="Dismiss"
                  style={{
                    background: "none",
                    border: 0,
                    color: "#888",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
