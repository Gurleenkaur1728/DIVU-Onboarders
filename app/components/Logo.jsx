export default function Logo({ size = 140 }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size * 1.5, height: size * 1.2 }}
    >
      <img
        src="/divu-logo.png"
        alt="Logo"
        className="
          object-contain 
          drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]
          transition-transform duration-500 ease-in-out
          hover:scale-105 hover:drop-shadow-[0_0_35px_rgba(5,150,105,0.9)]
        "
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
