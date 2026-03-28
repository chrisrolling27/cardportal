export default function EmptyState({ title, message }) {
  return (
    <div className="rounded-xl border border-dashed border-adyen-gray-300 bg-white p-8 text-center text-adyen-gray-700">
      <p className="text-lg font-semibold text-adyen-black">{title}</p>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

