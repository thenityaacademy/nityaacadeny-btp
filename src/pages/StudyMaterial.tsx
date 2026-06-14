import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Download, BookOpen, ClipboardList, FileQuestion } from "lucide-react";
import { getStore } from "../data/store";

const tabs = [
  { id: "notes", label: "Notes", icon: BookOpen },
  { id: "syllabus", label: "Syllabus", icon: ClipboardList },
  { id: "previous-papers", label: "Previous Papers", icon: FileQuestion },
];

export default function StudyMaterial() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "notes";
  const [activeTab, setActiveTab] = useState(initialTab);
  const store = getStore();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const getData = () => {
    switch (activeTab) {
      case "notes": return store.notes;
      case "syllabus": return store.syllabus;
      case "previous-papers": return store.previousPapers;
      default: return [];
    }
  };

  const data = getData();
  const activeTabInfo = tabs.find((t) => t.id === activeTab);

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
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Resources</span>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              Study Material
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Tabs & Content */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {data.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-12 text-center">
                <FileText size={64} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">No {activeTabInfo?.label} Available</h3>
                <p className="text-slate-500">Check back later for updates.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.map((doc: {name: string; url: string}, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-white rounded-xl p-5 card-shadow border border-slate-100 hover:border-primary/20 transition-colors"
                  >
                    <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={22} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{doc.name}</h4>
                      <p className="text-xs text-slate-500">PDF Document</p>
                    </div>
                    <a
                      href={doc.url}
                      download
                      className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center hover:bg-primary hover:text-white transition-colors shrink-0"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
