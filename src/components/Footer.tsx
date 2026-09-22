import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <img
             src="https://drive.google.com/thumbnail?id=1eH75kZyla2u4JOZ-Th3QlMvbidK0KbNW&sz=w1600"
              alt="Nitya Academy"
              className="h-12 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-slate-400 text-sm leading-relaxed">
              Nitya Academy is committed to providing quality education and skill development to help students build a successful future.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Institute</Link></li>
              <li><Link to="/courses" className="hover:text-white transition-colors">Courses</Link></li>
              <li><Link
        to="/admission?source=Footer"
        className="hover:text-white transition-colors"
            >
        Admission
        </Link></li>
              <li><Link to="/scholarship" className="hover:text-white transition-colors">Scholarship</Link></li>
              <li><Link to="/news" className="hover:text-white transition-colors">News & Updates</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Study Material</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/study-material?tab=notes" className="hover:text-white transition-colors">Notes</Link></li>
              <li><Link to="/study-material?tab=syllabus" className="hover:text-white transition-colors">Syllabus</Link></li>
              <li><Link to="/study-material?tab=previous-papers" className="hover:text-white transition-colors">Previous Papers</Link></li>
              <li><Link to="/recognition" className="hover:text-white transition-colors">Recognition</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <Phone size={16} className="mt-0.5 text-primary-light shrink-0" />
                <div>
                  <a href="tel:+919680008384" className="hover:text-white">+91 96800 08384</a>
                  <br />
                  <a href="tel:+919802813444" className="hover:text-white">+91 98028 13444</a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail size={16} className="mt-0.5 text-primary-light shrink-0" />
                <a href="mailto:thenityaacademy@gmail.com" className="hover:text-white">thenityaacademy@gmail.com</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-primary-light shrink-0" />
                <span>Lavi Photostat Second Floor, Multipurpose Circle, Bharatpur, India, 321001</span>
              </li>
            </ul>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://www.instagram.com/nitya.academy.btp" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61590433601910" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://wa.me/message/ZFFLAV4QKSZJA1" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-green-600 transition-colors">
                <MessageCircle size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Nitya Academy. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
