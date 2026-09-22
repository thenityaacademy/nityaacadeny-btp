import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, Users, Award, TrendingUp, GraduationCap, Shield, Heart, Monitor } from "lucide-react";
import { getStore } from "../data/store";
import WaveDivider from "../components/WaveDivider";
function getGoogleDriveImageUrl(url: string) {
  if (url.includes("drive.google.com")) {
    const fileMatch = url.match(/\/file\/d\/([^/]+)/);
    const idMatch = url.match(/[?&]id=([^&]+)/);

    const fileId = fileMatch?.[1] || idMatch?.[1];

    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
    }
  }

  return url;
}

const features = [
  { icon: BookOpen, title: "Quality Education", desc: "Industry-relevant curriculum designed by experts." },
  { icon: Users, title: "Expert Faculty", desc: "Learn from experienced and dedicated educators." },
  { icon: Award, title: "Certified Courses", desc: "Government and university recognized programs." },
  { icon: TrendingUp, title: "Career Growth", desc: "Placement support and skill development." },
];

const stats = [
  { value: "15+", label: "Courses Offered" },
  { value: "5000+", label: "Students Trained" },
  { value: "98%", label: "Success Rate" },
  { value: "10+", label: "Years Experience" },
];

export default function Home() {
  const store = getStore();
  const [offerIndex, setOfferIndex] = useState(0);
  const [instaIndex, setInstaIndex] = useState(0);
  const [aboutContent, setAboutContent] = useState(
  store.aboutContent
);

useEffect(() => {
  const loadAboutContent = async () => {
    try {
      const response = await fetch("/api/site-settings");

      if (!response.ok) {
        throw new Error("About content load failed");
      }

      const data = await response.json();

      if (
        typeof data.aboutContent === "string" &&
        data.aboutContent.trim()
      ) {
        setAboutContent(data.aboutContent);
      }
    } catch (err) {
      console.error(err);
    }
  };

  loadAboutContent();
}, []);
  const [instagramImages, setInstagramImages] = useState<string[]>(
  store.instagramImages
);

useEffect(() => {
  const loadInstagramImages = async () => {
    try {
      const response = await fetch("/api/site-settings");

      if (!response.ok) {
        throw new Error("Instagram images load failed");
      }

      const data = await response.json();

      if (typeof data.instagramImages === "string") {
        const parsed = JSON.parse(data.instagramImages);

        if (Array.isArray(parsed)) {
          setInstagramImages(parsed);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  loadInstagramImages();
}, []);
const [offerImages, setOfferImages] = useState<string[]>(
  store.offerImages
);

useEffect(() => {
  const loadOfferImages = async () => {
    try {
      const response = await fetch("/api/site-settings");

      if (!response.ok) {
        throw new Error("Offer images load failed");
      }

      const data = await response.json();

      if (typeof data.offerImages === "string") {
        const parsed = JSON.parse(data.offerImages);

        if (Array.isArray(parsed)) {
          setOfferImages(parsed);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  loadOfferImages();
}, []);
 const nextOffer = useCallback(() => {
  if (offerImages.length <= 1) return;

  setOfferIndex(
    (i) => (i + 1) % offerImages.length
  );
}, [offerImages.length]);

const prevOffer = useCallback(() => {
  if (offerImages.length <= 1) return;

  setOfferIndex(
    (i) =>
      (i - 1 + offerImages.length) %
      offerImages.length
  );
}, [offerImages.length]);

  const nextInsta = useCallback(() => {
  if (instagramImages.length <= 1) return;

  setInstaIndex(
    (i) => (i + 1) % instagramImages.length
  );
}, [instagramImages.length]);

const prevInsta = useCallback(() => {
  if (instagramImages.length <= 1) return;

  setInstaIndex(
    (i) =>
      (i - 1 + instagramImages.length) %
      instagramImages.length
  );
}, [instagramImages.length]);

  useEffect(() => {
  if (offerImages.length <= 1) return;

  const timer = setInterval(nextOffer, 4000);

  return () => clearInterval(timer);
}, [nextOffer, offerImages.length]);

useEffect(() => {
  if (
    offerImages.length > 0 &&
    offerIndex >= offerImages.length
  ) {
    setOfferIndex(0);
  }
}, [offerImages.length, offerIndex]);

  useEffect(() => {
  if (instagramImages.length <= 1) return;

  const timer = setInterval(nextInsta, 3500);

  return () => clearInterval(timer);
}, [nextInsta, instagramImages.length]);

useEffect(() => {
  if (
    instagramImages.length > 0 &&
    instaIndex >= instagramImages.length
  ) {
    setInstaIndex(0);
  }
}, [instagramImages.length, instaIndex]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-primary-light overflow-hidden">
        <div className="absolute inset-0 dotted-grid" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-6">
                Welcome to Nitya Academy
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                Future yahin se{" "}
                <span className="text-primary">shuru hota hai...</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-lg">
                Empowering students with quality education, practical skills, and recognized certifications for a brighter tomorrow.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/admission" className="pill-btn-primary">
                  Apply Now
                </Link>
                <Link to="/about" className="pill-btn-outline">
                  Learn More
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex justify-center"
            >
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-75" />
              <img
                src="https://drive.google.com/thumbnail?id=13UtCW9ScOeE4kawBZx3lGcdiBzO7d8cU&sz=w1600"
                alt="Student"
                className="relative z-10 max-h-[500px] w-auto object-contain drop-shadow-2xl"
              />
            </motion.div>
          </div>
        </div>

        <WaveDivider fill="#ffffff" />
      </section>

      {/* Offers Carousel */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Latest Offers</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">Special Programs & Offers</h2>
          </div>

          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <button
              onClick={prevOffer}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary-light rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary shadow-sm"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="flex-1 overflow-hidden rounded-2xl card-shadow bg-white">
              <div
                className="flex transition-transform duration-500 ease-out items-center"
                style={{ transform: `translateX(-${offerIndex * 100}%)` }}
              >
                {offerImages.map((img: string, i: number) => (
                  <div key={i} className="w-full flex-shrink-0 flex items-center justify-center bg-white p-2 sm:p-3">
                    <img
                      src={getGoogleDriveImageUrl(img)}
                      alt={`Offer ${i + 1}`}
                      className="max-w-full max-h-[528px] w-auto h-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={nextOffer}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary-light rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary shadow-sm"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {offerImages.map((_: string, i: number) => (
              <button
                key={i}
                onClick={() => setOfferIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === offerIndex ? "bg-primary" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">About Us</span>
              <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-4">
                Building Futures Through Education
              </h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                {aboutContent.split("\n\n")[0]}
              </p>
              <Link to="/about" className="pill-btn-primary">
                Read More
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-white rounded-2xl p-6 card-shadow">
                <GraduationCap size={32} className="text-primary mb-3" />
                <h3 className="font-bold text-slate-900">University Courses</h3>
                <p className="text-sm text-slate-500 mt-1">BA, BSc, BCA, MA, MSc & more</p>
              </div>
              <div className="bg-white rounded-2xl p-6 card-shadow mt-6">
                <Monitor size={32} className="text-primary mb-3" />
                <h3 className="font-bold text-slate-900">Vocational Training</h3>
                <p className="text-sm text-slate-500 mt-1">ECCE, DCA, PGDCA programs</p>
              </div>
              <div className="bg-white rounded-2xl p-6 card-shadow">
                <Heart size={32} className="text-primary mb-3" />
                <h3 className="font-bold text-slate-900">Skill Development</h3>
                <p className="text-sm text-slate-500 mt-1">Yoga, Fire & Safety courses</p>
              </div>
              <div className="bg-white rounded-2xl p-6 card-shadow mt-6">
                <Shield size={32} className="text-primary mb-3" />
                <h3 className="font-bold text-slate-900">Certified Programs</h3>
                <p className="text-sm text-slate-500 mt-1">Government recognized</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">What Makes Us Different</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                  <f.icon size={24} className="text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram Carousel */}
      <section className="py-16 bg-primary-light/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Follow Us</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">@nitya.academy.btp</h2>
          </div>

          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <button
              onClick={prevInsta}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary shadow-sm"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="flex-1 overflow-hidden rounded-2xl card-shadow aspect-square">
              <div
                className="flex transition-transform duration-500 ease-out h-full"
                style={{ transform: `translateX(-${instaIndex * 100}%)` }}
              >
                {instagramImages.map((img: string, i: number) => (
                  <div key={i} className="w-full flex-shrink-0 h-full">
                    <img
                      src={getGoogleDriveImageUrl(img)}
                      alt={`Instagram ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={nextInsta}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary shadow-sm"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {instagramImages.map((_: string, i: number) => (
              <button
                key={i}
                onClick={() => setInstaIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === instaIndex ? "bg-primary" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stats / CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl lg:text-5xl font-extrabold text-white mb-2">{s.value}</div>
                <div className="text-primary-light text-sm font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Start Your Journey?</h3>
            <p className="text-primary-light mb-6 max-w-xl mx-auto">
              Join thousands of students who have transformed their careers with Nitya Academy.
            </p>
            <Link to="/admission" className="inline-flex items-center justify-center px-8 py-3 rounded-full font-semibold text-sm bg-white text-primary hover:bg-primary-light transition-colors">
              Apply Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
