# BİLSEM dinamik tema motoru

## Teslim edilen dosyalar

1. `css/globals.css`: Organic, Brutalist, Ethereal; semantik renk, yüzey, şekil, gölge ve hareket tokenları. Eski ekranların değişkenleri aynı tokenlara bağlanır.
2. `tailwind.config.js`: CSS değişkenlerini kullanan `extend` eşlemesi. Örnek Tailwind 3 ile derlenir; tarayıcıda Tailwind çalışmaz.
3. `js/theme.js`: üretim PWA'sının bağımsız sağlayıcısı. `examples/theme-engine/ThemeProvider.jsx`: aynı motorun state içermeyen React Context adaptörü ve ThemeSwitcher.
4. `examples/theme-engine/StudentStatsCard.jsx`: Framer Motion kartı, bekleme durumu ve Geogo SVG maskotu. Örnek veriler açıkça işaretlenir; canlı öğrenci verisi kullanılmaz.

## Mimari kararlar

[Shadcn theming](https://ui.shadcn.com/docs/theming) yaklaşımındaki semantik yüzey/ön plan eşleşmesini ve [Radix radius tokenlarının](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/styles/tokens/radius.css) ölçeklenebilir CSS değişkeni yaklaşımını uyguluyoruz. Kütüphanelerin tamamını kurmak yerine bu mimari ilkeleri kullanıyoruz. Kök `html` kapsamı, body altındaki dialog/portal içeriklerinin de tokenları devralmasını sağlar. Geometrik ölçek CSS `calc()` ile hesaplanır.

Mevcut proje React uygulaması değildir. Üretim giriş sayfası React, Framer Motion, Vite veya Tailwind yüklemez. Bu araçlar yalnızca bağımsız örneğin geliştirme bağımlılıklarıdır. Üretimde yeni tema JavaScript'i yaklaşık 1.2 KB ham boyuttadır; CSS ve SVG ayrıca eklenir. Sıfır bayt ek maliyet veya sıfır repaint iddiası yapılmaz: görünüm değişince tarayıcı stil hesaplar ve boyar; köşe/kenarlık değişimi bir defalık layout da gerektirebilir. Sürekli çalışan JS hesaplama veya React tema render zinciri yoktur.

`js/theme.js` CSS'ten önce çalışarak yerel tercihi ilk boyamadan önce uygular. Seçim `bilsem.theme.v1` anahtarında cihaz bazında tutulur; öğrenci/kurum verilerine karışmaz. Üç temadan olmayan değerler (eski light/dark dahil) Organic'e döner. Engelli localStorage çalışmayı bozmaz; diğer sekmelerin storage olayları desteklenir. Değişim tek kök attribute yazımıdır; aynı seçim tekrar yazılmaz.

React Context yalnızca sabit komut nesnesi taşır. Butonların aktif görünümleri CSS seçicileriyle belirlenir. Demo checkbox'ının state'i yalnızca gerçek yükleme durumunu göstermek içindir; tema state'i değildir.

[Framer Motion transitions](https://motion.dev/docs/react-transitions) `spring/tween` türünü JavaScript konfigürasyonu olarak bekler; CSS string'ini transition nesnesi yerine kabul etmez. Kart bir etkileşim başladığında CSS tokenlarını bir kez okur; duration/bounce değerlerini sayıya dönüştürür. Tema değişimi bunu çalıştırmaz. Devam eden Framer animasyonu mevcut ayarlarıyla biter, sonraki etkileşim yeni temayı kullanır. Geogo'nun sürekli hareketi CSS ile çalışır. Organic CSS hareketi yay hissi veren easing kullanır; fiziksel spring Framer kart etkileşimindedir. Yalnız transform/opacity anime edilir. `prefers-reduced-motion` CSS ve Framer tarafında desteklenir.

Geogo için depoda ayrı bir maskot kaynağı bulunmadığından yeni, küçük bir SVG örnek çizimi `icons/geogo.svg` olarak eklendi. Resmî maskot asset'i geldiğinde aynı dosya değiştirilebilir.

## Çalıştırma

```sh
npm ci
npm test
npm run test:browser
npm run dev:theme
# http://127.0.0.1:5173/examples/theme-engine/
npm run build:theme
```

Tarayıcı testleri yerel Microsoft Edge kullanır; Supabase yerine `tests/dev-server.cjs` sahte hesabıyla çalışır. Gerçek hesaba veya öğrenci kaydına yazmaz. Örnek derleme `dist/` altındadır; üretim PWA dağıtımıyla karıştırılmamalıdır. Mevcut statik PWA normal şekilde index.html üzerinden çalışır. Service worker v12 yeni CSS, motor ve Geogo'yu çevrimdışı önbelleğe alır.

Yeni tema eklemek için `globals.css` içinde aynı temel tokenları tanımlayın, `js/theme.js` izin listesine ve iki switcher'a seçeneği ekleyin. Bileşenlerde tema adına göre renk veya şekil koşulu yazmayın. Mevcut ders/gün/durum renkleri anlamlarını korur; yeni UI için semantik tokenları tercih edin.
