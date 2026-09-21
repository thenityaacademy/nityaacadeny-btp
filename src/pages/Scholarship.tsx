import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Award,
  CheckCircle,
  Percent,
} from "lucide-react";
import { DEFAULTS } from "../data/store";

function getGoogleDriveImageUrl(url: string) {
  if (url.includes("drive.google.com")) {
    const fileMatch = url.match(/\/file\/d\/([^/]+)/);
    const idMatch = url.match(/[?&]id=([^&]+)/);

    const fileId = fileMatch?.[1] || idMatch?.[1];

    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
    }
  }

  return url;
}

export default function Scholarship() {
  const [content, setContent] = useState(
    DEFAULTS.scholarshipContent
  );

  const [endDateValue, setEndDateValue] = useState(
    DEFAULTS.scholarshipEndDate
  );

  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const loadScholarship = async () => {
      try {
        const response = await fetch("/api/site-settings");

        if (!response.ok) {
          throw new Error("Scholarship load failed");
        }

        const data = await response.json();

        if (typeof data.scholarshipContent === "string") {
          setContent(data.scholarshipContent);
        }

        if (typeof data.scholarshipEndDate === "string") {
          setEndDateValue(data.scholarshipEndDate);
        }

        if (typeof data.scholarshipImage === "string") {
          setImageUrl(data.scholarshipImage);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadScholarship();
  }, []);

  const endDate = endDateValue
    ? new Date(`${endDateValue}T23:59:59`)
    : null;

  const displayDate = endDateValue
    ? new Date(`${endDateValue}T00:00:00`)
    : null;

  const isActive =
    endDate !== null &&
    !Number.isNaN(endDate.getTime()) &&
    endDate >= new Date();

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
              Financial Aid
            </span>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              Scholarship Information
            </h1>
          </motion.div>

        </div>
      </section>

      {/* Scholarship Content */}
      <section className="py-16 lg:py-24 bg-white">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* Scholarship Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {imageUrl ? (
                <img
                  src={getGoogleDriveImageUrl(imageUrl)}
                  alt="Scholarship"
                  className="w-full rounded-2xl card-shadow object-contain"
                />
              ) : (
                <div className="w-full min-h-[300px] rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                  Scholarship Image
                </div>
              )}
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >

              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 ${
                  isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <Calendar size={16} />

                {isActive
                  ? "Applications Open"
                  : "Applications Closed"}
              </div>

              <div className="bg-primary-light rounded-2xl p-6 mb-6">

                <p className="text-sm text-slate-500 mb-1">
                  Last Date to Apply
                </p>

                <p className="text-2xl font-bold text-primary">
                  {displayDate &&
                  !Number.isNaN(displayDate.getTime())
                    ? displayDate.toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )
                    : "Not Announced"}
                </p>

              </div>

              <div className="prose prose-slate max-w-none whitespace-pre-line">
                {content}
              </div>

            </motion.div>

          </div>
        </div>
      </section>

      {/* Merit Table */}
      <section className="py-16 bg-slate-50">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-10">

            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              Merit Based
            </span>

            <h2 className="text-3xl font-bold text-slate-900 mt-2">
              Scholarship Slab
            </h2>

          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {[
              {
                percent: "90%+",
                waiver: "50%",
                color: "bg-primary text-white",
              },
              {
                percent: "80-89%",
                waiver: "30%",
                color: "bg-primary/80 text-white",
              },
              {
                percent: "70-79%",
                waiver: "20%",
                color: "bg-primary/60 text-white",
              },
              {
                percent: "60-69%",
                waiver: "10%",
                color: "bg-primary/40 text-slate-900",
              },
            ].map((slab, i) => (

              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.1,
                }}
                className={`rounded-2xl p-6 text-center ${slab.color}`}
              >

                <Percent
                  size={24}
                  className="mx-auto mb-2 opacity-80"
                />

                <p className="text-3xl font-extrabold">
                  {slab.waiver}
                </p>

                <p className="text-sm opacity-80 mt-1">
                  Fee Waiver
                </p>

                <div className="mt-3 pt-3 border-t border-white/20">

                  <p className="text-xs opacity-70">
                    Marks: {slab.percent}
                  </p>

                </div>

              </motion.div>

            ))}

          </div>

          {/* Eligibility */}
          <div className="mt-10 bg-white rounded-2xl p-6 card-shadow">

            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">

              <Award
                size={20}
                className="text-primary"
              />

              Eligibility Criteria

            </h3>

            <ul className="space-y-3">

              {[
                "Must have passed the previous examination with minimum 60% marks",
                "Must be enrolled in ECCE or related course",
                "Family income should be below Rs. 3,00,000 per annum",
                "Attendance must be 75% or above",
                "No disciplinary actions against the student",
              ].map((item, i) => (

                <li
                  key={i}
                  className="flex items-start gap-3 text-slate-600"
                >

                  <CheckCircle
                    size={18}
                    className="text-primary shrink-0 mt-0.5"
                  />

                  {item}

                </li>

              ))}

            </ul>

          </div>

        </div>
      </section>

    </div>
  );
}
