import { Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function TopBar() {
  return (
    <div className="bg-primary text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="mailto:thenityaacademy@gmail.com" className="flex items-center gap-1.5 hover:text-primary-light transition-colors">
            <Mail size={14} />
            <span className="hidden sm:inline">thenityaacademy@gmail.com</span>
          </a>
          <a href="tel:+919680008384" className="flex items-center gap-1.5 hover:text-primary-light transition-colors">
            <Phone size={14} />
            <span className="hidden sm:inline">+91 96800 08384</span>
          </a>
        </div>
        <Link
          to="/admission?source=Top%20Bar"
          className="bg-white text-primary px-4 py-1 rounded-full font-semibold text-xs hover:bg-primary-light transition-colors"
        >
          Apply Now
        </Link>
      </div>
    </div>
  );
}
