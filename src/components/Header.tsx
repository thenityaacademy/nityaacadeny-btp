import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";

const navItems = [
  { label: "HOME", path: "/" },
  { label: "ABOUT", path: "/about", dropdown: [
    { label: "About Institute", path: "/about" },
    { label: "Director's Message", path: "/director-message" },
    { label: "Our Vision", path: "/vision" },
    { label: "Recognition & Affiliation", path: "/recognition" },
  ]},
  { label: "COURSE", path: "/courses", dropdown: [
    { label: "All Courses", path: "/courses" },
    { label: "Vocational", path: "/courses?cat=vocational" },
    { label: "Skill", path: "/courses?cat=skill" },
    { label: "University", path: "/courses?cat=university" },
  ]},
  { label: "ADMISSION", path: "/admission", dropdown: [
    { label: "Admission Form", path: "/admission" },
    { label: "Scholarship", path: "/scholarship" },
  ]},
  { label: "STUDY MATERIAL", path: "/study-material", dropdown: [
    { label: "Notes", path: "/study-material?tab=notes" },
    { label: "Syllabus", path: "/study-material?tab=syllabus" },
    { label: "Previous Papers", path: "/study-material?tab=previous-papers" },
  ]},
  { label: "NEWS & UPDATE", path: "/news" },
  { label: "CONTACT", path: "/contact" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path.split("?")[0]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileDropdown(null);
    setMobileOpen(false);
  }, [location]);

  const toggleDropdown = (label: string) => {
    setOpenDropdown((current) => (current === label ? null : label));
  };

  const toggleMobileDropdown = (label: string) => {
    setMobileDropdown((current) => (current === label ? null : label));
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="https://i.ibb.co/C5MHjQj9/nitya-banner-p.png"
              alt="Nitya Academy"
              className="h-10 lg:h-12 w-auto"
            />
          </Link>

          <nav ref={dropdownRef} className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
              >
                {item.dropdown ? (
                  <button
                    type="button"
                    onClick={() => toggleDropdown(item.label)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive(item.path)
                        ? "text-primary"
                        : "text-slate-700 hover:text-primary"
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        openDropdown === item.label ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive(item.path)
                        ? "text-primary"
                        : "text-slate-700 hover:text-primary"
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
                {item.dropdown && openDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 animate-fade-in-up z-50">
                    {item.dropdown.map((sub) => (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-light hover:text-primary transition-colors"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              to="/admission"
              className="ml-2 pill-btn-primary text-xs"
            >
              Apply Now
            </Link>
          </nav>

          <button
            type="button"
            className="lg:hidden p-2 text-slate-700"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.dropdown ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleMobileDropdown(item.label)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold ${
                        isActive(item.path)
                          ? "text-primary bg-primary-light"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                      aria-expanded={mobileDropdown === item.label}
                    >
                      {item.label}
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${
                          mobileDropdown === item.label ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {mobileDropdown === item.label && (
                      <div className="ml-4 mt-1 mb-2 space-y-1 border-l border-primary-light pl-2">
                        {item.dropdown.map((sub) => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => {
                              setMobileOpen(false);
                              setMobileDropdown(null);
                            }}
                            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-primary-light hover:text-primary"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-semibold ${
                      isActive(item.path)
                        ? "text-primary bg-primary-light"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <Link
              to="/admission"
              onClick={() => setMobileOpen(false)}
              className="w-full mt-2 pill-btn-primary text-xs"
            >
              Apply Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
