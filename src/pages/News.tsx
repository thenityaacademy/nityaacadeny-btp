import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Newspaper, Calendar } from "lucide-react";
import { getStore } from "../data/store";

export default function News() {
  const store = getStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Stay Informed</span>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              News & Updates
            </h1>
          </motion.div>
        </div>
      </section>

      {/* News List */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {store.news.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-12 text-center">
              <Newspaper size={64} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">No Updates</h3>
              <p className="text-slate-500">There are no news updates at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {store.news.map((item: {id: string; title: string; content: string; date: string}, i: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="bg-white rounded-2xl card-shadow border border-slate-100 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 pr-4">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Calendar size={12} />
                        {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-slate-400 transition-transform shrink-0 ${
                        expandedId === item.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                          <p className="text-slate-600 leading-relaxed pt-4">{item.content}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
