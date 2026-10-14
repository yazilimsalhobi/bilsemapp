# BİLSEM Takip Android 0.4

## İlk kurulum ve günlük kullanım

APK önceki sürümün üzerine kurulabilir; paket kimliği ve yerel imza korunmuştur.
Uygulama adı ve simgesi BİLSEM Takip'tir. BİLSEM Takip hesabınıza ilk kullanımda
giriş yapın. Kurum Fatsa Bilim ve Sanat Merkezi (765146) olarak hazır tanımlıdır;
program aktarımında kurum kodu sorulmaz.

MEBBİS girişini hatırlamak için ilk açılıştaki **Girişi tanımla** veya
**Ayarlar → MEBBİS girişini hatırla / değiştir** menüsünde kendi resmî kullanıcı
adı ve şifrenizi girip **Şifreli kaydet ve kullan** seçin. Bunlar BİLSEM Takip
hesabının giriş bilgileri değildir. Doğrulama kodunu kaydetmeyin; uygulama da
kaydetmez. İsterseniz giriş kaydını aynı menüden silebilir veya hiç saklamadan
elle giriş yapabilirsiniz.

Günlük akış: **Devamsızlıkları seç → Tarih / grup → öğrenci ve ders kutuları →
Yoklamayı kaydet ve MEBBİS'e işle**. Android içinde seçimler yerel kaydedilir ve
ikinci bir dosya/önizleme adımı olmadan native kuyruğa alınır. MEBBİS ekranı açılır;
kayıtlı giriş, tanınan bir resmî POST giriş formunda bir kez kullanılır. Güvenlik
kodu, CAPTCHA veya ikinci doğrulama varsa kullanıcı tamamlar. Eşleşen derslerin
kaydı ve yeniden okuma kontrolü sürer; sonuç BİLSEM Takip ekranında gösterilir.
Normal ders yoklamasında da ana Kaydet düğmesi aynı gönderim akışını başlatır;
**Yalnızca uygulamaya kaydet** ayrı bir seçenek olarak bulunur.

## APK içeriği ve ağ

Ekranlar yalnızca uzak siteyi gösteren bir kısayol değildir: index, JavaScript,
CSS ve simgeler Gradle'ın izin listesiyle APK'nın içine paketlenir. Native HTTPS
kaynak sağlayıcısı bunları aynı uygulama origin'i altında açar. Önceki sürümün
service worker/cache kayıtları uygulama açılışında temizlenir; hesap localStorage'ı
silinmez. Bu paket yerel statik dosyaları kullanır; daha sonraki ekran değişiklikleri
için yeni APK gerekir. Web sürümü ayrıca yayınlanır.

Hesap girişi, bulut senkronizasyonu ve MEBBİS işlemi internet gerektirir. Supabase
ve bazı dosya okuyucu kütüphaneleri ağdan yüklenir. Paketleme, tam çevrimdışı
resmî işlem desteği anlamına gelmez. JSON/PDF vb. seçimi Android sistem dosya
seçicisiyle yapılır; geniş depolama izni istenmez.

## Kullanıcı adı ve şifre güvenliği

- Giriş bilgileri kullanıcının uygulamadaki native ayar formuna açıkça girmesiyle
  kaydedilir. Diğer uygulamaların parolaları veya şifre yöneticileri okunmaz.
- AndroidKeyStore'da üretilen AES-256 anahtarı uygulama tarafından dışarı çıkarılmaz.
  SharedPreferences yalnızca rastgele IV ve AES-GCM şifreli/veri bütünlüğü korumalı
  içerik tutar. Şifre buluta, takip çalışma alanına, tanı dosyasına veya loga yazılmaz.
- Otomatik doldurma yalnızca `https://mebbis.meb.gov.tr` üzerinde, aynı host'a POST
  eden tek parola alanlı ve tek kullanıcı alanlı tanınan giriş formunda yapılır.
  Farklı origin/form hedefi veya başlamış farklı kullanıcı girişi korunur.
- Güvenlik kodu alanı boşsa şifre doldurulduktan sonra kullanıcı beklenir. Giriş
  düğmesi tekil tanınmazsa otomatik tıklanmaz. Her gönderim işi kayıtlı şifreyle
  en fazla bir otomatik deneme yapar; hatalı parola döngüsü oluşturulmaz.
- Uygulama yedeklemesi kapalıdır. **Oturumları sil** kayıtlı girişi de kaldırır.

Android'de başka uygulamaların parolalarını okumaya yönelik bir izin açılmamıştır;
istenen yetki, uygulamanın kendi yerel kaydı ve resmî formdaki alanlarıyla sınırlıdır.
Erişilebilirlik, SMS okuma veya tüm dosyalara erişim izni kullanılmaz.

## Doğrulama ve kalan sınırlar

Mobil Chromium testleri uygulama ekranlarını, tek düğmeli native kuyruğunu,
resmî kayıt akışının sentetik örneğini ve giriş formu origin/kod korumalarını sınar.
JVM şifreleme testi geri çözme, IV farklılığı, açık metin olmaması, değiştirilmiş
şifreli veri ve yanlış anahtarın reddini doğrular. Android Gradle derlemesi ve APK
imzası ayrıca kontrol edilir. Bu testler fiziksel cihazdaki Keystore davranışının
veya gerçek MEBBİS hesabında kaydın doğrulandığı anlamına gelmez.

Canlı BİLSEM formunun HTML'i hâlâ edinilmedi. Desteklenmeyen form, ders/öğrenci
numarası eşleştirmesi veya resmî yanıt varsa işlem durur; belirsiz kayıt otomatik
tekrarlanmaz. MEBBİS şifre veya kod kurallarını aşma yoktur. İlk gerçek telefon
kullanımında resmî kayıt listesinden sonuç kontrol edilmelidir.

Gönderim ve kontrol sonuçları tarih, seçili ders sayısı, varsa doğrulanan sayı ve
sonuç mesajıyla hesabın **Gönderim ve kontrol geçmişi** bölümüne kaydedilir. Yalnızca
başarıyla yeniden okunan işler Doğrulandı olarak gösterilir; kesilen/belirsiz işler
Kontrol gerekiyor veya Durduruldu olarak kalır. Bu geçmiş parola/kod içermez.

## Eski gruplarda otomatik ilk eşleştirme

Öğrenci numarası veya resmî ders kimliği eksik eski grupların seçimi Android 0.4'te
bekletilmez; yalnızca seçili öğrenci adı, yerel kimliği, branş, gün ve dersin tam
başlangıç/bitiş saatiyle bir çözümleme işi oluşturulur. Native modül kullanıcı
girişinden sonra görünür Öğretmen Bilgileri bağlantısına ilerler ve program/öğrenci
tablolarını mevcut okuyucuyla okur. Kaynakta kurumun 765146 olduğu doğrulanır.

Öğrenci adı + branş + gün + tam ders saati tek bir resmî öğrenci/şubeye eşleşmelidir.
Birden çok aday, yanlış gün/kurum veya bir yerel grupta farklı resmî şubeler varsa
kayıt yapılmadan durulur. Eşleştirme takip hesabına, mevcut öğrenci/grup kimlikleri
korunarak kaydedilir. Cihaz kaydı doğrulanmadan resmî Kaydet aşamasına geçilmez.
Seçili ders yoklaması bu kimliklerle kaydedildikten sonra normal gönderim sürer.
Bu işlemde JSON dosyası taşıma veya kurum kodu sorma yoktur. Kaynak tablo
sayfalanmışsa ve seçilen öğrenci görünür kayıtlarda bulunamazsa işlem durur;
görülmeyen öğrenci numarası tahmin edilmez.
