import DEPARTMENTS from './departments.json';

export { DEPARTMENTS };

export const EDU_LEVELS = [
  { value: 'lise', label: 'Lise' },
  { value: 'onlisans', label: 'Ön lisans' },
  { value: 'lisans', label: 'Lisans' },
  { value: 'yukseklisans', label: 'Yüksek lisans' },
  { value: 'doktora', label: 'Doktora' },
];

export const eduLabel = (v) => EDU_LEVELS.find((e) => e.value === v)?.label ?? null;

/** Kartta gösterilecek kısa kriter metni: "Gıda Müh., Makine Müh. · Lisans+" */
export function criteriaText(job) {
  const depts = job.allowed_departments || [];
  const short = depts.map((d) => d.replace(' Mühendisliği', ' Müh.').replace(' (Ön lisans)', ' (ÖL)'));
  const parts = [];
  if (short.length) parts.push(short.length > 3 ? `${short.slice(0, 3).join(', ')} +${short.length - 3}` : short.join(', '));
  if (job.min_education) parts.push(`${eduLabel(job.min_education)}+`);
  return parts.length ? parts.join(' · ') : 'Tüm bölümler başvurabilir';
}

/** Aday neden uygun değil? (uyarı mesajı) */
export function ineligibleReason(job, candidate) {
  const depts = job.allowed_departments || [];
  const rank = (v) => EDU_LEVELS.findIndex((e) => e.value === v);
  if (depts.length && !depts.includes(candidate?.department)) {
    return `Bu ilana sadece şu bölümler başvurabilir:\n\n• ${depts.join('\n• ')}\n\nSenin bölümün: ${candidate?.department || 'belirtilmemiş'}`;
  }
  if (job.min_education && rank(candidate?.education_level) < rank(job.min_education)) {
    return `Bu ilan en az ${eduLabel(job.min_education)} mezunu istiyor.\n\nSenin eğitimin: ${eduLabel(candidate?.education_level) || 'belirtilmemiş'}`;
  }
  return 'Bu ilanın kriterlerini karşılamıyorsun.';
}
