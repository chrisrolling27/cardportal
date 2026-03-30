"use client";

import { useState } from "react";
import MethodBadge from "@/components/MethodBadge";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { formatTime } from "@/lib/utils";

export default function ApiHistoryContent() {
  const { entries, clear } = useApiHistory();
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-6">
      <section className="ca-surface overflow-hidden">
        <div className="flex justify-end border-b border-[#EDF1F7] p-4">
          <button className="ca-button-secondary px-3 py-1 text-xs" onClick={clear}>
            Clear History
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="ca-table">
            <thead className="bg-[#F8FAFD]">
              <tr>
                <th className="ca-th">Method</th>
                <th className="ca-th">Endpoint</th>
                <th className="ca-th">Detail</th>
                <th className="ca-th">Status</th>
                <th className="ca-th">Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="cursor-pointer border-t border-[#EDF1F7] hover:bg-[#F8FAFD]"
                  onClick={() => setSelected(entry)}
                >
                  <td className="ca-td">
                    <MethodBadge method={entry.method} />
                  </td>
                  <td className="ca-td font-mono text-xs">{entry.endpoint}</td>
                  <td className="ca-td">{entry.detail}</td>
                  <td className={`ca-td font-semibold ${entry.status < 400 ? "text-[#058B3C]" : "text-[#C0392B]"}`}>
                    {entry.status < 400 ? `${entry.status} OK` : `${entry.status} FAIL`}
                  </td>
                  <td className="ca-td">{formatTime(entry.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="ca-surface w-full max-w-3xl p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="ca-section-title">API Call Details</h3>
              <button onClick={() => setSelected(null)} className="ca-button-secondary">
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
                <pre className="max-h-72 overflow-auto rounded-lg bg-[#F8FAFD] p-3 text-xs">
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
                <pre className="max-h-72 overflow-auto rounded-lg bg-[#F8FAFD] p-3 text-xs">
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
