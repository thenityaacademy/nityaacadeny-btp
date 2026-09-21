import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, CheckCircle } from "lucide-react";
import { DEFAULTS } from "../data/store";

export default function Vision() {
  const [visionContent, setVisionContent] = useState(
    DEFAULTS.visionContent
  );

  const [visionPoints, setVisionPoints] = useState<string[]>(
    DEFAULTS.visionPoints
  );

  useEffect(() => {
    const loadVision = async () => {
      try {
        const response = await fetch("/api/site-settings");

        if (!response.ok) {
          throw new Error("Vision load failed");
        }

        const data = await response.json();

        if (typeof data.visionContent === "string") {
          setVisionContent(data.visionContent);
        }

        if (typeof data.visionPoints === "string") {
          try {
            const parsed = JSON.parse(data.visionPoints);

            if (Array.isArray(parsed)) {
              setVisionPoints(parsed);
            }
          } catch (err) {
            console.error(err);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadVision();
  }, []);

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
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              Our Vision
            </span>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              Vision for the Future
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Vision Statement */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-6">
              <Eye size={36} className="text-primary" />
            </div>

            <div className="prose prose-slate max-w-none">

              {visionContent
                .split("\n\n")
                .map((para, i) => (
                  <p
                    key={i}
                    className="text-lg text-slate-600 leading-relaxed mb-4"
                  >
                    {para}
                  </p>
                ))}

            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {visionPoints.map((point, i) => (

              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.1,
                }}
                className="bg-white rounded-2xl p-6 card-shadow border border-slate-100"
              >

                <div className="flex items-start gap-3">

                  <CheckCircle
                    size={22}
                    className="text-primary shrink-0 mt-0.5"
                  />

                  <p className="text-slate-700 font-medium">
                    {point}
                  </p>

                </div>

              </motion.div>

            ))}

          </div>
        </div>
      </section>

    </div>
  );
}
