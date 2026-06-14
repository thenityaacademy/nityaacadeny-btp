import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { getStore } from "../data/store";

export default function DirectorMessage() {
  const store = getStore();

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
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Leadership</span>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              Director's Message
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Director Card */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl card-shadow p-8 lg:p-12"
          >
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0">
                <div className="w-32 h-32 lg:w-40 lg:h-40 bg-primary-light rounded-2xl flex items-center justify-center">
                  <span className="text-4xl lg:text-5xl font-bold text-primary">{store.directorName.charAt(0)}</span>
                </div>
              </div>
              <div className="flex-1">
                <Quote size={32} className="text-primary/20 mb-4" />
                <div className="prose prose-slate max-w-none mb-6">
                  {store.directorMessage.split("\n\n").map((para: string, i: number) => (
                    <p key={i} className="text-slate-600 leading-relaxed mb-4">
                      {para}
                    </p>
                  ))}
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xl font-bold text-slate-900">{store.directorName}</h3>
                  <p className="text-primary font-medium">Director, Nitya Academy</p>
                  <p className="text-sm text-slate-500">{store.directorLocation}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Co-Director Card */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl card-shadow p-8 lg:p-12"
          >
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0">
                <div className="w-32 h-32 lg:w-40 lg:h-40 bg-primary-light rounded-2xl flex items-center justify-center">
                  <span className="text-4xl lg:text-5xl font-bold text-primary">{store.coDirectorName.charAt(0)}</span>
                </div>
              </div>
              <div className="flex-1">
                <Quote size={32} className="text-primary/20 mb-4" />
                <div className="prose prose-slate max-w-none mb-6">
                  {store.coDirectorMessage.split("\n\n").map((para: string, i: number) => (
                    <p key={i} className="text-slate-600 leading-relaxed mb-4">
                      {para}
                    </p>
                  ))}
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xl font-bold text-slate-900">{store.coDirectorName}</h3>
                  <p className="text-primary font-medium">Co-Director, Nitya Academy</p>
                  <p className="text-sm text-slate-500">{store.coDirectorLocation}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
