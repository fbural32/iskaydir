import * as Location from 'expo-location';

const labelOf = (a, fallback) => {
  if (!a) return { label: fallback, city: fallback };
  const il = a.region || a.city || fallback;
  const ilce = a.subregion || a.district || (a.city !== il ? a.city : null);
  return { label: ilce && ilce !== il ? `${ilce}, ${il}` : il, city: il };
};

/** Telefonun şu anki konumu → { lat, lng, label: 'Merkez, Bartın', city: 'Bartın' } */
export async function getCurrentPlace() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Konum izni verilmedi. Ayarlardan izin verebilir ya da şehri elle yazabilirsin.');
  const pos = (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }))
    || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  const { latitude: lat, longitude: lng } = pos.coords;
  let addr = null;
  try { [addr] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }); } catch { /* yok */ }
  return { lat, lng, ...labelOf(addr, 'Konumum') };
}

/** Yazılan yer adı → koordinat. örn. 'Bartın' veya 'Organize Sanayi, Manisa' */
export async function geocodePlace(text) {
  const q = (text || '').trim();
  if (!q) throw new Error('Bir şehir veya ilçe yaz.');
  const results = await Location.geocodeAsync(`${q}, Türkiye`);
  if (!results?.length) throw new Error(`"${q}" bulunamadı. İl veya ilçe adını kontrol et.`);
  const { latitude: lat, longitude: lng } = results[0];
  let addr = null;
  try { [addr] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }); } catch { /* yok */ }
  const parsed = labelOf(addr, q);
  return { lat, lng, label: q.includes(',') ? q : parsed.label || q, city: parsed.city || q };
}

export const distanceText = (km) => {
  if (km == null) return null;
  if (km < 1) return '1 km\'den yakın';
  return `${Math.round(km)} km uzakta`;
};
