"use client";

import { useMemo, useState } from "react";
import MethodBadge from "@/components/MethodBadge";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { formatTime } from "@/lib/utils";

export default function ApiHistoryPage() {
  const { entries, clear } = useApiHistory();
  const [selected, setSelected] = useState(null);
  const [methodFilter, setMethodFilter] = useState({
    GET: true,
    POST: true,
    PATCH: true,
    DELETE: true,
  });
  const [statusFilter, setStatusFilter] = useState({
    success: true,
    failed: true,
  });

  const rows = useMemo(
    () =>
      entries.filter((entry) => {
        const methodOk = methodFilter[entry.method] ?? false;
        const okStatus = entry.status >= 200 && entry.status < 400;
        const statusOk = okStatus ? statusFilter.success : statusFilter.failed;
        return methodOk && statusOk;
      }),
    [entries, methodFilter, statusFilter]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-semibold">API History</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {Object.keys(methodFilter).map((method) => (
            <button
              key={method}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                methodFilter[method] ? "bg-adyen-black text-white" : "bg-adyen-gray-100 text-adyen-gray-500"
              }`}
              onClick={() => setMethodFilter((prev) => ({ ...prev, [method]: !prev[method] }))}
            >
              {method}
            </button>
          ))}
          {["success", "failed"].map((key) => (
            <button
              key={key}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                statusFilter[key] ? "bg-adyen-green text-adyen-black" : "bg-adyen-gray-100 text-adyen-gray-500"
              }`}
              onClick={() => setStatusFilter((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              {key}
            </button>
          ))}
          <button className="ml-auto rounded-md border px-3 py-1 text-xs" onClick={clear}>
            Clear History
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-adyen-gray-50 text-left text-adyen-gray-500">
              <tr>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr
                  key={entry.id}
                  className="cursor-pointer border-t border-adyen-gray-100 hover:bg-adyen-gray-50"
                  onClick={() => setSelected(entry)}
                >
                  <td className="px-4 py-3">
                    <MethodBadge method={entry.method} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.endpoint}</td>
                  <td className="px-4 py-3">{entry.detail}</td>
                  <td
                    className={`px-4 py-3 font-semibold ${
                      entry.status < 400 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {entry.status < 400 ? `${entry.status} OK` : `${entry.status} FAIL`}
                  </td>
                  <td className="px-4 py-3">{formatTime(entry.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">API Call Details</h3>
              <button onClick={() => setSelected(null)} className="rounded-md border px-3 py-1 text-sm">
                Close
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Request Body</p>
                  <button
                    className="text-xs underline"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(selected.requestBody || {}, null, 2))}
                  >
                    Copy
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto rounded-lg bg-adyen-gray-50 p-3 text-xs">
                  {JSON.stringify(selected.requestBody, null, 2)}
                </pre>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Response Body</p>
                  <button
                    className="text-xs underline"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(selected.responseBody || {}, null, 2))}
                  >
                    Copy
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto rounded-lg bg-adyen-gray-50 p-3 text-xs">
                  {JSON.stringify(selected.responseBody, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

