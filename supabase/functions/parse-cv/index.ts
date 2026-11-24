// CV'yi (PDF) okur, yapay zekâyla pozisyon/yetenek/şehir vb. çıkarır, aday profiline yazar.
// Gerekli secret: ANTHROPIC_API_KEY
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import DEPARTMENTS from "./departments.json" with { type: "json" };

const DEPT_NAMES: string[] = (DEPARTMENTS as { name: string }[]).map((d) => d.name);
const LEVELS = ["lise", "onlisans", "lisans", "yukseklisans", "doktora"];

const MODEL = Deno.env.get("CV_MODEL") ?? "claude-haiku-5-5";

const PROMPT = () => `Bu bir özgeçmiş (CV). Sadece aşağıdaki JSON'u döndür, başka hiçbir şey yazma:
{
  "full_name": "Ad Soyad",
  "phone": "telefon veya null",
  "title": "En son / ana pozisyonu, Türkçe, örn. 'Üretim Mühendisi'",
  "sector": "Sektör, örn. 'Gıda / FMCG'",
  "skills": ["en fazla 12 kısa yetenek, Türkçe, örn. 'Yalın Üretim', 'OEE', 'İSG'"],
  "experience_years": toplam iş deneyimi yılı (tam sayı),
  "education": "Mezun olduğu okul, örn. 'Ege Üniversitesi'",
  "education_level": "En yüksek eğitim seviyesi; şunlardan biri: lise, onlisans, lisans, yukseklisans, doktora",
  "department": "En yüksek dereceyi aldığı bölüm — AŞAĞIDAKİ LİSTEDEN birebir aynı yazımla seç; uymuyorsa 'Diğer'",
  "city": "Yaşadığı/çalıştığı şehir veya null",
  "summary": "Adayı işverene anlatan 2-3 cümlelik Türkçe özet. İsim, telefon, e-posta YAZMA."
}

Bölüm listesi:
${DEPT_NAMES.join("\n")}`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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

    const path = `${user.id}/cv.pdf`;
    const { data: file, error: dlErr } = await supabase.storage.from("cvs").download(path);
    if (dlErr || !file) return json({ error: "CV bulunamadı" }, 404);

    const pdf = encodeBase64(new Uint8Array(await file.arrayBuffer()));

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
            { type: "text", text: PROMPT() },
          ],
        }],
      }),
    });
    if (!aiRes.ok) return json({ error: "CV analiz edilemedi", detail: await aiRes.text() }, 502);

    const ai = await aiRes.json();
    const text: string = ai.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: "CV analiz edilemedi" }, 502);
    const cv = JSON.parse(match[0]);

    const profile = {
      user_id: user.id,
      title: cv.title ?? null,
      sector: cv.sector ?? null,
      skills: Array.isArray(cv.skills) ? cv.skills.slice(0, 12) : [],
      experience_years: Number.isFinite(cv.experience_years) ? Math.round(cv.experience_years) : null,
      education: cv.education ?? null,
      education_level: LEVELS.includes(cv.education_level) ? cv.education_level : null,
      department: DEPT_NAMES.includes(cv.department) ? cv.department : null,
      city: cv.city ?? null,
      summary: cv.summary ?? null,
      cv_path: path,
      updated_at: new Date().toISOString(),
    };
    const { error: upErr } = await supabase.from("candidate_profiles").upsert(profile);
    if (upErr) return json({ error: upErr.message }, 400);

    // Ad ve telefon profilde boşsa CV'den doldur
    const { data: me } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();
    const patch: Record<string, string> = {};
    if (!me?.full_name && cv.full_name) patch.full_name = cv.full_name;
    if (!me?.phone && cv.phone) patch.phone = cv.phone;
    if (Object.keys(patch).length) await supabase.from("profiles").update(patch).eq("id", user.id);

    return json({ profile });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
