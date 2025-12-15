import { createContext, useContext, useState } from "react";
import Toast from "../components/Toast";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container - Fixed position at top-right */}
      <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
        <div className="pointer-events-auto">
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} type={t.type} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
