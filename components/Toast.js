"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TOAST_DISMISS_MS = 5000;

export function useToast() {
  const [toast, setToast] = useState(null);
  const dismissTimerRef = useRef(null);

  const clearToast = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (type, message) => {
      if (!message) return;
      clearToast();
      setToast({ type, message });
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        setToast(null);
      }, TOAST_DISMISS_MS);
    },
    [clearToast]
  );

  const showSuccess = useCallback(
    (message) => {
      showToast("success", message);
    },
    [showToast]
  );

  const showError = useCallback(
    (message) => {
      showToast("error", message);
    },
    [showToast]
  );

  useEffect(() => () => clearToast(), [clearToast]);

  return {
    toast,
    clearToast,
    showToast,
    showSuccess,
    showError,
  };
}

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg ${
        toast.type === "error"
          ? "border-[#F4CACA] bg-[#FDECEC] text-[#A43232]"
          : "border-[#BFECD0] bg-[#E8F9EF] text-[#046E31]"
      }`}
    >
      <div className="flex items-center gap-3">
        <p>{toast.message}</p>
        <button type="button" onClick={onClose} className="opacity-80 hover:opacity-100">
          ✕
        </button>
      </div>
    </div>
  );
}

