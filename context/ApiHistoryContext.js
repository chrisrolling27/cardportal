"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { endpointFromProxy, extractDetail } from "@/lib/utils";

const ApiHistoryContext = createContext(null);

export function ApiHistoryProvider({ children }) {
  const [entries, setEntries] = useState([]);

  const clear = useCallback(() => setEntries([]), []);

  const trackedFetch = useCallback(async (url, options = {}) => {
    const method = options.method || "GET";
    const timestamp = new Date().toISOString();
    const requestBody = options.body ? JSON.parse(options.body) : null;
    const endpoint = endpointFromProxy(url);

    try {
      const response = await fetch(url, options);
      const payload = await response.json().catch(() => ({}));
      const detail = extractDetail(endpoint, payload);

      setEntries((prev) => [
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          timestamp,
          method,
          endpoint,
          requestBody,
          responseBody: payload,
          status: response.status,
          detail,
        },
        ...prev,
      ]);

      if (!response.ok) {
        const err = new Error(payload?.error || payload?.message || "Request failed");
        err.status = response.status;
        err.payload = payload;
        throw err;
      }

      return payload;
    } catch (error) {
      setEntries((prev) => [
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          timestamp,
          method,
          endpoint,
          requestBody,
          responseBody: error.payload || { error: error.message },
          status: error.status || 500,
          detail: extractDetail(endpoint, error.payload || { error: error.message }),
        },
        ...prev,
      ]);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({ entries, trackedFetch, clear }),
    [clear, entries, trackedFetch]
  );

  return <ApiHistoryContext.Provider value={value}>{children}</ApiHistoryContext.Provider>;
}

export function useApiHistory() {
  const context = useContext(ApiHistoryContext);
  if (!context) throw new Error("useApiHistory must be used inside ApiHistoryProvider");
  return context;
}

