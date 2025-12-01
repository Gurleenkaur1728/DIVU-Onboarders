export default function Toast({ message, type = "info" }) {
  const colors = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    warning: "bg-amber-500",
    info: "bg-blue-600",
  };

  return (
    <div className={`px-4 py-3 rounded-lg text-white shadow-lg animate-fadeIn ${colors[type]}`}>
      {message}
    </div>
  );
}
