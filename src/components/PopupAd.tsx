import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getStore } from "../data/store";

export default function PopupAd() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const store = getStore();
    if (store.popupEnabled) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl animate-fade-in-up">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-slate-700 hover:bg-white hover:text-red-500 transition-colors shadow-md"
        >
          <X size={18} />
        </button>
        <img
          src="https://i.ibb.co/FR4TBgy/Chat-GPT-Image-Jun-10-2026-04-34-22-PM.png"
          alt="Special Offer"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
