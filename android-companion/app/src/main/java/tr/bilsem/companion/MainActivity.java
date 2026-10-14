package tr.bilsem.companion;

import android.app.*;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.*;
import android.widget.*;
import android.view.ViewGroup;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.io.*;

public class MainActivity extends Activity {
    private WebView browser;
    private TextView status;
    private String pendingExport;
    private boolean reading;
    private JSONObject attendanceDraft;
    private long pageGeneration;
    private long filledGeneration = -1;

    private boolean trusted(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        String host = uri.getHost();
        return "https".equals(uri.getScheme()) &&
            ("mebbis.meb.gov.tr".equals(host) || "bilsem.meb.gov.tr".equals(host));
    }
    private void open(String url) {
        if (trusted(url)) browser.loadUrl(url);
        else if (url != null && "https".equals(Uri.parse(url).getScheme())) {
            new AlertDialog.Builder(this).setMessage("Bu bağlantı harici tarayıcıda açılacak. Giriş işlemi uygulamaya geri dönmeyebilir.")
                .setPositiveButton("Aç", (d,w) -> { try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) { message("Tarayıcı açılamadı."); } })
                .setNegativeButton("Vazgeç", null).show();
        }
    }
    private void message(String text) { status.setText(text); }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(0, 28, 0, 16);
        status = new TextView(this); status.setPadding(16,8,16,8);
        status.setText("BİLSEM Yardımcı 0.2 • Program için Verileri Oku, devamsızlık listesinde Yoklama JSON kullanın.");
        layout.addView(status);
        LinearLayout bar = new LinearLayout(this);
        addButton(bar, "MEBBİS", () -> open("https://mebbis.meb.gov.tr/"));
        addButton(bar, "Verileri Oku", this::readTables);
        addButton(bar, "Oturumu Sil", this::clearSession);
        layout.addView(bar);
        LinearLayout attendanceBar = new LinearLayout(this);
        addButton(attendanceBar, "Yoklama JSON", this::chooseAttendance);
        addButton(attendanceBar, "Kayıt Kontrol", this::verifyAttendance);
        addButton(attendanceBar, "Yenile", () -> browser.reload());
        layout.addView(attendanceBar);
        LinearLayout diagnosticBar = new LinearLayout(this);
        addButton(diagnosticBar, "Ekranı Tanı", this::diagnoseAttendance);
        layout.addView(diagnosticBar);
        browser = new WebView(this);
        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setBuiltInZoomControls(true); settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true); settings.setLoadWithOverviewMode(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false);
        browser.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request.isForMainFrame() && !trusted(request.getUrl().toString())) { open(request.getUrl().toString()); return true; }
                return false;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) { pageGeneration++; }
            @Override public void onPageFinished(WebView view, String url) {
                if (isAttendancePage()) runAttendance("bind", null, null, result -> {});
                message(trusted(url) ? "Program için Verileri Oku; devamsızlık ekranında Listele yaptıktan sonra Yoklama JSON kullanın." : "Bu sayfadan veri okunamaz.");
            }
        });
        // BİLSEM module may open in a new tab. Route its trusted URL to the main view.
        browser.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, android.os.Message result) {
                if (!userGesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        open(request.getUrl().toString()); v.destroy(); return true;
                    }
                });
                ((WebView.WebViewTransport)result.obj).setWebView(popup); result.sendToTarget(); return true;
            }
        });
        layout.addView(browser, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1));
        setContentView(layout); open("https://mebbis.meb.gov.tr/");
    }
    private void addButton(LinearLayout parent, String text, Runnable action) {
        Button b = new Button(this); b.setText(text); b.setTextSize(12);
        b.setOnClickListener(v -> action.run());
        parent.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
    }
    private void readTables() {
        if (reading) return;
        Uri uri = Uri.parse(browser.getUrl() == null ? "" : browser.getUrl());
        if (!trusted(browser.getUrl()) || !"bilsem.meb.gov.tr".equals(uri.getHost())) { message("Önce BİLSEM modülünde Öğretmen Bilgileri ekranını açın."); return; }
        try {
            String script;
            try (InputStream input = getAssets().open("extract.js")) { ByteArrayOutputStream buffer = new ByteArrayOutputStream(); byte[] bytes = new byte[4096]; int count; while ((count = input.read(bytes)) != -1) buffer.write(bytes, 0, count); script = buffer.toString("UTF-8"); }
            reading = true;
            browser.evaluateJavascript(script, encoded -> {
                reading = false;
                try {
                    Object decoded = new JSONTokener(encoded).nextValue();
                    if (!(decoded instanceof String)) throw new Exception();
                    JSONObject data = new JSONObject((String)decoded);
                    JSONArray lessons = data.getJSONArray("schedule"), students = data.getJSONArray("students");
                    if (lessons.length() == 0 && students.length() == 0) { message("Tanımlı tablo bulunamadı. Öğretmen Bilgileri ekranını açın; ekran yapısı değişmiş de olabilir."); return; }
                    StringBuilder preview = new StringBuilder();
                    preview.append("Ders satırı: ").append(lessons.length()).append("\nÖğrenci/ders kaydı: ").append(students.length()).append("\n\n");
                    for (int i=0;i<lessons.length();i++) {
                        JSONObject r=lessons.getJSONObject(i);
                        preview.append(r.getString("day")).append(" · ").append(r.getString("period")).append(" · ").append(r.getString("lessonOrder")).append(" · ").append(r.getString("time")).append(" · ").append(r.getString("subject")).append(" · ").append(r.getString("branch")).append("\n");
                    }
                    preview.append("\nÖğrenciler\n");
                    for(int i=0;i<students.length();i++) { JSONObject r=students.getJSONObject(i); preview.append(r.getString("studentNumber")).append(" · ").append(r.getString("firstName")).append(" ").append(r.getString("lastName")).append(" · ").append(r.getString("branch")).append(" · ").append(r.getString("subject")).append("\n"); }
                    TextView text = new TextView(this); text.setText(preview); text.setPadding(24,16,24,16);
                    ScrollView scroll = new ScrollView(this); scroll.addView(text);
                    new AlertDialog.Builder(this).setTitle("Alınan verileri kontrol edin").setView(scroll)
                      .setPositiveButton("JSON Kaydet", (d,w) -> {
                          pendingExport = data.toString();
                          Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"bilsem-program-ogrenciler.json");
                          startActivityForResult(save, 10);
                      }).setNegativeButton("Kapat",null).show();
                } catch (Exception e) { message("Veri okunamadı. Sayfa yüklenince yeniden deneyin."); }
            });
        } catch (IOException e) { reading=false; message("Okuyucu yüklenemedi."); }
    }
    @Override protected void onActivityResult(int request, int result, Intent intent) {
        super.onActivityResult(request,result,intent);
        if(request==20 && result==RESULT_OK && intent!=null) {
            try(InputStream input=getContentResolver().openInputStream(intent.getData())) {
                if(input==null) throw new IOException();
                ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] chunk=new byte[4096];int count;
                while((count=input.read(chunk))!=-1) {if(bytes.size()+count>5*1024*1024) throw new IOException();bytes.write(chunk,0,count);}
                JSONObject draft=new JSONObject(bytes.toString("UTF-8"));
                previewAttendance(draft);
            } catch(Exception e) {message("Yoklama JSON okunamadı. En fazla 5 MB geçerli taslak seçin.");}
        }
        if(request==10) {
            if(result==RESULT_OK && intent!=null && pendingExport!=null) {
                try(OutputStream output=getContentResolver().openOutputStream(intent.getData())) {
                    if(output==null) throw new IOException();
                    output.write(pendingExport.getBytes(StandardCharsets.UTF_8)); message("JSON dosyası kaydedildi.");
                } catch(Exception e) { message("Dosya kaydedilemedi."); }
            }
            pendingExport=null;
        }
    }
    private boolean isAttendancePage() {
        Uri uri=Uri.parse(browser.getUrl()==null ? "" : browser.getUrl());
        return trusted(browser.getUrl()) && "bilsem.meb.gov.tr".equals(uri.getHost()) && "/BLS00048.ASPX".equalsIgnoreCase(uri.getPath());
    }
    private interface AttendanceCallback { void accept(JSONObject result); }
    private void runAttendance(String action, JSONObject draft, String token, AttendanceCallback callback) {
        if(!isAttendancePage()) {message("BİLSEM Ders Devamsızlık Takibi ekranını açın.");return;}
        try {
            JSONObject request=new JSONObject().put("action",action);
            if(draft!=null) request.put("draft",draft);
            if(token!=null) request.put("token",token);
            String source;
            try(InputStream input=getAssets().open("attendance.js")) {
                ByteArrayOutputStream buffer=new ByteArrayOutputStream();byte[] bytes=new byte[4096];int count;
                while((count=input.read(bytes))!=-1) buffer.write(bytes,0,count);
                source=buffer.toString("UTF-8");
            }
            long generation=pageGeneration;
            browser.evaluateJavascript("("+source+")("+request.toString()+")", encoded -> {
                if(generation!=pageGeneration || !isAttendancePage()) {message("Sayfa değişti. Yeniden deneyin.");return;}
                try {
                    Object decoded=new JSONTokener(encoded).nextValue();
                    if(!(decoded instanceof String)) throw new Exception();
                    JSONObject response=new JSONObject((String)decoded);
                    if(!response.optBoolean("ok")) {if(!"bind".equals(action)) message(response.optString("error","Ekran okunamadı."));return;}
                    callback.accept(response);
                } catch(Exception e) {message("Ekran yanıtı okunamadı. Hiçbir resmî kayıt gönderilmedi.");}
            });
        } catch(Exception e) {message("Devamsızlık okuyucu yüklenemedi.");}
    }
    private void chooseAttendance() {
        if(!isAttendancePage()) {message("Önce devamsızlık ekranında tarih ve gün bölümünü seçip Listele yapın.");return;}
        startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE),20);
    }
    private void previewAttendance(JSONObject draft) {
        runAttendance("preview",draft,null,response -> {
            try {
                JSONObject context=response.getJSONObject("context");
                StringBuilder summary=new StringBuilder();
                summary.append("Kurum: ").append(context.getString("institution")).append("\nTarih: ").append(context.getString("date")).append(" · ").append(context.getString("period"));
                summary.append("\nDeğişecek: ").append(response.getInt("changed")).append("\nDiğer gün bölümlerinde bekleyen: ").append(response.getInt("otherPeriods")).append("\n\n");
                JSONArray rows=response.getJSONArray("summary");
                for(int i=0;i<rows.length();i++) {JSONObject row=rows.getJSONObject(i);summary.append(row.getString("studentNumber")).append(" · ").append(row.getString("branch")).append(" · ").append(row.getInt("lessonOrder")).append(". ders: ").append("absent".equals(row.getString("before"))?"Gelmedi":"Geldi").append(" → ").append("absent".equals(row.getString("after"))?"Gelmedi":"Geldi").append("\n");}
                summary.append("\nYalnızca yukarıdaki satırlar doldurulur. Resmî Kaydet düğmesine siz basacaksınız. Gün tamamlandı kutusuna dokunulmaz.");
                TextView text=new TextView(this);text.setText(summary);text.setPadding(24,16,24,16);ScrollView scroll=new ScrollView(this);scroll.addView(text);
                long generation=pageGeneration;
                String token=response.getString("token");
                new AlertDialog.Builder(this).setTitle("Ders yoklaması önizlemesi").setView(scroll)
                    .setPositiveButton("Kontrol ettim, doldur",(d,w)->{
                        if(generation!=pageGeneration) {message("Sayfa değişti; dosyayı yeniden seçin.");return;}
                        runAttendance("apply",draft,token,applied->{
                            attendanceDraft=draft;filledGeneration=pageGeneration;
                            message("Kutular dolduruldu; henüz kaydedilmedi. Ekranı kontrol edip BİLSEM Kaydet düğmesine basın. Ardından yeniden Listele yapıp Kayıt Kontrol kullanın. Gerekirse Yenile ile listeyi tekrar açın.");
                        });
                    }).setNegativeButton("Vazgeç",null).show();
            } catch(Exception e) {message("Önizleme hazırlanamadı.");}
        });
    }
    private void verifyAttendance() {
        if(attendanceDraft==null) {message("Önce Yoklama JSON ile taslağı seçip doldurun.");return;}
        if(pageGeneration<=filledGeneration) {message("Doldurulan kutular kaydedildi anlamına gelmez. Resmî Kaydet işlemi sonrası Yenile ve Listele yapın; sonra Kayıt Kontrol kullanın.");return;}
        runAttendance("verify",attendanceDraft,null,response->{
            if(response.optBoolean("readbackMatches")) message("Yeniden yüklenen listede seçili gün bölümünün "+response.optInt("matched")+" satırı taslakla eşleşiyor. Diğer gün bölümlerini ayrıca aktarın; gün tamamlandı işaretlenmedi.");
            else message("Yeniden okunan listede "+response.optJSONArray("differences").length()+" satır taslaktan farklı. Kaydı ve tarihi kontrol edin; otomatik yeniden gönderim yapılmadı.");
        });
    }
    private void diagnoseAttendance() {
        runAttendance("diagnose",null,null,response->{
            new AlertDialog.Builder(this).setMessage("Kişisel bilgiler içermeyen tablo başlığı ve kutu türü tanı dosyası kaydedilsin mi?")
                .setPositiveButton("Kaydet",(d,w)->{pendingExport=response.toString();startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"bilsem-ekran-tani.json"),10);}).setNegativeButton("Vazgeç",null).show();
        });
    }
    private void clearSession() {
        new AlertDialog.Builder(this).setMessage("Bu uygulamadaki oturum ve web depolaması silinsin mi?")
            .setPositiveButton("Sil",(d,w)-> { attendanceDraft=null; filledGeneration=-1; browser.stopLoading(); browser.loadUrl("about:blank"); browser.clearHistory(); browser.clearCache(true); WebStorage.getInstance().deleteAllData(); CookieManager.getInstance().removeAllCookies(ok->{CookieManager.getInstance().flush(); message("Oturum silindi. MEBBİS düğmesiyle yeniden başlayabilirsiniz.");}); })
            .setNegativeButton("Vazgeç",null).show();
    }
    @Override public void onBackPressed() { if(browser.canGoBack()) browser.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { browser.destroy(); pendingExport=null; attendanceDraft=null; super.onDestroy(); }
}
