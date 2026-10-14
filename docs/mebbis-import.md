# Android BİLSEM verilerini aktarma ve ders bazında yoklama

## Kullanım

1. Android yardımcı uygulamasında kendi MEBBİS oturumunuzu açın. Öğretmen Bilgileri
   sayfasında **Verileri Oku → JSON Kaydet** ile program ve öğrencileri alın.
2. bilsemapp'te **Ayarlar → BİLSEM JSON aktarımı** veya Hızlı Erişim'de
   **BİLSEM Aktarımı** kartını açın. İlk kurulumda Program Yükle ekranında da bağlantı vardır.
3. Kurum kodunu girin ve JSON'u seçin. Kaynak sürüm 1 desteklenir; dosya en fazla 5 MB olabilir.
4. Her grubun gününü, gün bölümünü, ders saatlerini, öğrenci numaralarını ve mevcut
   grupla eşleştirmesini kontrol edin. Eski grup adı farklıysa açılır listeden ilgili
   mevcut grubu seçin. **Yeni grup oluştur** eski grubun yerine geçmez, yeni grup ekler.
5. Onay kutusunu işaretleyip kaydedin. Mevcut grup ve öğrenci kimlikleri eşleştiğinde
   korunur; eski not, ödev ve yoklamalar bu kimliklere bağlı kalır. Kaynakta bulunmayan
   gruplar veya öğrenciler silinmez. İsimle eşleştirme yalnızca seçili gruptaki
   numarasız ve tek eşleşen öğrenciye uygulanır. Kararsız eşleşmeler durdurulur.
6. Yoklama ekranında aktarılan grubu açın. Tarihi ve ders saatini seçin. Her dersin
   bütün öğrencilerini işaretleyip ayrı kaydedin. Tarih grubun ders günü olmalıdır.
   Kaydedilmemiş değişiklikler varken ders/tarih değişiminde uyarı çıkar.
7. **Bu tarihin aktarım taslağını indir** düğmesi resmî sisteme gönderilmemiş bir
   JSON taslağı üretir. Önizlemede hazır ve engellenen satır sayıları gösterilir.

## Veri modeli ve koruma

- Grup `mebbis` alanı kurum, şube, ders ve gün bölümünü; `lessons` dizisi resmî ders
  sırası, gün bölümü ve başlangıç/bitiş saatini saklar. Kurum kodu JSON v1'de
  bulunmadığı için kullanıcı tarafından girilir; dosyadaki kurum otomatik doğrulanmaz.
- Öğrencide `studentNumber` ve `mebbisInstitution` tutulur. TC kimlik numarası gerekmez.
- Ders yoklaması `bilsem_lesson_attendance` altında grup + ISO tarih + ders kimliğiyle
  saklanır. Eski `bilsem_attendance` kayıtları korunur ve derslere kopyalanmaz.
- Ders kayıtlarına başlanmış bir grup/tarihte eski günlük kayıt istatistiklere yeniden
  eklenmez. Bu günler için istatistikler yalnızca kaydedilmiş derslere dayanır; eksik
  dersler tamamlanmış sayılmaz. Geçmiş ekranında eski günlük kayıt ayrıca görünür.
- Yeni veri anahtarı mevcut kullanıcıya özel bulut payload'ına ve JSON yedeğine dahil
  edilir. Yeni Supabase tablosu veya SQL migration gerekmez.
- Çakışan saatler, geçersiz tarih/sıra, aynı numarada farklı isimler, programsız öğrenci
  şubeleri ve öğrencisiz program grupları içe aktarmayı durdurur.
- Dosyanın BİLSEM'deki bütün kayıtları kapsadığı varsayılmaz. Android okuyucu sayfadaki
  görünür tablo satırlarını alır; sayfalama varsa tam liste kullanıcı tarafından kontrol edilir.

## Aktarım taslağının sınırı

`bilsem-attendance-draft` sürüm 1 gerçek bir MEBBİS servis sözleşmesi değildir.
Dosyada `submitted:false` bulunur. Yalnızca açıkça kaydedilmiş ve eşleşmesi bulunan
`present`/`absent` kayıtları satırlara alınır. `late` ve `excused`, resmî ekranın
karşılıkları doğrulanmadığından engellenenler listesinde bırakılır. Öğrencisiz veya
kurumsuz eşleşmeler de engellenir. Gün tamamlandı kutusu işaretlenmez ve resmî
Kaydet işlemi yapılmaz. Android'e devamsızlık dosyası alma, canlı BİLSEM satırlarıyla
karşılaştırma ve doğrulanmış yazma bir sonraki geliştirmedir.

## Doğrulama

- `node --test tests/mebbis-import.test.cjs tests/mebbis-extractor.test.cjs`
- `npm run test:mebbis` (önce `npx playwright install chromium`)

Test verileri sentetiktir; gerçek öğrenci JSON'u depoya eklenmez. Mobil test sunucusu
sahte hesap ve bulut kullanır; gerçek MEBBİS veya Supabase'e bağlanmaz.
