const STYLE = {
  GET: "bg-green-500",
  POST: "bg-blue-500",
  PATCH: "bg-orange-500",
  DELETE: "bg-red-500",
};

export default function MethodBadge({ method }) {
  return (
    <span
      className={`inline-flex min-w-14 items-center justify-center rounded-full px-2 py-1 text-xs font-bold text-white ${
        STYLE[method] || "bg-slate-500"
      }`}
    >
      {method}
    </span>
  );
}

