import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, MapPin, Clock, MessageCircle } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const whatsappMessage = `Hello Nitya Academy,

Name: ${formData.name}

Message: ${formData.message}`;

  const whatsappUrl =
  `https://wa.me/919802813444?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  window.open(
    whatsappUrl,
    "_blank",
    "noopener,noreferrer"
  );
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
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Get in Touch</span>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mt-3">
              Contact Us
            </h1>
            <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
              Have questions? We are here to help. Reach out to us through any of the channels below.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-8">Contact Information</h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center shrink-0">
                    <Phone size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Phone</h3>
                    <a href="tel:+919680008384" className="text-slate-600 hover:text-primary transition-colors">+91 96800 08384</a>
                    <br />
                    <a href="tel:+919802813444" className="text-slate-600 hover:text-primary transition-colors">+91 98028 13444</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center shrink-0">
                    <MapPin size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Address</h3>
                    <p className="text-slate-600">Lavi Photostat Second Floor, Multipurpose Circle, Bharatpur, India, 321001</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center shrink-0">
                    <Clock size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Working Hours</h3>
                    <p className="text-slate-600">Monday - Saturday: 9:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold text-slate-900 mb-4">Follow Us</h3>
                <div className="flex items-center gap-3">
                  <a href="https://www.instagram.com/nitya.academy.btp" target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-primary-light rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                  </a>
                  <a href="https://www.facebook.com/profile.php?id=61590433601910" target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-primary-light rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  </a>
                  <a href="https://wa.me/message/ZFFLAV4QKSZJA1" target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-primary-light rounded-full flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors text-primary">
                    <MessageCircle size={18} />
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white rounded-3xl card-shadow p-8 border border-slate-100">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Send a Message</h2>

                <p className="text-sm text-slate-500 mb-5">
                  Fill your query and continue the conversation directly on WhatsApp.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>
                    <button type="submit" className="w-full pill-btn-primary py-3.5">
                      Continue on WhatsApp
                    </button>
                  </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl overflow-hidden card-shadow border border-slate-100">
            <div className="h-80 lg:h-96 bg-slate-200 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-primary/5" />
              <div className="text-center relative z-10">
                <MapPin size={48} className="mx-auto text-primary mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Nitya Academy</h3>
                <p className="text-slate-600 text-sm mt-1">Lavi Photostat Second Floor, Multipurpose Circle</p>
                <p className="text-slate-600 text-sm">Bharatpur, India, 321001</p>
                <a
                  href="https://maps.google.com/?q=Bharatpur+321001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-primary font-medium text-sm hover:underline"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
