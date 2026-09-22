import emailjs from '@emailjs/browser';
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Calendar, User, Phone, MapPin, BookOpen, GraduationCap } from "lucide-react";
import { DEFAULTS } from "../data/store";
import { useSearchParams } from "react-router-dom";

export default function Admission() {
  const [searchParams] = useSearchParams();

const [submitting, setSubmitting] =
  useState(false);

const source =
  searchParams.get("source") || "Direct";
  const [courses, setCourses] = useState(
  DEFAULTS.courses
);

useEffect(() => {
  const loadCourses = async () => {
    try {
      const response = await fetch(
        "/api/site-settings"
      );

      if (!response.ok) {
        throw new Error(
          "Courses load failed"
        );
      }

      const data = await response.json();

      if (
        typeof data.courses === "string"
      ) {
        const parsed = JSON.parse(
          data.courses
        );

        if (Array.isArray(parsed)) {
          setCourses(parsed);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  loadCourses();
}, []);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    fatherName: "",
    dob: "",
    qualification: "",
    course: "",
    address: "",
    mobile: "",
  });

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (submitting) return;

  setSubmitting(true);

  try {
    const selectedCourse = courses.find(
      (course) => course.id === formData.course
    );

    const courseName = selectedCourse
      ? `${selectedCourse.name} - ${selectedCourse.fullName}`
      : formData.course;

    const response = await fetch("/api/admission", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formData,
        course: courseName,
        source,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Application save failed"
      );
    }

    try {
      await emailjs.send(
        "service_nitya",
        "template_ejbdu8k",
        {
          name: formData.name,
          fatherName: formData.fatherName,
          dob: formData.dob,
          qualification: formData.qualification,
          course: courseName,
          address: formData.address,
          mobile: formData.mobile,
        },
        "v0oG11RR1L6rHEWpK"
      );
    } catch (emailError) {
      console.error(
        "Email notification failed:",
        emailError
      );
    }

    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);

      setFormData({
        name: "",
        fatherName: "",
        dob: "",
        qualification: "",
        course: "",
        address: "",
        mobile: "",
      });
    }, 4000);
  } catch (error) {
    console.error(error);

    alert(
      "Application submit nahi hui. Please dobara try karein."
    );
  } finally {
    setSubmitting(false);
  }
};
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
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Join Us</span>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              Admission Form
            </h1>
            <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
              Fill out the form below to apply for admission. Our team will contact you shortly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl card-shadow p-8 lg:p-12 border border-slate-100"
          >
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h3>
                <p className="text-slate-600">Thank you for applying. We will review your application and contact you at {formData.mobile || "your provided number"}.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                      <User size={14} className="text-primary" /> Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                      <User size={14} className="text-primary" /> Father's Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      placeholder="Enter father's name"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                      <Calendar size={14} className="text-primary" /> Date of Birth *
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                      <GraduationCap size={14} className="text-primary" /> Qualification *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      placeholder="e.g. 12th Pass"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <BookOpen size={14} className="text-primary" /> Select Course *
                  </label>
                  <select
                    required
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  >
                    <option value="">Select a course</option>
                    {courses.map((c: any) => (
  <option key={c.id} value={c.id}>
    {c.name} - {c.fullName}
  </option>
))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <MapPin size={14} className="text-primary" /> Address *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                    placeholder="Enter your full address"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Phone size={14} className="text-primary" /> Mobile Number *
                  </label>
                  <input
                    required
                    type="tel"
                    pattern="[0-9]{10}"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    placeholder="10 digit mobile number"
                  />
                </div>

                <button
  type="submit"
  disabled={submitting}
  className="w-full pill-btn-primary py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
>
  {submitting
    ? "Submitting..."
    : "Submit Application"}
</button>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
