# BİLSEM Android okuma prototipi

Bu sürüm MEBBİS girişini Android WebView içinde kullanıcıya bırakır. Öğretmen
Bilgileri ekranında **Verileri Oku** program ve öğrenci tablolarını başlıklarına
göre tanır, önizler ve Android dosya seçicisiyle JSON kaydeder. Kimlik numaraları,
şifreler, gizli form alanları ve çerezler dışa aktarılmaz. Oturum cihazdaki WebView
profilinde kalır; **Oturumu Sil** ile temizlenebilir. Yedekleme kapalıdır.

## APK oluşturma

Android Studio'da bu dizini açıp SDK 35 ve Gradle 8.9 / JDK 17 ile
`gradle assembleDebug` çalıştırın. APK: `app/build/outputs/apk/debug/app-debug.apk`.
Depodaki `.github/workflows/android-companion.yml` aynı derlemeyi GitHub Actions
üzerinden yapar ve APK'yı indirilebilir artifact olarak sunar. Workflow dosyasının
GitHub'a gönderilmesi gerekir; yerel dosya oluşturulması workflow çalıştırmaz.

## Telefonda deneme

1. APK'yı kurun, MEBBİS düğmesiyle kendi girişinizi yapın.
2. Bilim ve Sanat Merkezi modülünü açın, Öğretmen Bilgileri ekranına gidin.
3. Sayfa tamamen yüklenince Verileri Oku'ya dokunun.
4. Dersleri ve öğrenci/ders kayıtlarını kontrol edip JSON Kaydet'i seçin.
5. Kullanım sonunda gerekiyorsa Oturumu Sil'i kullanın.

MEBBİS oturum açma yöntemi WebView'i reddedebilir. Harici HTTPS giriş bağlantıları
uyarıyla sistem tarayıcısında açılır; harici tarayıcı oturumu buraya taşınmaz.
Böyle bir durumda giriş başarısı kabul edilmez ve cihaz üzerinde başka bağlantı
yöntemi denenmelidir. TLS hataları atlanmaz.

## Prototipin sınırları

- Canlı hesapta veya Android cihazda henüz doğrulanmadı; tablo başlıkları paylaşılan
  görüntülere göre tanımlandı. Çerçeve içindeki veya farklı başlıklı tablolar için
  uyarlama gerekebilir. Sayfalamada yalnızca DOM'daki görünür kayıtlar okunur;
  sonuçların tam liste olduğu varsayılmamalıdır.
- JSON dosyasını bilsemapp içindeki **Ayarlar → BİLSEM JSON aktarımı** ekranında
  önizleyip mevcut gruplarla eşleştirin. Otomatik sekmeler arası aktarım yoktur.
- Devamsızlık yazma, Kaydet veya tamamlandı kutusunu işaretleme kodu yoktur.
  bilsemapp aktarılan gruplarda ders sırası ve gün bölümüyle ayrı yoklama tutar;
  resmî sisteme yazma bu prototipte henüz bulunmaz.
- APK, Android SDK 35 ve Gradle 8.9 ile derlendi; APK imzası doğrulandı.
  Debug imzalı deneme sürümüdür. Canlı MEBBİS girişi ve cihaz davranışı henüz sınanmadı.

## Doğrulama

Depo kökünde `node --test tests/mebbis-extractor.test.cjs`: Türkçe başlıklar,
öğrenci numarası, ders sırası/gün bölümü, gizli tablo ve hassas sütunların dışlanması.

## 0.2 — Devamsızlık dosyasını ekrana doldurma

**Yoklama JSON**, bilsemapp'ten indirilen taslağı BİLSEM devamsızlık listesindeki
satırlarla eşleştirir ve kontrolünüzden sonra kutuları doldurur. Resmî **Kaydet**
düğmesine siz basarsınız. **Kayıt Kontrol**, sayfa yeniden yüklendikten sonra listeyi
tekrar karşılaştırır. Canlı formda henüz sınanmadı; tanınmayan ekranlarda işlem durur.
[Kullanım ve sınırlamalar](../docs/android-attendance-transfer.md).
