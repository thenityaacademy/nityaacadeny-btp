import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Lightbulb, Users, Award } from "lucide-react";
import { DEFAULTS } from "../data/store";

export default function About() {
  const [aboutContent, setAboutContent] = useState(
    DEFAULTS.aboutContent
  );

  useEffect(() => {
    fetch("/api/site-settings")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Settings load failed");
        }

        return response.json();
      })
      .then((data) => {
        if (
          typeof data.aboutContent === "string" &&
          data.aboutContent.trim()
        ) {
          setAboutContent(data.aboutContent);
        }
      })
      .catch((err) => {
        console.error("About content load error:", err);
      });
  }, []);

  return (
    <div className="min-h-screen">
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
              About Us
            </span>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              About Nitya Academy
            </h1>
          </motion.div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <img
                src="https://drive.google.com/thumbnail?id=1eH75kZyla2u4JOZ-Th3QlMvbidK0KbNW&sz=w1600"
                alt="Nitya Academy"
                className="w-full max-w-md mx-auto rounded-2xl card-shadow"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Shaping Tomorrow&apos;s Leaders Today
              </h2>

              <div className="prose prose-slate max-w-none">
                {aboutContent
                  .split("\n\n")
                  .map((para: string, i: number) => (
                    <p
                      key={i}
                      className="text-slate-600 leading-relaxed mb-4"
                    >
                      {para}
                    </p>
                  ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              Our Mission
            </span>

            <h2 className="text-3xl font-bold text-slate-900 mt-2">
              What Drives Us
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Target,
                title: "Our Mission",
                desc: "To provide accessible, quality education that empowers students to achieve their full potential.",
              },
              {
                icon: Lightbulb,
                title: "Our Approach",
                desc: "Combining theoretical knowledge with practical skills for holistic development.",
              },
              {
                icon: Users,
                title: "Our Community",
                desc: "Building a supportive learning environment for students from all backgrounds.",
              },
              {
                icon: Award,
                title: "Our Standards",
                desc: "Maintaining excellence through recognized certifications and industry partnerships.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.1,
                }}
                className="bg-white rounded-2xl p-6 card-shadow"
              >
                <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-4">
                  <item.icon
                    size={24}
                    className="text-primary"
                  />
                </div>

                <h3 className="font-bold text-slate-900 mb-2">
                  {item.title}
                </h3>

                <p className="text-sm text-slate-500">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
