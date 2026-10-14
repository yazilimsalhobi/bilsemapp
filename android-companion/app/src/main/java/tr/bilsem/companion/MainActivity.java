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
        status.setText("Okuma prototipi • Girişi siz yapın, Öğretmen Bilgileri sayfasında Verileri Oku'ya dokunun.");
        layout.addView(status);
        LinearLayout bar = new LinearLayout(this);
        addButton(bar, "MEBBİS", () -> open("https://mebbis.meb.gov.tr/"));
        addButton(bar, "Verileri Oku", this::readTables);
        addButton(bar, "Oturumu Sil", this::clearSession);
        layout.addView(bar);
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
            @Override public void onPageFinished(WebView view, String url) {
                message(trusted(url) ? "Sayfa açık. Öğretmen Bilgileri ekranında Verileri Oku'ya dokunun." : "Bu sayfadan veri okunamaz.");
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
        if(request==10) {
            if(result==RESULT_OK && intent!=null && pendingExport!=null) {
                try(OutputStream output=getContentResolver().openOutputStream(intent.getData())) {
                    if(output==null) throw new IOException();
                    output.write(pendingExport.getBytes(StandardCharsets.UTF_8)); message("JSON kaydedildi. Bu sürüm bilsemapp'e otomatik aktarmıyor; BİLSEM kaydı değiştirmedi.");
                } catch(Exception e) { message("Dosya kaydedilemedi."); }
            }
            pendingExport=null;
        }
    }
    private void clearSession() {
        new AlertDialog.Builder(this).setMessage("Bu uygulamadaki oturum ve web depolaması silinsin mi?")
            .setPositiveButton("Sil",(d,w)-> { browser.stopLoading(); browser.loadUrl("about:blank"); browser.clearHistory(); browser.clearCache(true); WebStorage.getInstance().deleteAllData(); CookieManager.getInstance().removeAllCookies(ok->{CookieManager.getInstance().flush(); message("Oturum silindi. MEBBİS düğmesiyle yeniden başlayabilirsiniz.");}); })
            .setNegativeButton("Vazgeç",null).show();
    }
    @Override public void onBackPressed() { if(browser.canGoBack()) browser.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { browser.destroy(); pendingExport=null; super.onDestroy(); }
}
