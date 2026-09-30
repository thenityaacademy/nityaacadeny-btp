import { useEffect, useRef } from "react";
import Contact from "./Contact";

export default function ContactUpdated() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const businessProfileUrl =
      "https://www.google.com/maps/search/?api=1&query=NITYA%20ACADEMY%20BHARATPUR&query_place_id=ChIJ72WBTlmjczkRvbUTno4JWKE";

    const replacements: Record<string, string> = {
      "Lavi Photostat Second Floor, Multipurpose Circle, Bharatpur, India, 321001":
        "Near Ketan Gate, Sahyog Nagar, Bharatpur 321001",
      "Lavi Photostat Second Floor, Multipurpose Circle":
        "Near Ketan Gate, Sahyog Nagar",
      "Bharatpur, India, 321001":
        "Bharatpur 321001",
    };

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }

    textNodes.forEach((node) => {
      const value = node.nodeValue?.trim();
      if (value && replacements[value]) {
        node.nodeValue =
          node.nodeValue?.replace(value, replacements[value]) ?? node.nodeValue;
      }
    });

    const openBusinessProfile = () => {
      window.open(businessProfileUrl, "_blank", "noopener,noreferrer");
    };

    root.querySelectorAll<HTMLParagraphElement>("p").forEach((element) => {
      if (
        element.textContent?.trim() ===
        "Near Ketan Gate, Sahyog Nagar, Bharatpur 321001"
      ) {
        element.setAttribute("role", "link");
        element.setAttribute("tabindex", "0");
        element.setAttribute("title", "Open Nitya Academy on Google Maps");
        element.classList.add(
          "cursor-pointer",
          "hover:text-primary",
          "hover:underline",
          "transition-colors"
        );
        element.onclick = openBusinessProfile;
        element.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openBusinessProfile();
          }
        };
      }
    });

    const mapLink = root.querySelector<HTMLAnchorElement>(
      'a[href="https://maps.google.com/?q=Bharatpur+321001"]'
    );

    if (mapLink) {
      mapLink.href = businessProfileUrl;
      mapLink.title = "Open Nitya Academy Google Business Profile";
    }
  }, []);

  return (
    <div ref={rootRef}>
      <Contact />
    </div>
  );
}
