// Nitya Academy - LocalStorage Data Store
// Simulates admin-editable content

const DEFAULTS = {
  aboutContent: `Nitya Academy is a premier educational institution dedicated to shaping the future of students through quality education and skill development. Established with a vision to provide accessible and affordable education, we offer a wide range of vocational, skill-based, and university-affiliated courses.

Our institute is committed to academic excellence, practical training, and holistic development. With experienced faculty, modern infrastructure, and industry-relevant curriculum, we prepare students for real-world challenges and opportunities.

Located in the heart of Bharatpur, Nitya Academy has become a trusted name in education, helping thousands of students achieve their career goals.`,

  visionContent: `To become a leading educational institution that empowers students with knowledge, skills, and values to excel in their chosen fields and contribute meaningfully to society.

We envision a future where every student, regardless of background, has access to quality education that opens doors to limitless opportunities.`,

  visionPoints: [
    "Provide world-class education at affordable prices",
    "Foster innovation and critical thinking",
    "Build industry-ready professionals",
    "Create a supportive learning environment",
    "Promote lifelong learning and growth"
  ],

  directorMessage: `Dear Students and Parents,

Welcome to Nitya Academy! It is my privilege to lead an institution that is committed to transforming lives through education. Our mission is to provide every student with the tools, knowledge, and confidence they need to succeed in today's competitive world.

At Nitya Academy, we believe that education is not just about acquiring degrees but about developing character, skills, and a passion for lifelong learning. Our dedicated faculty and staff work tirelessly to create an environment where students can thrive academically and personally.

I invite you to join us on this journey of discovery and growth. Together, we will build a brighter future.

With warm regards,`,

  directorName: "Vikram Verma",
  directorLocation: "Bhadra, Hanumangarh",

  coDirectorMessage: `Dear Students,

As Co-Director of Nitya Academy, I am proud to be part of an institution that puts students first. Our focus on practical learning, industry connections, and personal development sets us apart.

We are constantly evolving our curriculum and teaching methods to meet the demands of the modern world. Whether you are pursuing a vocational course, a skill program, or a university degree, you will find the support and guidance you need here.

I look forward to welcoming you to our campus and helping you achieve your dreams.

Best wishes,`,

  coDirectorName: "Sunil Marwal",
  coDirectorLocation: "Bhadra, Hanumangarh",

  scholarshipContent: `Nitya Academy ECCE Scholarship Scheme

Merit-Based Scholarship Table:
• 90% and above: 50% fee waiver
• 80% - 89%: 30% fee waiver
• 70% - 79%: 20% fee waiver
• 60% - 69%: 10% fee waiver

Eligibility Criteria:
1. Must have passed the previous examination with minimum 60% marks
2. Must be enrolled in ECCE or related course
3. Family income should be below Rs. 3,00,000 per annum
4. Attendance must be 75% or above
5. No disciplinary actions against the student

Special scholarships are also available for:
• SC/ST/OBC candidates as per government norms
• Physically challenged students
• Single girl child
• Wards of defense personnel

Apply before the deadline to avail these benefits.`,

  scholarshipEndDate: "2026-12-31",
  popupEnabled: true,

  offerImages: [
    "https://i.ibb.co/PGSBSRDB/image-2.png",
    "https://i.ibb.co/208GKbyy/Firefly-gpt-image-A-professional-wide-educational-banner-1920x550-pixels-landscape-format-Deep-ro.png",
    "https://i.ibb.co/k61dsnKT/the-image-1.png",
    "https://i.ibb.co/ZRRXMtcg/image-5.png",
    "https://i.ibb.co/GQX9JZXs/image-6.png"
  ],

  instagramImages: [
    "https://i.ibb.co/Nn9PdvxZ/aaa1.png",
    "https://i.ibb.co/b5x8sYr8/aaaa2.png",
    "https://i.ibb.co/FLd0QP2R/aaa3.png",
    "https://i.ibb.co/FbLMtDWy/aaaa4.png",
    "https://i.ibb.co/WpqfRw2B/aaaa5.png"
  ],

  courses: [
    {
      id: "ecce",
      category: "vocational",
      name: "ECCE",
      fullName: "Early Childhood Care and Education",
      description: "A comprehensive program designed to train educators in early childhood development, teaching methodologies, and child psychology.",
      duration: "1 Year",
      eligibility: "10+2 Pass",
      icon: "Baby"
    },
    {
      id: "dca",
      category: "vocational",
      name: "DCA",
      fullName: "Diploma in Computer Applications",
      description: "Learn fundamental computer applications including MS Office, programming basics, and internet technologies.",
      duration: "6 Months",
      eligibility: "10th Pass",
      icon: "Monitor"
    },
    {
      id: "yoga",
      category: "skill",
      name: "Yoga",
      fullName: "Certified Yoga Instructor Program",
      description: "Professional yoga training covering asanas, pranayama, meditation, and teaching techniques for a healthy lifestyle.",
      duration: "3 Months",
      eligibility: "Open to All",
      icon: "Heart"
    },
    {
      id: "fire-safety",
      category: "skill",
      name: "Fire & Safety",
      fullName: "Fire Safety and Disaster Management",
      description: "Comprehensive training in fire prevention, safety protocols, emergency response, and disaster management.",
      duration: "6 Months",
      eligibility: "10th Pass",
      icon: "Shield"
    },
    {
      id: "pgdca",
      category: "university",
      name: "PGDCA",
      fullName: "Post Graduate Diploma in Computer Applications",
      description: "Advanced diploma in computer applications covering programming, database management, and software development.",
      duration: "1 Year",
      eligibility: "Graduation",
      icon: "GraduationCap"
    },
    {
      id: "c-lib",
      category: "university",
      name: "C.LIB",
      fullName: "Certificate in Library Science",
      description: "Professional certification in library management, cataloging, classification, and information science.",
      duration: "6 Months",
      eligibility: "10+2 Pass",
      icon: "BookOpen"
    },
    {
      id: "b-lib",
      category: "university",
      name: "B.LIB",
      fullName: "Bachelor of Library Science",
      description: "Undergraduate degree program in library and information science with practical training.",
      duration: "1 Year",
      eligibility: "Graduation",
      icon: "Library"
    },
    {
      id: "ba",
      category: "university",
      name: "BA",
      fullName: "Bachelor of Arts",
      description: "Three-year undergraduate program in arts with multiple specialization options.",
      duration: "3 Years",
      eligibility: "10+2 Pass",
      icon: "PenTool"
    },
    {
      id: "bsc",
      category: "university",
      name: "BSC",
      fullName: "Bachelor of Science",
      description: "Three-year undergraduate science program with practical laboratory training.",
      duration: "3 Years",
      eligibility: "10+2 with Science",
      icon: "FlaskConical"
    },
    {
      id: "bca",
      category: "university",
      name: "BCA",
      fullName: "Bachelor of Computer Applications",
      description: "Three-year professional degree in computer applications and software development.",
      duration: "3 Years",
      eligibility: "10+2 Pass",
      icon: "Code"
    },
    {
      id: "ma",
      category: "university",
      name: "MA",
      fullName: "Master of Arts",
      description: "Two-year postgraduate program in arts with advanced specialization.",
      duration: "2 Years",
      eligibility: "Graduation",
      icon: "ScrollText"
    },
    {
      id: "msc",
      category: "university",
      name: "MSC",
      fullName: "Master of Science",
      description: "Two-year postgraduate science program with research-oriented curriculum.",
      duration: "2 Years",
      eligibility: "B.Sc. Degree",
      icon: "Microscope"
    }
  ],

  news: [
    {
      id: "1",
      title: "Admissions Open for Academic Year 2026-27",
      content: "Nitya Academy is pleased to announce that admissions are now open for all courses for the academic year 2026-27. Early bird discounts available for first 50 applicants. Visit our campus or apply online today.",
      date: "2026-06-01"
    },
    {
      id: "2",
      title: "New Yoga Batch Starting July 1st",
      content: "We are launching a new Yoga instructor certification batch starting July 1st, 2026. Limited seats available. Register now to secure your spot in this transformative program.",
      date: "2026-06-05"
    },
    {
      id: "3",
      title: "Scholarship Results Announced",
      content: "The merit-based scholarship results for ECCE and DCA courses have been announced. Selected students will receive up to 50% fee waiver. Check the notice board or contact the office for details.",
      date: "2026-06-08"
    }
  ],

  notes: [],
  syllabus: [],
  previousPapers: [],
  recognitionDocs: []
};

function getStore() {
  try {
    const stored = localStorage.getItem("nitya_academy_store");
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULTS };
}

function setStore(data: Partial<typeof DEFAULTS>) {
  const current = getStore();
  const updated = { ...current, ...data };
  localStorage.setItem("nitya_academy_store", JSON.stringify(updated));
  return updated;
}

export { DEFAULTS, getStore, setStore };
