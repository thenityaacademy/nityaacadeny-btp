import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  UserCheck,
  BookOpen,
  CheckCircle,
} from "lucide-react";
import { DEFAULTS } from "../data/store";

type Course = {
  id: string;
  name: string;
  fullName: string;
  description: string;
  duration: string;
  eligibility: string;
  category: string;
  icon: string;
};

export default function CourseDetail() {
  const { id } = useParams();

  const [course, setCourse] = useState<Course | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/site-settings"
        );

        if (!response.ok) {
          throw new Error("Course load failed");
        }

        const data = await response.json();

        let courses: Course[] = DEFAULTS.courses;

        if (typeof data.courses === "string") {
          const parsed = JSON.parse(data.courses);

          if (Array.isArray(parsed)) {
            courses = parsed;
          }
        }

        const foundCourse =
          courses.find(
            (item) => item.id === id
          ) || null;

        setCourse(foundCourse);
      } catch (err) {
        console.error(err);
        setError(
          "Course details load nahi ho pa rahi."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">
          Loading course...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Unable to Load Course
          </h2>

          <p className="text-red-500 mb-4">
            {error}
          </p>

          <Link
            to="/courses"
            className="text-primary font-medium"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Course Not Found
          </h2>

          <Link
            to="/courses"
            className="text-primary font-medium"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      <section className="bg-primary-light relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 text-primary font-medium mb-6 hover:underline"
            >
              <ArrowLeft size={18} />
              Back to Courses
            </Link>

            <span className="text-primary font-semibold text-sm uppercase tracking-wider block mb-2">
              {course.category}
            </span>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900">
              {course.name}
            </h1>

            <p className="text-lg text-slate-600 mt-2">
              {course.fullName}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl card-shadow p-8 lg:p-12 border border-slate-100"
          >

            <div className="grid sm:grid-cols-3 gap-6 mb-8">

              <div className="bg-primary-light rounded-xl p-4 text-center">
                <Clock
                  size={24}
                  className="mx-auto text-primary mb-2"
                />

                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Duration
                </p>

                <p className="font-bold text-slate-900">
                  {course.duration}
                </p>
              </div>

              <div className="bg-primary-light rounded-xl p-4 text-center">
                <UserCheck
                  size={24}
                  className="mx-auto text-primary mb-2"
                />

                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Eligibility
                </p>

                <p className="font-bold text-slate-900">
                  {course.eligibility}
                </p>
              </div>

              <div className="bg-primary-light rounded-xl p-4 text-center">
                <BookOpen
                  size={24}
                  className="mx-auto text-primary mb-2"
                />

                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Category
                </p>

                <p className="font-bold text-slate-900 capitalize">
                  {course.category}
                </p>
              </div>

            </div>

            <div className="prose prose-slate max-w-none">
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                About This Course
              </h3>

              <p className="text-slate-600 leading-relaxed mb-6 whitespace-pre-line">
                {course.description}
              </p>

              <h3 className="text-xl font-bold text-slate-900 mb-3">
                What You Will Learn
              </h3>

              <ul className="space-y-2 mb-6">
                {[
                  "Comprehensive theoretical knowledge",
                  "Practical hands-on training",
                  "Industry-relevant skills",
                  "Certification upon completion",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-slate-600"
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

            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link
                to="/admission"
                className="pill-btn-primary"
              >
                Apply for This Course
              </Link>
            </div>

          </motion.div>
        </div>
      </section>
    </div>
  );
}
