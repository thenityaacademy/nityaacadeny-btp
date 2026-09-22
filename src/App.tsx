import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopBar from "./components/TopBar";
import Header from "./components/Header";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import PopupAd from "./components/PopupAd";
import Home from "./pages/Home";
import About from "./pages/About";
import DirectorMessage from "./pages/DirectorMessage";
import Vision from "./pages/Vision";
import Recognition from "./pages/Recognition";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Admission from "./pages/Admission";
import Scholarship from "./pages/Scholarship";
import StudyMaterial from "./pages/StudyMaterial";
import News from "./pages/News";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <PopupAd />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/about"
          element={
            <Layout>
              <About />
            </Layout>
          }
        />
        <Route
          path="/director-message"
          element={
            <Layout>
              <DirectorMessage />
            </Layout>
          }
        />
        <Route
          path="/vision"
          element={
            <Layout>
              <Vision />
            </Layout>
          }
        />
        <Route
          path="/recognition"
          element={
            <Layout>
              <Recognition />
            </Layout>
          }
        />
        <Route
          path="/courses"
          element={
            <Layout>
              <Courses />
            </Layout>
          }
        />
        <Route
          path="/course/:id"
          element={
            <Layout>
              <CourseDetail />
            </Layout>
          }
        />
        <Route
          path="/admission"
          element={
            <Layout>
              <Admission />
            </Layout>
          }
        />
        <Route
          path="/scholarship"
          element={
            <Layout>
              <Scholarship />
            </Layout>
          }
        />
        <Route
          path="/study-material"
          element={
            <Layout>
              <StudyMaterial />
            </Layout>
          }
        />
        <Route
          path="/news"
          element={
            <Layout>
              <News />
            </Layout>
          }
        />
        <Route
          path="/contact"
          element={
            <Layout>
              <Contact />
            </Layout>
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route
  path="*"
  element={
    <Layout>
      <NotFound />
    </Layout>
  }
/>
      </Routes>
    </BrowserRouter>
  );
}
