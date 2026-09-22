import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-7xl font-extrabold text-primary mb-4">
          404
        </h1>

        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          Page Not Found
        </h2>

        <p className="text-slate-500 mb-6">
          The page you are looking for does not exist.
        </p>

        <Link
          to="/"
          className="pill-btn-primary"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
