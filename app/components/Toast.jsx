import { useEffect, useState } from "react";

export default function Toast({ message, type = "info", onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    warning: "bg-amber-500",
    info: "bg-blue-600",
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
      <div className={`px-4 py-3 rounded-lg text-white shadow-lg ${colors[type]}`}>
        {message}
      </div>
    </div>
  );
}
