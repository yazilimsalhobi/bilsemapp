# Android 0.2: devamsızlık taslağını BİLSEM ekranına doldurma

Bu sürüm otomatik resmî kayıt göndermez. Doğrulanmış satırların kutularını doldurur;
BİLSEM'in **Kaydet** düğmesine kullanıcı basar. Doldurulmuş ekran kaydedilmiş sayılmaz.

## Telefonda kullanım

1. bilsemapp'te aktarılan gruplar için her dersin yoklamasını kaydedin. İlgili tarihte
   **Bu tarihin aktarım taslağını indir → JSON indir** ile dosyayı alın.
2. Yeni APK'yı kurun. MEBBİS girişini kendiniz yapıp **Ders Devamsızlık Takibi**
   ekranını (`BLS00048.ASPX`) açın.
3. Dosyayla aynı tarihi ve sabah/öğle/akşam bölümünü seçip **Listele** yapın.
   Filtreleri listelemeden değiştirmeyin.
4. Android araç çubuğundaki **Yoklama JSON** ile taslak dosyasını seçin.
5. Önizlemede kurum, tarih, gün bölümü, öğrenci numarası, şube, ders sırası ve önceki/yeni
   durumu kontrol edin. **Kontrol ettim, doldur** yalnızca eşleşen kutuları değiştirir.
6. Resmî ekrandaki değişiklikleri kontrol edip **Kaydet** düğmesine kendiniz basın.
   Uygulama bu düğmeye ve “eksiksiz tamamladım” kutusuna otomatik dokunmaz.
7. Listeyi yeniden yükleyin. Tam sayfa yüklenmediyse **Yenile** ve doğru filtrelerle
   tekrar **Listele** yapın. Ardından **Kayıt Kontrol** seçili bölümün satırlarını taslakla
   karşılaştırır. Fark varsa kaydedildi varsaymayın. Eşleşme yalnızca yeniden okunmuş
   listeyi doğrular; bütün günün tamamlandığı veya bir kaydı uygulamanın gönderdiği
   anlamına gelmez.
8. Dosyada diğer gün bölümleri varsa her birini ayrı listeleyip aynı dosyayla tekrarlayın.

## Durdurma koşulları

- Kurum kodu, seçili tarih ve gün bölümü ekrandan tekil belirlenemezse işlem durur.
- Sayfa/filtre/listelenen satırlar değişirse önizleme geçersiz olur. Listeleme
  sonrası tam sayfa yüklemesi desteklenir. AJAX ile değişen bir tablo için sayfayı
  yenileyip tekrar listelemek gerekebilir; belirsiz bağlamda doldurma yapılmaz.
- Taslakta engellenen satır, desteklenmeyen durum, yinelenen öğrenci/ders veya
  ekranda bulunamayan/çoklu eşleşen satır varsa hiçbir satır doldurulmaz.
- Mevcut rapor/resmî izin alanı seçiliyse otomatik değişiklik yapılmaz.
- Seçilebilir tek bir checkbox çifti veya aynı öğrenci/ders grubundaki radio çifti
  desteklenir. Kilitli/gizli alanlar ve ortak radyo grupları desteklenmez.
- `present` her iki yokluk seçeneğinin kapalı olması, `absent` yalnızca Gelmedi
  alanının açık olması olarak ele alınır. `late`/`excused` otomatik çevrilmez.
- Herhangi bir click/change olayı tetiklenmez; bunlar eski ASP.NET ekranında
  öngörülmeyen postback başlatabilir. Standart HTML checked değerleri ayarlanır.
  Kaydet sonrasında yeniden okuma bu nedenle zorunludur.

## Destek ve sınırlar

Canlı BİLSEM formunun HTML'i henüz elde edilmedi. Eşleştirme paylaşılan başlıklara
ve sentetik DOM testlerine dayanır; gerçek hesapta doğrulanmış gönderim iddiası yoktur.
Tanınmayan ekranda **Ekranı Tanı** ile bir tanı JSON'u kaydedilip paylaşılabilir.
Bu dosya izin verilen sütun başlıkları, satır sayıları, kutu türü, görünürlük ve
kilit durumunu içerir. Bilinmeyen başlıklar maskelenir; TC, öğrenci adları/numaraları,
şifre, çerez ve gizli form alanları içermez. Tüm HTML veya oturum dökümü alınmaz.

Yoklama taslağı sadece cihaz belleğinde tutulur; uygulama kapanınca veya Oturumu Sil
ile temizlenir. WebView başka uygulamalardan çerez almaz. Yeni APK yerel eski APK ile
aynı debug anahtarıyla imzalanır; otomatik CI APK'ları farklı debug anahtarı kullanabilir.

## Doğrulama

`npm run test:mebbis`: mobil web akışlarına ek olarak radio/checkbox doldurma,
önizleme sırasında mutasyon olmaması, kurum/tarih/gün bölümü kontrolleri, stale liste,
rapor/izin koruması, eksik/çift eşleşme, diğer satırların korunması, Kaydet/tamamlandı
kutusuna dokunulmaması ve yeni sunucu yanıtının karşılaştırılması sentetik sayfalarda sınanır.
