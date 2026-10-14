# Android 0.3 — BİLSEM Takip'ten dosyasız MEBBİS işlemi

## Kullanım

1. Yeni APK'yı öncekinin üzerine kurun. Uygulama içindeki **BİLSEM Takip** ekranına
   ilk kullanımda hesabınızla giriş yapın. Bu oturum cihazdaki WebView'de tutulur.
2. Yoklamada tarihi ve ders saatini seçip işlenecek öğrencileri işaretleyin.
   **MEBBİS'e işle** düğmesi seçimleri cihaza kaydeder ve işlenecek satırları gösterir.
   Ayrı JSON indirme/yükleme ve Yoklamayı Kaydet adımı gerekmez.
3. Önizlemede yalnızca işlenecek öğrenci/dersleri seçip **Seçilenleri MEBBİS'e işle**
   düğmesine basın. Gelmedi kayıtları varsayılan seçilidir. Geldi seçeneğini özellikle
   seçerseniz mevcut resmî devamsızlığın kaldırılmasına izin vermiş olursunuz.
4. MEBBİS ekranında giriş ve doğrulama kodunu kendiniz tamamlayın. Oturum zaten açıksa
   yeniden giriş gerekmez. Uygulama BİLSEM modülüne ve devamsızlık ekranına ilerler.
5. Uygulama seçilen tarihin gün bölümlerini ayrı ayrı listeler, satırları eşleştirir,
   değişiklik varsa Kaydet'i çalıştırır ve listeyi yeniden açarak sonucu karşılaştırır.
   Tamamlandığında BİLSEM Takip ekranına ve doğrulanan satır sayısına döner.

**Araçlar → İşlemi durdur**, sonraki adımları durdurur. Kaydet isteği başlamışsa
sonucun ayrıca kontrol edilmesi gerekebilir. Uygulama duraklatıldığında işlem
ilerlemez; açıldığında bağlam kontrolüyle devam eder. Uygulama kapatılırsa bellek
kuyruğu kaybolur ve sessizce yeniden gönderilmez.

## Teknik yapı

İki ayrı WebView vardır: bilsemappp.vercel.app BİLSEM Takip hesabı; MEBBİS/BİLSEM ise
resmî oturum için kullanılır. Çerez veya şifreler kopyalanmaz. JavaScriptInterface
ve herkese açık yerel HTTP sunucusu yoktur. Android, yalnızca uygulamanın tam HTTPS
origin'indeki bellek kuyruğunu evaluateJavascript ile alır. Her adımdan önce aynı
BİLSEM Takip hesabının açık olduğunu doğrular. İş sonuçları aynı origin'e döner;
kullanıcı değiştiğinde işlem durur ve önceki hesabın sonucu ekranda gösterilmez.

Seçilen kayıtlar mevcut `bilsem-attendance-draft` v1 biçimini kullanır. İzinli/geç
ve eşleşmesi eksik kayıtlar seçime alınmaz. Web tarayıcısı tek başına resmî sitenin
oturumuna erişmez; dosyasız işlem Android 0.3 uygulamasının içinden kullanılmalıdır.

Otomasyon, açık sayfanın görünür kontrollerini kullanır; özel API tahmini, parola
okuma, doğrulama kodunu aşma veya gizli form alanını dışa aktarma yapmaz. Tek bir
Listele/Kaydet kontrolü, kurum/tarih/gün bölümü ve öğrenci/ders eşleşmesi doğrulanamazsa
durur. Önizlemenin durumu değişmişse Kaydet çalıştırılmaz. Günün eksiksiz tamamlandığı
kutusu seçili kayıtlardan çıkarılamayacağından otomatik işaretlenmez.

Kaydet yalnızca bir kez denenir. Başarı, düğmenin tıklanması veya kutuların dolmasıyla
ilan edilmez: yeni sayfa veya ASP.NET async postback tamamlandıktan sonra Listele
tekrar çalıştırılır ve yeni liste okunur. Zaten doğru olan kayıtlar yeniden
kaydedilmez. Zaman aşımı veya belirsiz kayıtta otomatik tekrar gönderim yapılmaz.

## Sınırlar

Bu bir gerçek cihaz doğrulaması bekleyen sürümdür. Canlı BİLSEM formunun HTML'i hâlâ
elde edilmedi. Sentetik sayfalarla filtre → Listele → Kaydet → yeniden Listele →
doğrulama akışı test edilmiştir; gerçek MEBBİS'e kayıt gönderildiği iddia edilmez.
Gerçek ekranda tanınmayan başlık/kontrol olursa **Araçlar → Ekranı Tanı** ile kişisel
veri içermeyen tanı dosyası alınabilir. İlk canlı denemede sonucu resmî listeden
kontrol edin. MEBBİS farklı bir SSO ekranı veya ek onay gösterirse kullanıcı
etkileşimi gerekebilir; bilinmeyen onaylar otomatik kabul edilmez.

Eski dosya araçları yalnızca Araçlar menüsünde bulunur; normal akışta gerekmez.

## Doğrulama

`npm run test:mebbis` sentetik sayfalarla mobil aktarımı, otomatik filtreleme ve
tek Kaydet davranışını, reddedilmiş kaydın başarı sayılmamasını, giriş beklemeyi,
async postback beklemeyi, tekrar işlemde yazma yapılmamasını ve native bellek
kuyruğunun yalnızca seçilen kayıtları taşımasını sınar. Android Gradle derlemesi
ayrıca yapılır; fiziksel cihaz/gerçek hesap testi yerine geçmez.

## Devamsızlık seçme ekranına erişim

Ana sayfadaki **Devamsızlıkları seç → MEBBİS’e işle** düğmesi veya **Dersler →
Devamsızlıkları seç** menüsü `#absences` ekranını açar. Tarih ve grup seçildikten
sonra öğrenci başına ders kutuları gösterilir. Bu ekran MEBBİS eşleştirmesi olmayan
eski gruplarda da görünür; seçimler hesaba özel korunur. Eksik resmî eşleştirmeler
uyarıyla belirtilir ve tamamlanana kadar gönderim yapılmaz. Sadece o ekranda seçilen
öğrenci/dersler kuyruğa alınır; aynı tarihteki diğer yoklamalar kendiliğinden seçilmez.
