"use client";

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
        toast.type === "error" ? "bg-red-600" : "bg-adyen-green"
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

