import { CheckCircle, Timer, PlayCircle, Lock, FileText, Sparkles } from "lucide-react";

export default function StatusPill({ status }) {
  const info =
    status === "completed"
      ? { color: "text-emerald-600", label: "Completed", icon: CheckCircle }
      : status === "in-progress"
      ? { color: "text-amber-500", label: "In Progress", icon: Timer }
      : status === "available"
      ? { color: "text-emerald-700", label: "Available", icon: PlayCircle }
      : status === "draft"
      ? { color: "text-gray-600", label: "Draft", icon: FileText }
      : status === "published"
      ? { color: "text-emerald-600", label: "Published", icon: Sparkles }
      : { color: "text-gray-500", label: "Locked", icon: Lock };

  const Icon = info.icon;
  return (
    <div
      className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-full text-xs font-bold border-current ${info.color}`}
    >
      <Icon className="w-4 h-4" /> {info.label}
    </div>
  );
}
