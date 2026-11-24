# İşKaydır — Tinder tarzı iş bulma uygulaması (Android)

Expo (React Native) + Supabase. İki tip giriş: **İş arayan** ve **İşveren**.

- **İş arayan:** CV (PDF) yükler → yapay zekâ pozisyon/yetenek/şehir çıkarır → kendisine uygun ilanları kaydırır.
- **İşveren:** Şirketi bir kere tanımlar → ilan verir (1 foto zorunlu, haklar zorunlu, maaş isteğe bağlı) → adayları kaydırır.
- İki taraf da sağa kaydırınca **eşleşme** olur, sohbet açılır, iletişim bilgileri ve CV görünür hale gelir.
- **Konum + mesafe (Tinder gibi):** İş arayan konumunu (GPS veya yazdığı şehir/ilçe, örn. Bartın) ve en fazla mesafeyi (1–300 km ya da tüm Türkiye) seçer; sadece o çevredeki ilanları görür, kartta "4 km uzakta" yazar. Uzaktan çalışma ilanları isteğe bağlı eklenir. İşveren de aday destesini 10/25/50/100 km ile süzebilir.
- **Başvuru kriterleri:** İşveren ilanda hangi bölümlerin başvurabileceğini (örn. Gıda Müh., Makine Müh.) ve en az eğitim seviyesini seçer. Adayın bölümü CV'den otomatik çıkar. Uymayan ilan adaya gösterilmez; aday "uygun olmayanları da göster" derse ilan kırmızı "Kriterleri karşılamıyorsun" etiketiyle görünür ama sağa kaydıramaz (sunucu da reddeder). İşverenin aday destesine de sadece kriterlere uyan adaylar düşer.
- **Beğenenler (işveren):** İlanlarını beğenen tüm adaylar ad, bölüm, profil ve CV ile listelenir; tek tuşla eşleş/geç. Telefon ve e-posta eşleşince açılır.
- **Herkese açık şirket sayfası:** Adaylar ilandan şirket profiline geçip tüm açık ilanlarını görür (vergi no gizli).
- İşveren ilanı azsa deste **Jooble** resmi API'sinden gelen "harici ilanlar" ile dolar (sağa kaydırınca ilan sayfası açılır).

---

## 1) Supabase kurulumu (10 dk)

1. https://supabase.com → yeni proje aç (bölge: Frankfurt).
2. **SQL Editor** → `supabase/schema.sql` dosyasının tamamını yapıştır → **Run**. (Güncellemelerde aynı dosyayı tekrar çalıştırman yeterli, mevcut veriler silinmez.)
3. **Authentication → Sign In / Providers → Email**: test ederken "Confirm email" kapatılabilir.
4. **Project Settings → API**: `Project URL` ve `anon public` anahtarını al.
5. Proje klasöründe `.env.example` dosyasını `.env` olarak kopyala, bu iki değeri yaz.

### Edge function'lar (CV okuma + Jooble)

```bash
npm i -g supabase
supabase login
supabase link --project-ref PROJE-ID
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      # CV analizi için (console.anthropic.com)
supabase secrets set JOOBLE_API_KEY=...                # ücretsiz: https://jooble.org/api/about
supabase functions deploy parse-cv
supabase functions deploy jobs-feed
```

> Jooble anahtarı yoksa uygulama sadece işverenlerin girdiği ilanları gösterir, hata vermez.

## 2) Telefonda çalıştırma

```bash
npm install
npx expo start
```
Android telefona **Expo Go** kur, QR kodu okut.

## 3) Play Store için derleme

```bash
npm i -g eas-cli
eas login
eas build -p android --profile preview      # test için APK (telefona direkt kurulur)
eas build -p android --profile production   # Play Store için .aab
eas submit -p android                       # Play Console'a yükler (iç test kanalı)
```

Play Console'da ayrıca gerekenler: **gizlilik politikası URL'si**, **veri güvenliği formu** (CV, ad, telefon, e-posta toplanıyor), uygulama ikonu ve ekran görüntüleri.

---

## Klasör yapısı

```
src/app/
  (tabs) klasörleri → alt sekmeler; diğerleri sekmesiz sayfalar
  index.js              → giriş kapısı (role göre yönlendirir)
  hosgeldin.js          → "İş arıyorum / İşvereniyim"
  giris.js, kayit.js
  aday/                 → Keşfet (ilan destesi), Eşleşmeler, Profil, CV yükleme
  isveren/              → İlanlarım, Yeni ilan, ilan/[id] (aday destesi), Eşleşmeler, Şirket
  sohbet/[id].js        → canlı mesajlaşma
src/components/         → SwipeDeck, JobCard, CandidateCard, MatchPopup, MatchesList, ui
supabase/schema.sql     → tablolar, güvenlik kuralları (RLS), eşleşme, sıralama
supabase/functions/     → parse-cv, jobs-feed
```

## Gizlilik (KVKK)

- İşveren eşleşmeden önce adayın **adını, telefonunu, e-postasını ve CV dosyasını göremez** (veritabanı kuralı ile kilitli).
- Kayıtta açık rıza onayı alınır.
- Şirketler `verified = false` başlar; vergi no kontrolünden sonra Supabase panelinden `companies.verified` alanını `true` yap → kartta "✓ Doğrulanmış şirket" çıkar.

## Sıradaki adımlar

- Bildirimler (yeni eşleşme / mesaj) — `expo-notifications`
- İşveren paketleri (ücretli ilan, öne çıkarma) — Google Play Billing
- Hesabı silme ekranı (Play Store zorunlu kılıyor)
- Uygulama ikonu ve açılış ekranı tasarımı
