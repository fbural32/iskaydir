// Adayın profiline göre Jooble'dan harici ilan çeker (yasal, resmi API).
// Gerekli secret: JOOBLE_API_KEY   (ücretsiz: https://jooble.org/api/about)
// İsteğe bağlı: JOOBLE_HOST (varsayılan tr.jooble.org)
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const stripHtml = (s = "") =>
  s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Giriş gerekli" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Giriş gerekli" }, 401);

    const body = await req.json().catch(() => ({}));
    const page = Number(body.page) || 1;

    const { data: cp } = await supabase
      .from("candidate_profiles").select("title, city, search_city, max_distance_km").eq("user_id", user.id).single();
    if (!cp?.title) return json({ jobs: [] });

    const key = Deno.env.get("JOOBLE_API_KEY");
    if (!key) return json({ jobs: [] });
    const host = Deno.env.get("JOOBLE_HOST") ?? "tr.jooble.org";

    const res = await fetch(`https://${host}/api/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: cp.title,
        location: cp.search_city ?? cp.city ?? "",
        // Jooble yarıçap değerleri: 0, 4, 8, 16, 26, 40, 80 km
        ...(cp.max_distance_km != null
          ? { radius: String([4, 8, 16, 26, 40, 80].find((r) => r >= cp.max_distance_km) ?? 80) }
          : {}),
        page: String(page),
      }),
    });
    if (!res.ok) return json({ jobs: [], error: `Jooble ${res.status}` });

    const data = await res.json();
    const jobs = (data.jobs ?? []).map((j: Record<string, string>) => ({
      id: `jooble-${j.id}`,
      external: true,
      source: "Jooble",
      title: stripHtml(j.title),
      company_name: j.company || "Şirket belirtilmemiş",
      city: j.location || "",
      salary_text: j.salary || null,
      description: stripHtml(j.snippet),
      link: j.link,
      updated: j.updated,
    }));
    return json({ jobs });
  } catch (e) {
    return json({ jobs: [], error: String(e) }, 500);
  }
});
