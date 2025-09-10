export default function AuthCard({ children }) {
  return (
    <div
      className="
        w-[340px] 
        rounded-2xl 
        border border-emerald-400/20 
        bg-gradient-to-br from-emerald-900/60 via-emerald-800/50 to-emerald-700/40 
        backdrop-blur-xl 
        px-6 py-8 
        shadow-lg shadow-emerald-900/40
        transition-all duration-500 ease-in-out
        hover:rounded-lg hover:shadow-emerald-600/40
      "
    >
      {children}
    </div>
  );
}
