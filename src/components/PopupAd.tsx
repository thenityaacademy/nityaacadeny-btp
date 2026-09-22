import { useEffect, useState } from "react";
import { X } from "lucide-react";

function getGoogleDriveImageUrl(url: string) {
  if (url.includes("drive.google.com")) {
    const fileMatch = url.match(/\/file\/d\/([^/]+)/);
    const idMatch = url.match(/[?&]id=([^&]+)/);

    const fileId = fileMatch?.[1] || idMatch?.[1];

    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
    }
  }

  return url;
}

export default function PopupAd() {
  const [visible, setVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const popupAlreadyShown =
  sessionStorage.getItem("nitya_popup_shown") === "true";

  useEffect(() => {
    if (popupAlreadyShown) {
  return;
}
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loadPopup = async () => {
      try {
        const response = await fetch("/api/site-settings");

        if (!response.ok) {
          throw new Error("Popup settings load failed");
        }

        const data = await response.json();

        const enabled =
          data.popupEnabled === "true";

        const popupImage =
          typeof data.popupImage === "string"
            ? data.popupImage.trim()
            : "";

        if (
          active &&
          enabled &&
          popupImage
        ) {
          setImageUrl(popupImage);

         timer = setTimeout(() => {
  if (active) {
    sessionStorage.setItem(
      "nitya_popup_shown",
      "true"
    );

    setVisible(true);
  }
}, 2000);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadPopup();

    return () => {
      active = false;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  if (!visible || !imageUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

      <div className="relative bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl animate-fade-in-up">

        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-slate-700 hover:bg-white hover:text-red-500 transition-colors shadow-md"
          aria-label="Close popup"
        >
          <X size={18} />
        </button>

        <img
          src={getGoogleDriveImageUrl(imageUrl)}
          alt="Special Offer"
          className="w-full h-auto object-contain"
        />

      </div>

    </div>
  );
}
