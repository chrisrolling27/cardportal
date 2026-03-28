"use client";

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

