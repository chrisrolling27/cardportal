"use client";

import { useEffect, useState } from "react";
import AdyenComponentMount from "@/components/AdyenComponentMount";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useApiHistory } from "@/context/ApiHistoryContext";

export default function ReportsPage() {
  const { trackedFetch } = useApiHistory();
  const [reportsAccountHolderId, setReportsAccountHolderId] = useState("");
  const [error, setError] = useState("");
  const [errorHint, setErrorHint] = useState("");

  useEffect(() => {
    const loadReportsAccountHolder = async () => {
      try {
        setError("");
        setErrorHint("");
        const accountHolder = await trackedFetch("/api/adyen/reports/account-holder");
        if (!accountHolder?.id) {
          throw new Error("Configured reports account holder was not found.");
        }
        setReportsAccountHolderId(accountHolder.id);
      } catch (err) {
        setError(err.message);
        setErrorHint(err?.payload?.diagnostics?.hint || "");
      }
    };
    loadReportsAccountHolder();
  }, [trackedFetch]);

  return (
    <div>
      {error ? (
        <div className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorHint ? <p className="font-medium">{errorHint}</p> : null}
          <p>{error}</p>
        </div>
      ) : !reportsAccountHolderId ? (
        <LoadingSkeleton className="h-64 w-full" />
      ) : (
        <section>
          <AdyenComponentMount
            componentName="ReportsOverview"
            accountHolderId={reportsAccountHolderId}
            roles={["Reports Overview Component: View"]}
          />
        </section>
      )}
    </div>
  );
}

