import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogIn, Lock, Eye, EyeOff, LayoutDashboard, Image, BookOpen, Newspaper, FileText, Settings, Save, Trash2, Plus, X, CheckCircle, AlertTriangle, Award } from "lucide-react";
import { getStore, setStore } from "../data/store";

const SECTIONS = [
  { id: "offers", label: "Offer Images", icon: Image },
  { id: "instagram", label: "Instagram Images", icon: Image },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "popup", label: "Popup Ad", icon: Image },
  { id: "news", label: "News", icon: Newspaper },
  { id: "study", label: "Study Material", icon: FileText },
  { id: "scholarship", label: "Scholarship", icon: Settings },
  { id: "recognition", label: "Recognition Docs", icon: Award },
  { id: "content", label: "Page Content", icon: FileText },
];

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [activeSection, setActiveSection] = useState("offers");
  const [store, setLocalStore] = useState(getStore());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem("nitya_admin_session");
    if (session === "active") setLoggedIn(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "thenityaacademy@gmail.com" && password === "Redhat@123") {
      setLoggedIn(true);
      sessionStorage.setItem("nitya_admin_session", "active");
      setLoginError("");
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const handleSave = (data: Record<string, unknown>) => {
    const updated = setStore(data);
    setLocalStore(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl card-shadow p-8 lg:p-12 w-full max-w-md border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
            <p className="text-slate-500 text-sm mt-1">Nitya Academy Dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm pr-12"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {loginError && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            <button type="submit" className="w-full pill-btn-primary py-3.5">
              <LogIn size={18} className="mr-2" /> Login
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Reset Password: Security ID "Bhadra Center Name: BINT BHADRA"
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard size={24} className="text-primary" />
            <h1 className="font-bold text-slate-900">Admin Dashboard</h1>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("nitya_admin_session");
              setLoggedIn(false);
            }}
            className="text-sm text-slate-500 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl card-shadow border border-slate-100 overflow-hidden">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? "bg-primary text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={18} />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {saved && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2 bg-green-100 text-green-700 px-4 py-3 rounded-xl text-sm font-medium"
              >
                <CheckCircle size={18} /> Changes saved successfully!
              </motion.div>
            )}

            {activeSection === "offers" && <OfferImagesAdmin store={store} onSave={handleSave} />}
            {activeSection === "instagram" && <InstagramImagesAdmin store={store} onSave={handleSave} />}
            {activeSection === "courses" && <CoursesAdmin store={store} onSave={handleSave} />}
            {activeSection === "popup" && <PopupAdmin store={store} onSave={handleSave} />}
            {activeSection === "news" && <NewsAdmin store={store} onSave={handleSave} />}
            {activeSection === "study" && <StudyMaterialAdmin store={store} onSave={handleSave} />}
            {activeSection === "scholarship" && <ScholarshipAdmin store={store} onSave={handleSave} />}
            {activeSection === "recognition" && <RecognitionAdmin store={store} onSave={handleSave} />}
            {activeSection === "content" && <ContentAdmin store={store} onSave={handleSave} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Sub-Components

function OfferImagesAdmin(_props: {
  store: ReturnType<typeof getStore>;
  onSave: (d: Record<string, unknown>) => void;
}) {
  const [images, setImages] = useState<string[]>(
    _props.store.offerImages
  );

  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const loadImages = async () => {
    try {
      setLoading(true);
      setStatus("");

      const response = await fetch("/api/site-settings");

      if (!response.ok) {
        throw new Error("Offer images load failed");
      }

      const data = await response.json();

      if (typeof data.offerImages === "string") {
        const parsed = JSON.parse(data.offerImages);

        if (Array.isArray(parsed)) {
          setImages(parsed);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus(
        "Online offer images load nahi ho pa rahi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const add = () => {
    const url = newUrl.trim();

    if (!url) {
      setStatus("Image URL enter karein.");
      return;
    }

    setImages([...images, url]);
    setNewUrl("");

    setStatus(
      "Image list me add ho gayi. Ab Save Changes dabayein."
    );
  };

  const remove = (index: number) => {
    setImages(
      images.filter((_, i) => i !== index)
    );

    setStatus(
      "Image remove ho gayi. Ab Save Changes dabayein."
    );
  };

  const saveImagesOnline = async () => {
    try {
      setSaving(true);
      setStatus("");

      const response = await fetch(
        "/api/site-settings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: "offerImages",
            value: JSON.stringify(images),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Offer images save failed");
      }

      setStatus(
        "Offer images online database me save ho gayi."
      );
    } catch (err) {
      console.error(err);
      setStatus(
        "Offer images save nahi hui."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-100 p-6">

      <h2 className="text-xl font-bold text-slate-900 mb-6">
        Offer Carousel Images
      </h2>

      {status && (
        <div className="mb-4 bg-slate-50 text-slate-700 px-4 py-3 rounded-xl text-sm">
          {status}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newUrl}
          onChange={(e) =>
            setNewUrl(e.target.value)
          }
          placeholder="Enter image URL"
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
        />

        <button
          onClick={add}
          className="pill-btn-primary"
        >
          <Plus size={18} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 mb-6">
          Loading offer images...
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {images.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative rounded-xl overflow-hidden card-shadow group bg-slate-50"
            >
              <img
                src={url}
                alt={`Offer ${i + 1}`}
                className="w-full h-40 object-contain"
              />

              <button
                onClick={() => remove(i)}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={saveImagesOnline}
        disabled={saving}
        className="pill-btn-primary"
      >
        <Save size={16} className="mr-2" />
        {saving ? "Saving..." : "Save Changes"}
      </button>

      <p className="text-sm text-green-600 mt-3">
        Offer images online database me save hongi.
      </p>

    </div>
  );
}
function InstagramImagesAdmin({ store, onSave }: { store: ReturnType<typeof getStore>; onSave: (d: Record<string, unknown>) => void }) {
  const [images, setImages] = useState<string[]>(store.instagramImages);
  const [newUrl, setNewUrl] = useState("");

  const add = () => { if (!newUrl.trim()) return; setImages([...images, newUrl]); setNewUrl(""); };
  const remove = (i: number) => setImages(images.filter((_, idx) => idx !== i));

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-100 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Instagram Carousel Images</h2>
      <div className="flex gap-2 mb-6">
        <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Enter image URL" className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
        <button onClick={add} className="pill-btn-primary"><Plus size={18} /></button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {images.map((url, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden card-shadow group aspect-square">
            <img src={url} alt={`Insta ${i + 1}`} className="w-full h-full object-cover" />
            <button onClick={() => remove(i)} className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button onClick={() => onSave({ instagramImages: images })} className="pill-btn-primary"><Save size={16} className="mr-2" /> Save Changes</button>
    </div>
  );
}

function CoursesAdmin(_props: {
  store: ReturnType<typeof getStore>;
  onSave: (d: Record<string, unknown>) => void;
}) {
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

  const [courses, setCourses] = useState<Course[]>(
    _props.store.courses
  );

  const [editing, setEditing] = useState<string | null>(
    null
  );

  const [editForm, setEditForm] = useState<
    Record<string, string>
  >({});

  const [showAdd, setShowAdd] = useState(false);

  const [newCourse, setNewCourse] = useState<Course>({
    id: "",
    name: "",
    fullName: "",
    description: "",
    duration: "",
    eligibility: "",
    category: "vocational",
    icon: "GraduationCap",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const loadCourses = async () => {
    try {
      setLoading(true);
      setStatus("");

      const response = await fetch("/api/site-settings");

      if (!response.ok) {
        throw new Error("Courses load failed");
      }

      const data = await response.json();

      if (typeof data.courses === "string") {
        const parsed = JSON.parse(data.courses);

        if (Array.isArray(parsed)) {
          setCourses(parsed);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("Online courses load nahi ho pa rahe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const startEdit = (course: Course) => {
    setEditing(course.id);
    setEditForm({ ...course });
  };

  const saveEdit = () => {
    setCourses(
      courses.map((course) =>
        course.id === editing
          ? {
              ...course,
              ...editForm,
            }
          : course
      )
    );

    setEditing(null);
  };

  const remove = (id: string) => {
    setCourses(
      courses.filter((course) => course.id !== id)
    );
  };

  const addCourse = () => {
    if (
      !newCourse.id.trim() ||
      !newCourse.name.trim()
    ) {
      setStatus("Course ID aur Short Name required hai.");
      return;
    }

    const alreadyExists = courses.some(
      (course) => course.id === newCourse.id
    );

    if (alreadyExists) {
      setStatus("Ye Course ID pehle se use ho rahi hai.");
      return;
    }

    setCourses([...courses, { ...newCourse }]);

    setNewCourse({
      id: "",
      name: "",
      fullName: "",
      description: "",
      duration: "",
      eligibility: "",
      category: "vocational",
      icon: "GraduationCap",
    });

    setShowAdd(false);
    setStatus(
      "Course list me add ho gaya. Ab Save Changes dabayein."
    );
  };

  const saveCoursesOnline = async () => {
    try {
      setSaving(true);
      setStatus("");

      const response = await fetch("/api/site-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "courses",
          value: JSON.stringify(courses),
        }),
      });

      if (!response.ok) {
        throw new Error("Courses save failed");
      }

      setStatus(
        "Courses online database me save ho gaye."
      );
    } catch (err) {
      console.error(err);
      setStatus("Courses save nahi hue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          Manage Courses
        </h2>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="pill-btn-primary text-xs"
        >
          <Plus size={14} className="mr-1" />
          {showAdd ? "Cancel" : "Add Course"}
        </button>
      </div>

      {status && (
        <div className="mb-4 bg-slate-50 text-slate-700 px-4 py-3 rounded-xl text-sm">
          {status}
        </div>
      )}

      {showAdd && (
        <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm">
            Add New Course
          </h3>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={newCourse.id}
              onChange={(e) =>
                setNewCourse({
                  ...newCourse,
                  id: e.target.value,
                })
              }
              placeholder="Course ID (unique)"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />

            <input
              value={newCourse.name}
              onChange={(e) =>
                setNewCourse({
                  ...newCourse,
                  name: e.target.value,
                })
              }
              placeholder="Short Name (e.g. BCA)"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />

            <input
              value={newCourse.fullName}
              onChange={(e) =>
                setNewCourse({
                  ...newCourse,
                  fullName: e.target.value,
                })
              }
              placeholder="Full Name"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />

            <input
              value={newCourse.duration}
              onChange={(e) =>
                setNewCourse({
                  ...newCourse,
                  duration: e.target.value,
                })
              }
              placeholder="Duration (e.g. 1 Year)"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />

            <input
              value={newCourse.eligibility}
              onChange={(e) =>
                setNewCourse({
                  ...newCourse,
                  eligibility: e.target.value,
                })
              }
              placeholder="Eligibility"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />

            <select
              value={newCourse.category}
              onChange={(e) =>
                setNewCourse({
                  ...newCourse,
                  category: e.target.value,
                })
              }
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <option value="vocational">
                Vocational
              </option>

              <option value="skill">
                Skill
              </option>

              <option value="university">
                University
              </option>
            </select>
          </div>

          <textarea
            value={newCourse.description}
            onChange={(e) =>
              setNewCourse({
                ...newCourse,
                description: e.target.value,
              })
            }
            placeholder="Description"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none"
            rows={3}
          />

          <button
            onClick={addCourse}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            Add Course
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 mb-6">
          Loading courses...
        </p>
      ) : (
        <div className="space-y-4 mb-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="border border-slate-100 rounded-xl p-4"
            >
              {editing === course.id ? (
                <div className="space-y-3">
                  <input
                    value={editForm.name || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="Name"
                  />

                  <input
                    value={editForm.fullName || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        fullName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="Full Name"
                  />

                  <input
                    value={editForm.duration || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        duration: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="Duration"
                  />

                  <input
                    value={editForm.eligibility || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        eligibility: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="Eligibility"
                  />

                  <select
                    value={editForm.category || "vocational"}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  >
                    <option value="vocational">
                      Vocational
                    </option>
                    <option value="skill">Skill</option>
                    <option value="university">
                      University
                    </option>
                  </select>

                  <textarea
                    value={editForm.description || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none"
                    rows={3}
                    placeholder="Description"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                    >
                      Save
                    </button>

                    <button
                      onClick={() => setEditing(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">
                      {course.name}
                    </h4>

                    <p className="text-sm text-slate-500">
                      {course.fullName} • {course.duration}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(course)}
                      className="px-3 py-1.5 bg-primary-light text-primary rounded-lg text-xs font-medium"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => remove(course.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={saveCoursesOnline}
        disabled={saving}
        className="pill-btn-primary"
      >
        <Save size={16} className="mr-2" />
        {saving ? "Saving..." : "Save Changes"}
      </button>

      <p className="text-sm text-green-600 mt-3">
        Courses online database me save honge.
      </p>
    </div>
  );
}

function PopupAdmin({ store, onSave }: { store: ReturnType<typeof getStore>; onSave: (d: Record<string, unknown>) => void }) {
  const [enabled, setEnabled] = useState(store.popupEnabled);

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-100 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Popup Ad Settings</h2>
      <div className="mb-6">
        <img src="https://i.ibb.co/FR4TBgy/Chat-GPT-Image-Jun-10-2026-04-34-22-PM.png" alt="Popup" className="w-full max-w-sm rounded-xl card-shadow" />
      </div>
      <label className="flex items-center gap-3 mb-6">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
        />
        <span className="text-slate-700 font-medium">Enable Popup Ad</span>
      </label>
      <button onClick={() => onSave({ popupEnabled: enabled })} className="pill-btn-primary"><Save size={16} className="mr-2" /> Save Changes</button>
    </div>
  );
}

function NewsAdmin(_props: {
  store: ReturnType<typeof getStore>;
  onSave: (d: Record<string, unknown>) => void;
}) {
  type NewsItem = {
    id: number;
    title: string;
    content: string;
    date: string;
  };

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newItem, setNewItem] = useState({
    title: "",
    content: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadNews = async () => {
    try {
      setError("");

      const response = await fetch("/api/news");

      if (!response.ok) {
        throw new Error("News load failed");
      }

      const data = await response.json();

      setNews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("News load nahi ho pa rahi.");
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const add = async () => {
    if (
      !newItem.title.trim() ||
      !newItem.content.trim() ||
      !newItem.date
    ) {
      setError("Title, content aur date required hai.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        throw new Error("News save failed");
      }

      setNewItem({
        title: "",
        content: "",
        date: new Date().toISOString().split("T")[0],
      });

      await loadNews();
    } catch (err) {
      console.error(err);
      setError("News save nahi hui.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    try {
      setError("");

      const response = await fetch(`/api/news/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      await loadNews();
    } catch (err) {
      console.error(err);
      setError("News delete nahi hui.");
    }
  };

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-100 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">
        Manage News
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-6 bg-slate-50 rounded-xl p-4">
        <input
          value={newItem.title}
          onChange={(e) =>
            setNewItem({
              ...newItem,
              title: e.target.value,
            })
          }
          placeholder="News title"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />

        <textarea
          value={newItem.content}
          onChange={(e) =>
            setNewItem({
              ...newItem,
              content: e.target.value,
            })
          }
          placeholder="News content"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none"
          rows={3}
        />

        <input
          type="date"
          value={newItem.date}
          onChange={(e) =>
            setNewItem({
              ...newItem,
              date: e.target.value,
            })
          }
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />

        <button
          onClick={add}
          disabled={loading}
          className="pill-btn-primary text-xs"
        >
          <Plus size={14} className="mr-1" />
          {loading ? "Saving..." : "Add News"}
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {news.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border border-slate-100 rounded-xl p-3"
          >
            <div>
              <p className="font-medium text-slate-900 text-sm">
                {item.title}
              </p>

              <p className="text-xs text-slate-500">
                {item.date}
              </p>
            </div>

            <button
              onClick={() => remove(item.id)}
              className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <p className="text-sm text-green-600">
        News automatically online database me save hoti hai.
      </p>
    </div>
  );
}
function StudyMaterialAdmin(_props: {
  store: ReturnType<typeof getStore>;
  onSave: (d: Record<string, unknown>) => void;
}) {
  type Doc = {
    id?: number;
    type?: string;
    name: string;
    url: string;
  };

  const [activeTab, setActiveTab] = useState("notes");
  const [notes, setNotes] = useState<Doc[]>([]);
  const [syllabus, setSyllabus] = useState<Doc[]>([]);
  const [papers, setPapers] = useState<Doc[]>([]);
  const [newDoc, setNewDoc] = useState({ name: "", url: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDocuments = async () => {
    try {
      setError("");

      const [notesResponse, syllabusResponse, papersResponse] =
        await Promise.all([
          fetch("/api/notes"),
          fetch("/api/study-documents?type=syllabus"),
          fetch("/api/study-documents?type=previous-papers"),
        ]);

      if (
        !notesResponse.ok ||
        !syllabusResponse.ok ||
        !papersResponse.ok
      ) {
        throw new Error("Study material load failed");
      }

      const [notesData, syllabusData, papersData] =
        await Promise.all([
          notesResponse.json(),
          syllabusResponse.json(),
          papersResponse.json(),
        ]);

      setNotes(Array.isArray(notesData) ? notesData : []);
      setSyllabus(Array.isArray(syllabusData) ? syllabusData : []);
      setPapers(Array.isArray(papersData) ? papersData : []);
    } catch (err) {
      console.error(err);
      setError("Study material load nahi ho pa raha.");
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const getData = (): Doc[] => {
    if (activeTab === "notes") return notes;
    if (activeTab === "syllabus") return syllabus;
    return papers;
  };

  const add = async () => {
    if (!newDoc.name.trim() || !newDoc.url.trim()) return;

    try {
      setLoading(true);
      setError("");

      let response: Response;

      if (activeTab === "notes") {
        response = await fetch("/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newDoc),
        });
      } else {
        response = await fetch("/api/study-documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: activeTab,
            name: newDoc.name,
            url: newDoc.url,
          }),
        });
      }

      if (!response.ok) {
        throw new Error("Save failed");
      }

      setNewDoc({ name: "", url: "" });
      await loadDocuments();
    } catch (err) {
      console.error(err);
      setError("Document save nahi hua.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (doc: Doc) => {
    if (!doc.id) return;

    try {
      setError("");

      const endpoint =
        activeTab === "notes"
          ? `/api/notes/${doc.id}`
          : `/api/study-documents/${doc.id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      await loadDocuments();
    } catch (err) {
      console.error(err);
      setError("Document delete nahi hua.");
    }
  };

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-100 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">
        Manage Study Material
      </h2>

      <div className="flex flex-wrap gap-2 mb-6">
        {["notes", "syllabus", "previous-papers"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold ${
              activeTab === tab
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {tab === "previous-papers"
              ? "Previous Papers"
              : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={newDoc.name}
          onChange={(e) =>
            setNewDoc({ ...newDoc, name: e.target.value })
          }
          placeholder="Document name"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />

        <input
          value={newDoc.url}
          onChange={(e) =>
            setNewDoc({ ...newDoc, url: e.target.value })
          }
          placeholder="Google Drive / PDF URL"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />

        <button
          onClick={add}
          disabled={loading}
          className="pill-btn-primary text-xs"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="space-y-2 mb-6">
        {getData().map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between border border-slate-100 rounded-xl p-3"
          >
            <span className="text-sm text-slate-700">
              {doc.name}
            </span>

            <button
              onClick={() => remove(doc)}
              className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <p className="text-sm text-green-600">
        {activeTab === "notes"
          ? "Notes online database me save hote hain."
          : activeTab === "syllabus"
          ? "Syllabus online database me save hota hai."
          : "Previous Papers online database me save hote hain."}
      </p>
    </div>
  );
}
function ScholarshipAdmin({ store, onSave }: { store: ReturnType<typeof getStore>; onSave: (d: Record<string, unknown>) => void }) {
  const [content, setContent] = useState(store.scholarshipContent);
  const [endDate, setEndDate] = useState(store.scholarshipEndDate);

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-100 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Scholarship Settings</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Scholarship End Date</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Scholarship Content</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none" />
      </div>
      <button onClick={() => onSave({ scholarshipContent: content, scholarshipEndDate: endDate })} className="pill-btn-primary"><Save size={16} className="mr-2" /> Save Changes</button>
    </div>
  );
}

function RecognitionAdmin(_props: {
  store: ReturnType<typeof getStore>;
  onSave: (d: Record<string, unknown>) => void;
}) {
  type RecognitionDoc = {
    id: number;
    name: string;
    url: string;
  };

  const [docs, setDocs] = useState<RecognitionDoc[]>([]);
  const [newDoc, setNewDoc] = useState({
    name: "",
    url: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDocs = async () => {
    try {
      setError("");

      const response = await fetch("/api/recognition-documents");

      if (!response.ok) {
        throw new Error("Documents load failed");
      }

      const data = await response.json();

      setDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Recognition documents load nahi ho rahe.");
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const add = async () => {
    if (!newDoc.name.trim() || !newDoc.url.trim()) {
      setError("Document name aur URL required hai.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/recognition-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDoc),
      });

      if (!response.ok) {
        throw new Error("Document save failed");
      }

      setNewDoc({
        name: "",
        url: "",
      });

      await loadDocs();
    } catch (err) {
      console.error(err);
      setError("Recognition document save nahi hua.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    try {
      setError("");

      const response = await fetch(
        `/api/recognition-documents/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      await loadDocs();
    } catch (err) {
      console.error(err);
      setError("Document delete nahi hua.");
    }
  };

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-100 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Recognition Documents
      </h2>

      <p className="text-sm text-slate-500 mb-6">
        Image ya PDF/Google Drive document ka link add karein.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={newDoc.name}
          onChange={(e) =>
            setNewDoc({
              ...newDoc,
              name: e.target.value,
            })
          }
          placeholder="Document name"
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
        />

        <input
          type="text"
          value={newDoc.url}
          onChange={(e) =>
            setNewDoc({
              ...newDoc,
              url: e.target.value,
            })
          }
          placeholder="Image / PDF / Google Drive URL"
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
        />

        <button
          onClick={add}
          disabled={loading}
          className="pill-btn-primary"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between border border-slate-100 rounded-xl p-4"
          >
            <div className="min-w-0 pr-3">
              <p className="font-medium text-slate-900 text-sm">
                {doc.name}
              </p>

              <p className="text-xs text-slate-500 truncate">
                {doc.url}
              </p>
            </div>

            <button
              onClick={() => remove(doc.id)}
              className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {docs.length === 0 && (
        <div className="bg-slate-50 rounded-xl p-8 text-center mb-6">
          <Award
            size={40}
            className="mx-auto text-slate-300 mb-2"
          />

          <p className="text-slate-500 text-sm">
            No recognition documents uploaded yet.
          </p>
        </div>
      )}

      <p className="text-sm text-green-600">
        Recognition documents automatically online database me save hote hain.
      </p>
    </div>
  );
}
function ContentAdmin({ store, onSave }: { store: ReturnType<typeof getStore>; onSave: (d: Record<string, unknown>) => void }) {
  const [about, setAbout] = useState(store.aboutContent);
  const [vision, setVision] = useState(store.visionContent);
  const [visionPoints, setVisionPoints] = useState<string[]>(store.visionPoints);
  const [directorMsg, setDirectorMsg] = useState(store.directorMessage);
  const [coDirectorMsg, setCoDirectorMsg] = useState(store.coDirectorMessage);
  const [directorName, setDirectorName] = useState(store.directorName);
  const [directorLocation, setDirectorLocation] = useState(store.directorLocation);
  const [coDirectorName, setCoDirectorName] = useState(store.coDirectorName);
  const [coDirectorLocation, setCoDirectorLocation] = useState(store.coDirectorLocation);
  const [newPoint, setNewPoint] = useState("");
  const [contentSaving, setContentSaving] = useState(false);
  const [contentStatus, setContentStatus] = useState("");

  useEffect(() => {
    fetch("/api/site-settings")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Settings load failed");
        }

        return response.json();
      })
      .then((data) => {
        if (typeof data.aboutContent === "string") {
          setAbout(data.aboutContent);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const savePageContent = async () => {
    try {
      setContentSaving(true);
      setContentStatus("");

      const response = await fetch("/api/site-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "aboutContent",
          value: about,
        }),
      });

      if (!response.ok) {
        throw new Error("About save failed");
      }

      onSave({
        aboutContent: about,
        visionContent: vision,
        visionPoints,
        directorMessage: directorMsg,
        coDirectorMessage: coDirectorMsg,
        directorName,
        directorLocation,
        coDirectorName,
        coDirectorLocation,
      });

      setContentStatus("Saved successfully.");
    } catch (err) {
      console.error(err);
      setContentStatus("About Institute save nahi hua.");
    } finally {
      setContentSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-100 p-6 space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Page Content</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">About Institute</label>
        <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Vision Statement</label>
        <textarea value={vision} onChange={(e) => setVision(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Vision Points</label>
        <div className="flex gap-2 mb-3">
          <input value={newPoint} onChange={(e) => setNewPoint(e.target.value)} placeholder="Add new point" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          <button onClick={() => { if (newPoint.trim()) { setVisionPoints([...visionPoints, newPoint]); setNewPoint(""); } }} className="pill-btn-primary text-xs"><Plus size={14} /></button>
        </div>
        <div className="space-y-2">
          {visionPoints.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-sm text-slate-700">{p}</span>
              <button onClick={() => setVisionPoints(visionPoints.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><X size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="font-bold text-slate-900 mb-4">Director's Information</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Director Name</label>
            <input value={directorName} onChange={(e) => setDirectorName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Director Location</label>
            <input value={directorLocation} onChange={(e) => setDirectorLocation(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
          </div>
        </div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Director's Message</label>
        <textarea value={directorMsg} onChange={(e) => setDirectorMsg(e.target.value)} rows={5} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none" />
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="font-bold text-slate-900 mb-4">Co-Director's Information</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Co-Director Name</label>
            <input value={coDirectorName} onChange={(e) => setCoDirectorName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Co-Director Location</label>
            <input value={coDirectorLocation} onChange={(e) => setCoDirectorLocation(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
          </div>
        </div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Co-Director's Message</label>
        <textarea value={coDirectorMsg} onChange={(e) => setCoDirectorMsg(e.target.value)} rows={5} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none" />
      </div>

      {contentStatus && (
  <p className="text-sm text-green-600">
    {contentStatus}
  </p>
)}

<button
  onClick={savePageContent}
  disabled={contentSaving}
  className="pill-btn-primary"
>
  <Save size={16} className="mr-2" />
  {contentSaving ? "Saving..." : "Save Changes"}
</button>
    </div>
  );
}
