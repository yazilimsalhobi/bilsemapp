# Fatsa BİLSEM — Ders Programı ve Öğrenci Takip Uygulaması

Fatsa Bilim ve Sanat Merkezi (BİLSEM) Sosyal Bilgiler & Coğrafya birimi için geliştirilmiş modern, hızlı ve mobil uyumlu PWA (Progressive Web App) takip uygulaması.

![BİLSEM Takip](icons/icon-512.png)

## 📱 Özellikler

- **Ders Programı:** Günlük ve haftalık ders çizelgesi, canlı ders sayacı ve akıllı bildirimler.
- **Yoklama Takibi:** Hızlı yoklama alma, devamsızlık istatistikleri ve WhatsApp üzerinden veli bilgilendirme.
- **Ödev & Proje Takibi:** Öğrenci bazlı ödev atama, durum takibi ve teslim tarihleri.
- **Öğrenci Yönetimi:** Öğrenci kartları, iletişim bilgileri, notlar ve gelişim raporları.
- **İstatistik & Grafik:** Katılım oranları ve haftalık performans analizleri.
- **Çevrimdışı Çalışma (PWA):** İnternet olmadan da tüm verilere erişim ve kullanım.
- **Veri Yedekleme:** JSON formatında yerel verileri dışa aktarma ve geri yükleme.

## 🚀 Telefona Kurulum (PWA)

Uygulama Progressive Web App (PWA) olarak tasarlanmıştır; uygulama mağazasına gerek duymadan doğrudan telefona yüklenebilir:

### Android (Chrome)
1. Tarayıcıdan uygulamayı açın.
2. Sağ üstteki **üç nokta (⋮)** menüsüne tıklayın.
3. **"Uygulamayı Yükle"** veya **"Ana Ekrana Ekle"** seçeneğine dokunun.

### iPhone / iOS (Safari)
1. Safari tarayıcısı ile uygulamayı açın.
2. Ekranın altındaki **Paylaş (kare içinde yukarı ok)** simgesine dokunun.
3. Listeyi aşağı kaydırıp **"Ana Ekrana Ekle"** seçeneğine tıklayın.

## 💻 Teknolojiler

- HTML5, Modern Vanilla CSS & JavaScript (ES6+)
- Service Worker & Cache API (Offline destek)
- Web App Manifest (Mobil uygulama deneyimi)
- LocalStorage / IndexedDB veri kalıcılığı

## Hesaba özel çalışma alanları

- Her kullanıcının grupları, öğrencileri, yoklamaları, ödevleri, ayarları ve yıllık planları `user_workspaces` tablosunda kendi kullanıcı kimliğiyle tutulur. RLS sadece satırın sahibine erişim verir.
- Cihaz kayıtları da kullanıcı kimliğiyle ayrılır. Çıkışta ekrandaki veri modeli sıfırlanır. Ortak eski cihaz kayıtları yeni hesaplara otomatik kopyalanmaz.
- İlk girişte ad-soyad, kurum, branş ve eğitim yılı istenir. Kullanıcı PDF/JPEG/PNG programını yükleyebilir veya boş başlayıp elle grup ekleyebilir.
- `supabase/001_private_workspaces.sql` yeni kurulumlarda önce Supabase SQL Editor üzerinden uygulanmalıdır. Bu projede 23 Eylül 2026 tarihinde uygulandı. Eski bulut tabloları silinmez; yalnızca `admin@fatsabilsem.com` hesabına sınırlandırılır.
- İlk programdaki 10 grup ve 52 öğrenci yönetici çalışma alanına taşındı. Özel kaynak PDF/metin ve `private-backup/` yedekleri yeni yayın paketine dahil edilmez. Eski Git geçmişi yeniden yazılmadı.

## Dosyadan program ve yıllık plan

- Program aktarımı: metinli PDF için PDF.js; taranmış PDF ve JPEG/PNG için Türkçe/İngilizce Tesseract OCR. Metin ve tablo biçimindeki gün/saat/grup/öğrenci verileri düzenlenebilir önizlemeye çıkarılır. Dosyalar tarayıcıda okunur; ham dosya buluta gönderilmez. Kaydetmeden önce isim ve saatleri kontrol edin.
- Yıllık plan: Excel `.xlsx`/`.xls` ve Word `.docx` tablolarındaki **Hafta**, **Tarih**, **Kazanım / Öğrenme çıktısı / Hedef** başlıkları tanınır. Eski `.doc` belgeleri önce Word'de `.docx` olarak kaydedilmelidir.
- Tarihli satırlar tarih aralıklarıyla eşleştirilir. Tarihsiz haftalar için kullanıcı 1. haftanın başlangıcını seçer; haftalar yedişer gün ilerler. Tatiller otomatik tahmin edilmez; önizlemeden düzenlenir. Tarih bulunamazsa boş bırakılır ve kaydetme engellenir.
- Plan birden fazla gruba uygulanabilir. Seçilen grupların mevcut planları değiştirilmeden önce onay istenir. Kazanımlar ana sayfadaki bugünün gruplarında ve ders programındaki seçilen haftada gösterilir.
- Okuma kütüphaneleri ilk kullanımda internetten indirilir. Desteklenen sınırlar: 25 MB, PDF için 40 sayfa. Karmaşık tablolar ve düşük kaliteli fotoğraflar elle düzeltme gerektirebilir.
- Hızlı Bakış/Hızlı Erişim kartlarının görünürlüğü, adı ve sırası hesaba özel düzenlenebilir. Bölümler kapalı başlar; başlıklarına dokunarak veya klavyeden Enter/Space ile açılır.

## Doğrulama

`node --test tests/*.test.cjs` giriş, hesap ayrımı, dosya metni ayrıştırma ve yıllık plan tarih eşleşmesini sınar.

`node tests/dev-server.cjs` sadece `127.0.0.1:8765` üzerinde yerel arayüz testi başlatır; Supabase yerine sahte test oturumu kullanır. Bu sunucu gerçek hesap veya bulut verisine bağlanmaz. Sentetik örnek dosyalar `tests/fixtures/` altındadır.

Dosya okuyucuları: [PDF.js](https://mozilla.github.io/pdf.js/examples/), [Tesseract.js](https://github.com/naptha/tesseract.js), [SheetJS](https://docs.sheetjs.com/docs/solutions/input/), [Mammoth](https://github.com/mwilliamson/mammoth.js).
