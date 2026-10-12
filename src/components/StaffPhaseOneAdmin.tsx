import { useEffect, useState } from "react";
import { ShieldCheck, Users, FileText, Image, LockKeyhole, RefreshCw } from "lucide-react";

type Overview = {
  phase: "phase1";
  status: "read_only";
  staffAccounts: number;
  staffApplications: number;
  extraLogosActive: number;
  staffLoginEnabled: false;
  staffSubmissionsEnabled: false;
  googleDriveProductionEnabled: false;
};

export default function StaffPhaseOneAdmin({ view }: { view: "management" | "settings" }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/staff/phase1-overview", {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Could not load the protected Staff Portal status.");
      const info = await response.json() as Overview;
      if (info.phase !== "phase1" || info.status !== "read_only") {
        throw new Error("Unexpected Staff Portal release configuration.");
      }
      setData(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Staff Portal status unavailable.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  return <section className="space-y-5">
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            {view === "management" ? "Staff Management" : "Staff Portal Settings"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Phase 1 – Safe Admin Integration. Existing website features are unchanged.
          </p>
        </div>
        <button type="button" disabled={loading} onClick={() => void load()}
          className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:opacity-60">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-900 border border-blue-100">
        <ShieldCheck size={20} className="shrink-0" />
        <p><strong>Read-only release:</strong> Staff Login, account creation, Admission/Scholarship submissions,
          PDFs and Google Drive uploads are intentionally disabled on the live website until each phase is tested.</p>
      </div>
      {loading && <p role="status" className="mt-4 text-sm text-slate-600">Checking live database...</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {data && !loading && <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="border rounded-xl p-4">
          <Users size={20} className="text-blue-700 mb-2" />
          <p className="text-2xl font-bold">{data.staffAccounts}</p>
          <p className="text-sm text-slate-500">Existing Staff Accounts</p>
        </div>
        <div className="border rounded-xl p-4">
          <FileText size={20} className="text-blue-700 mb-2" />
          <p className="text-2xl font-bold">{data.staffApplications}</p>
          <p className="text-sm text-slate-500">Staff Form Records</p>
        </div>
        <div className="border rounded-xl p-4">
          <Image size={20} className="text-blue-700 mb-2" />
          <p className="text-2xl font-bold">{data.extraLogosActive}</p>
          <p className="text-sm text-slate-500">Active Extra PDF Logos</p>
        </div>
      </div>}
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
      <h3 className="font-semibold flex items-center gap-2">
        <LockKeyhole size={18} /> Upcoming activation
      </h3>
      <p className="text-sm text-slate-600 mt-2">
        Phase 2: protected Staff Login and account management.
        Phase 3: validated Admission/Scholarship forms.
        Phase 4: PDF generation, Drive upload and WhatsApp sharing.
        Each feature will require separate tests before activation.
      </p>
      <p className="text-sm text-slate-500 mt-3">
        This section does not update registration numbers, existing courses,
        image carousels, Study Material or scholarship settings.
      </p>
    </div>
  </section>;
}
