const STYLE = {
  allowed: "bg-green-100 text-green-700",
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  notApplicable: "bg-gray-100 text-gray-700",
  rejected: "bg-red-100 text-red-700",
  inactive: "bg-gray-100 text-gray-700",
  suspended: "bg-orange-100 text-orange-700",
  closed: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status = "unknown" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        STYLE[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

