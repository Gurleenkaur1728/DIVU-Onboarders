export default function Toast({ message, type = "info", onClose }) {
  const colors = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    warning: "bg-amber-500",
    info: "bg-blue-600",
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-fadeIn">
      <div className={`px-4 py-3 rounded-lg text-white shadow-lg flex items-center gap-3 min-w-[300px] ${colors[type]}`}>
        <span className="flex-1">{message}</span>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition text-lg font-bold leading-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
