import { useEffect, useRef } from "react";
import Contact from "./Contact";

export default function ContactUpdated() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

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
        node.nodeValue = node.nodeValue?.replace(value, replacements[value]) ?? node.nodeValue;
      }
    });

    const mapLink = root.querySelector<HTMLAnchorElement>(
      'a[href="https://maps.google.com/?q=Bharatpur+321001"]'
    );

    if (mapLink) {
      mapLink.href =
        "https://maps.google.com/?q=Near+Ketan+Gate+Sahyog+Nagar+Bharatpur+321001";
    }
  }, []);

  return (
    <div ref={rootRef}>
      <Contact />
    </div>
  );
}
