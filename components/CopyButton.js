"use client";

import { useState } from "react";
import { copyText } from "@/lib/utils";

export default function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await copyText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-md border border-adyen-gray-300 px-2 py-1 text-xs font-medium text-adyen-black hover:bg-adyen-gray-50"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

