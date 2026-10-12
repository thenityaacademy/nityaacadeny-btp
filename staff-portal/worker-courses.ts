/**
 * Courses displayed in Staff Admission are sourced from the website's existing
 * admin-managed site_settings.courses JSON. Staff overrides (on/off, fee, PDF logo)
 * are stored separately in staff_courses; never mutate public course content.
 */
export type StaffCourse = {
  id: string;
  name: string;
  category: string;
  active: boolean;
  defaultFee: number | null;
  hasLogo: boolean;
  logoActive: boolean;
};
type CourseEnv = { DB: D1Database };
const knownCategories = new Set(["vocational", "skill", "university"]);
export async function listStaffCourses(env: CourseEnv): Promise<StaffCourse[]> {
  const [site, overrides] = await Promise.all([
    env.DB.prepare("SELECT value FROM site_settings WHERE key = 'courses'").first<{value:string}>(),
    env.DB.prepare("SELECT course_id, active, default_fee, extra_logo_drive_id, extra_logo_active FROM staff_courses").all<{
      course_id:string;active:number;default_fee:number|null;extra_logo_drive_id:string|null;extra_logo_active:number
    }>()
  ]);
  let entries: unknown = [];
  try { entries = JSON.parse(site?.value || "[]"); } catch { entries = []; }
  if (!Array.isArray(entries)) return [];
  const byId = new Map(overrides.results.map(row => [row.course_id, row]));
  const used = new Set<string>();
  return entries.flatMap(value => {
    if (!value || typeof value !== "object") return [];
    const raw=value as Record<string, unknown>;
    if (typeof raw.id !== "string" || typeof raw.name !== "string") return [];
    const id=raw.id.trim(),name=raw.name.trim();
    if (!id || !name || id.length>80 || name.length>150 || used.has(id)) return [];
    used.add(id);
    const category=typeof raw.category === "string" && knownCategories.has(raw.category) ? raw.category : "other";
    const override=byId.get(id);
    return [{id,name,category,active:override ? override.active===1 : true,defaultFee:override?.default_fee ?? null,hasLogo:!!override?.extra_logo_drive_id,logoActive:override?.extra_logo_active===1 && !!override?.extra_logo_drive_id}];
  });
}
