export default function Logo({ size = 120 }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size * 2, height: size * 1.2 }}
    >
      <img
        src="/divu-logo.png"
        alt="Logo"
        className="
          object-contain 
          drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]
          transition-transform duration-500 ease-in-out
          hover:scale-105 hover:drop-shadow-[0_0_30px_rgba(5,150,105,0.9)]
        "
        style={{ width: "85%", height: "85%" }}
      />
    </div>
  );
}
