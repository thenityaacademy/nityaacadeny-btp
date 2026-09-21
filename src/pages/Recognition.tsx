import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Award } from "lucide-react";

type RecognitionDoc = {
  id: number;
  name: string;
  url: string;
};

function getGoogleDriveImage(url: string): string | null {
  if (!url.includes("drive.google.com")) {
    return null;
  }

  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  const idMatch = url.match(/[?&]id=([^&]+)/);

  const fileId = fileMatch?.[1] || idMatch?.[1];

  if (!fileId) {
    return null;
  }

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
}

export default function Recognition() {
  const [docs, setDocs] = useState<RecognitionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDocs = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/recognition-documents"
        );

        if (!response.ok) {
          throw new Error("Documents load failed");
        }

        const data = await response.json();

        setDocs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(
          "Recognition documents load nahi ho rahe."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDocs();
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
              Credentials
            </span>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              Recognition & Affiliation
            </h1>
          </motion.div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid lg:grid-cols-2 gap-12 items-start">

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mb-6">
                <Award
                  size={32}
                  className="text-primary"
                />
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Affiliated & Recognized
              </h2>

              <p className="text-slate-600 leading-relaxed mb-6">
                Nitya Academy is a trusted educational
                institution registered and recognized under
                the appropriate government authorities. We
                are committed to delivering quality
                education that meets national academic
                standards and empowers students with valid,
                recognized certifications.
              </p>

              <p className="text-slate-600 leading-relaxed mb-6">
                All our university-affiliated courses follow
                the prescribed curriculum and examination
                patterns. Our vocational and skill-based
                programs are designed to provide practical,
                job-oriented training that helps students
                build successful careers.
              </p>

              <div className="flex flex-wrap gap-3">
                {[
                  "Government Registered",
                  "University Affiliated",
                  "Certified Programs",
                  "Trusted Institution",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-primary-light text-primary rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Documents & Certificates
              </h3>

              {loading ? (
                <div className="bg-slate-50 rounded-2xl p-8 text-center">
                  <p className="text-slate-500">
                    Loading documents...
                  </p>
                </div>
              ) : error ? (
                <div className="bg-red-50 rounded-2xl p-8 text-center">
                  <p className="text-red-600">
                    {error}
                  </p>
                </div>
              ) : docs.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-8 text-center">
                  <FileText
                    size={48}
                    className="mx-auto text-slate-300 mb-3"
                  />

                  <p className="text-slate-500">
                    No documents uploaded yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {docs.map((doc) => {
                    const imageUrl =
                      getGoogleDriveImage(doc.url);

                    if (!imageUrl) {
                      return null;
                    }

                    return (
                      <div
                        key={doc.id}
                        className="bg-white rounded-2xl card-shadow border border-slate-100 overflow-hidden"
                      >

                        <div className="bg-slate-100 p-4 flex items-center justify-center">
                          <img
                            src={imageUrl}
                            alt={doc.name}
                            className="max-h-[650px] max-w-full w-auto object-contain rounded-lg shadow-lg"
                          />
                        </div>

                        <div className="p-4">
                          <div className="flex items-center gap-3">

                            <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center shrink-0">
                              <FileText
                                size={20}
                                className="text-primary"
                              />
                            </div>

                            <div>
                              <h4 className="font-semibold text-slate-900 text-sm">
                                {doc.name}
                              </h4>

                              <p className="text-xs text-slate-500">
                                Recognition Document
                              </p>
                            </div>

                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
}
