export const colors = {
  primary: '#E8590C',      // turuncu — ana renk
  primaryDark: '#C2410C',
  ink: '#1C1917',
  muted: '#78716C',
  line: '#E7E5E4',
  bg: '#FAFAF9',
  card: '#FFFFFF',
  like: '#16A34A',
  pass: '#DC2626',
  chip: '#FFF1E6',
  chipText: '#9A3412',
};

export const BENEFITS = [
  'Servis',
  'Yemek',
  'Yemek kartı',
  'Yol ücreti',
  'Özel sağlık sigortası',
  'Prim',
  'Vardiya ücreti',
  'Bayram ikramiyesi',
  'Esnek çalışma',
  'Evden çalışma günü',
  'Eğitim desteği',
  'Konaklama',
];

export const WORK_MODES = [
  { value: 'ofis', label: 'İş yerinde' },
  { value: 'hibrit', label: 'Hibrit' },
  { value: 'uzaktan', label: 'Uzaktan' },
];

export const EMPLOYMENT_TYPES = [
  { value: 'tam', label: 'Tam zamanlı' },
  { value: 'yari', label: 'Yarı zamanlı' },
];

const tl = (n) => n.toLocaleString('tr-TR');

export function salaryText(min, max) {
  if (min && max) return `${tl(min)} – ${tl(max)} ₺`;
  if (min) return `${tl(min)} ₺ ve üzeri`;
  if (max) return `${tl(max)} ₺'ye kadar`;
  return 'Maaş görüşülür';
}

export const label = (list, value) => list.find((x) => x.value === value)?.label ?? value;

export const splitList = (text) =>
  (text || '').split(',').map((s) => s.trim()).filter(Boolean);
