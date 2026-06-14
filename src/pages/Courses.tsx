import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Monitor, Heart, Shield, GraduationCap, BookOpen, Library, PenTool, FlaskConical, Code, ScrollText, Microscope, ArrowRight } from "lucide-react";
import { getStore } from "../data/store";

const iconMap: Record<string, React.ElementType> = {
  Monitor, Heart, Shield, GraduationCap, BookOpen, Library, PenTool, FlaskConical, Code, ScrollText, Microscope
};

const categories = [
  { id: "all", label: "All Courses" },
  { id: "vocational", label: "Vocational" },
  { id: "skill", label: "Skill" },
  { id: "university", label: "University" },
];

export default function Courses() {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") || "all";
  const [activeCategory, setActiveCategory] = useState(initialCat);
  const store = getStore();

  const filtered = activeCategory === "all"
    ? store.courses
    : store.courses.filter((c: {category: string}) => c.category === activeCategory);

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <section className="bg-primary-light relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Programs</span>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              Our Courses
            </h1>
            <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
              Explore our wide range of vocational, skill-based, and university-affiliated courses designed for your success.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course: {id: string; name: string; fullName: string; description: string; duration: string; eligibility: string; icon: string}, i: number) => {
              const Icon = iconMap[course.icon] || GraduationCap;
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-all duration-300 group border border-slate-100"
                >
                  <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                    <Icon size={26} className="text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{course.name}</h3>
                  <p className="text-sm text-primary font-medium mb-3">{course.fullName}</p>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{course.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="bg-slate-100 px-3 py-1 rounded-full">{course.duration}</span>
                    <span className="bg-slate-100 px-3 py-1 rounded-full">{course.eligibility}</span>
                  </div>
                  <Link
                    to={`/course/${course.id}`}
                    className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:gap-3 transition-all"
                  >
                    View Details <ArrowRight size={16} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
