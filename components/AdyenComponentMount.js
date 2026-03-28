"use client";

import { useEffect, useRef, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useApiHistory } from "@/context/ApiHistoryContext";

export default function AdyenComponentMount({
  componentName,
  accountHolderId,
  roles,
  fallback,
  className = "rounded-xl bg-white p-4 shadow-soft",
}) {
  const containerRef = useRef(null);
  const { trackedFetch } = useApiHistory();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let componentInstance = null;

    const init = async () => {
      try {
        const sdk = await import("@adyen/adyen-platform-experience-web");
        await import("@adyen/adyen-platform-experience-web/adyen-platform-experience-web.css");

        const map = {
          TransactionsOverview: sdk.TransactionsOverview,
          PayoutsOverview: sdk.PayoutsOverview,
          CapitalOverview: sdk.CapitalOverview,
        };
        const Component = map[componentName];
        if (!Component) throw new Error(`Unknown component: ${componentName}`);

        const getSession = async () =>
          trackedFetch("/api/adyen/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountHolderId, roles }),
          });

        const core = await sdk.AdyenPlatformExperience({ session: getSession });
        componentInstance = new Component({ core });

        if (mounted && containerRef.current) {
          componentInstance.mount(containerRef.current);
          setLoading(false);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Component failed to load.");
        setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
      componentInstance?.unmount?.();
    };
  }, [accountHolderId, componentName, roles, trackedFetch]);

  if (loading) return <LoadingSkeleton className="h-64 w-full" />;
  if (error) return fallback || <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  return <div className={className} ref={containerRef} />;
}

