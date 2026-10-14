package tr.bilsem.companion;

import android.app.*;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import java.util.ArrayList;
import android.content.Intent;
import android.net.Uri;
import android.webkit.*;
import android.widget.*;
import android.view.ViewGroup;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.io.*;

public class MainActivity extends Activity {
    private WebView browser, tracker;
    private boolean showingTracker=true, browserLoading, nativeBusy;
    private final Handler automationHandler=new Handler(Looper.getMainLooper());
    private TransferJob job;
    private CredentialVault credentialVault;
    private ValueCallback<Uri[]> trackerFiles;
    private String lastTransfer="Henüz işlem yapılmadı.";
    private final Runnable automationTick=new Runnable() {
        @Override public void run() {pollTransfer();automationHandler.postDelayed(this,900);}
    };
    private static class TransferJob {
        String requestId,owner,phase="prepare",token;
        JSONObject draft,before;
        ArrayList<String> periods=new ArrayList<>();
        int index,verified;
        boolean credentialsTried,needsResolution;
        long since=SystemClock.elapsedRealtime();
    }
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
        credentialVault=new CredentialVault(this);
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {return PackagedTracker.serve(MainActivity.this,request.getMethod(),request.getUrl());}
        });
        LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL);
        layout.setOnApplyWindowInsetsListener((view,insets)->{
            if(android.os.Build.VERSION.SDK_INT>=30) {android.graphics.Insets bars=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);}
            else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        status = new TextView(this); status.setPadding(16,8,16,8);
        status.setText("BİLSEM Takip 0.4 • Yoklama ve MEBBİS gönderimi");
        layout.addView(status);
        LinearLayout bar = new LinearLayout(this);
        addButton(bar,"BİLSEM Takip",()->showTracker(true));
        addButton(bar,"MEBBİS",()->showTracker(false));
        addButton(bar,"Ayarlar",this::showTools);
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
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) { pageGeneration++; browserLoading=true; }
            @Override public void onPageFinished(WebView view, String url) {
                browserLoading=false;
                if (isAttendancePage()) runAttendance("bind", null, null, result -> {});
                if(job==null) message("BİLSEM Takip’ten kayıtları seçip MEBBİS’e işle düğmesine basın.");
            }
        });
        // BİLSEM module may open in a new tab. Route its trusted URL to the main view.
        browser.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, android.os.Message result) {
                if (!userGesture && job==null) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        open(request.getUrl().toString()); v.destroy(); return true;
                    }
                });
                ((WebView.WebViewTransport)result.obj).setWebView(popup); result.sendToTarget(); return true;
            }
        });
        tracker=new WebView(this);
        tracker.getSettings().setJavaScriptEnabled(true);tracker.getSettings().setDomStorageEnabled(true);
        tracker.getSettings().setAllowFileAccess(false);tracker.getSettings().setAllowContentAccess(true);
        tracker.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        tracker.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) {return PackagedTracker.serve(MainActivity.this,request.getMethod(),request.getUrl());}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                if(request.isForMainFrame()&&!trustedTracker(request.getUrl().toString())) {
                    message("BİLSEM Takip dışındaki bağlantıyı cihaz tarayıcısında açın.");return true;
                }
                return false;
            }
        });
        // JavaScript alert/confirm dialogs used by the tracker retain Android's normal UI.
        tracker.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams parameters) {
                if(!trustedTracker(view.getUrl()))return false;
                if(trackerFiles!=null)trackerFiles.onReceiveValue(null);
                trackerFiles=callback;
                try{startActivityForResult(parameters.createIntent(),30);}catch(Exception error){trackerFiles.onReceiveValue(null);trackerFiles=null;message("Dosya seçici açılamadı.");}
                return true;
            }
        });
        layout.addView(tracker,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1));
        layout.addView(browser,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1));
        setContentView(layout);browser.setVisibility(android.view.View.GONE);
        tracker.loadUrl("https://bilsemappp.vercel.app/native-start");
        message("Devamsızlıkları seçin → Yoklamayı kaydet ve MEBBİS’e işle. Gönderim sonucunu burada görebilirsiniz.");
        if(!getPreferences(MODE_PRIVATE).getBoolean("credentialsSetupShown",false)) {
            getPreferences(MODE_PRIVATE).edit().putBoolean("credentialsSetupShown",true).apply();
            new AlertDialog.Builder(this).setTitle("MEBBİS girişini hatırla")
                .setMessage("İsterseniz MEBBİS kullanıcı adı ve şifrenizi bu cihazda şifreli saklayabilirsiniz. Yoklamayı gönderdiğinizde tanınan MEBBİS giriş ekranında bir kez kullanılır. Doğrulama kodunu siz girersiniz.")
                .setPositiveButton("Girişi tanımla",(d,w)->showCredentialSettings()).setNegativeButton("Daha sonra",null).show();
        }
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
        if(request==30) {
            if(trackerFiles!=null){trackerFiles.onReceiveValue(trustedTracker(tracker.getUrl())?WebChromeClient.FileChooserParams.parseResult(result,intent):null);trackerFiles=null;}return;
        }
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
    private boolean trustedTracker(String url) {
        if(url==null)return false;Uri uri=Uri.parse(url);
        return "https".equals(uri.getScheme()) && "bilsemappp.vercel.app".equals(uri.getHost());
    }
    private void showTracker(boolean selected) {
        showingTracker=selected;tracker.setVisibility(selected?android.view.View.VISIBLE:android.view.View.GONE);
        browser.setVisibility(selected?android.view.View.GONE:android.view.View.VISIBLE);
        if(!selected && browser.getUrl()==null) open("https://mebbis.meb.gov.tr/");
    }
    private void showTools() {
        String[] items={"MEBBİS girişini hatırla / değiştir","İşlem sonucu","İşlemi durdur","Programı oku (eski araç)","Yoklama JSON (eski araç)","Kayıt kontrol (eski araç)","Ekranı tanı","Sayfayı yenile","Oturumları sil"};
        new AlertDialog.Builder(this).setTitle("Araçlar").setItems(items,(d,index)->{
            if(index==0){showCredentialSettings();return;}
            switch(index-1) {
                case 0:new AlertDialog.Builder(this).setMessage(lastTransfer).setPositiveButton("Tamam",null).show();break;
                case 1:finishTransfer("cancelled","İşlem durduruldu. Kaydetme başlamışsa sonucun kontrol edilmesi gerekir.");break;
                case 2:readTables();break;case 3:chooseAttendance();break;case 4:verifyAttendance();break;
                case 5:diagnoseAttendance();break;case 6:(showingTracker?tracker:browser).reload();break;case 7:clearSession();break;
            }
        }).show();
    }
    private String asset(String name) throws IOException {
        try(InputStream input=getAssets().open(name)) {ByteArrayOutputStream buffer=new ByteArrayOutputStream();byte[] bytes=new byte[4096];int count;while((count=input.read(bytes))!=-1) buffer.write(bytes,0,count);return buffer.toString("UTF-8");}
    }
    private JSONObject decoded(String encoded) throws Exception {
        Object value=new JSONTokener(encoded).nextValue();if(!(value instanceof String))throw new Exception();return new JSONObject((String)value);
    }
    private void pollTransfer() {
        if(job!=null && SystemClock.elapsedRealtime()-job.since>90000) {finishTransfer("stopped","Ekran beklenen yanıtı vermedi. İşlem durdu; son kayıt yeniden gönderilmeyecek. Kontrol edilmesi gerekiyor.");nativeBusy=false;return;}
        if(nativeBusy || !trustedTracker(tracker.getUrl()))return;
        nativeBusy=true;
        final TransferJob active=job;
        tracker.evaluateJavascript("(()=>{window.BilsemAndroid={version:4};return JSON.stringify({owner:typeof Store!=='undefined'?Store.userId:null,request:"+(active==null?"typeof NativeTransfer!=='undefined'?NativeTransfer.takeRequest():null":"null")+"});})()",encoded->{
            try {
                JSONObject response=decoded(encoded);
                if(active!=null && active==job) {
                    if(!active.owner.equals(response.optString("owner"))) {nativeBusy=false;finishTransfer("stopped","BİLSEM Takip hesabı değişti; aktarım durdu.");return;}
                    advanceTransfer(active);return;
                }
                JSONObject request=response.optJSONObject("request");
                if(active==null && job==null && request!=null) startTransfer(request);
            } catch(Exception e) {if(active!=null) finishTransfer("stopped","BİLSEM Takip oturumu doğrulanamadı; aktarım durdu.");}
            nativeBusy=false;
        });
    }
    private void startTransfer(JSONObject request) throws Exception {
        JSONObject draft=request.getJSONObject("draft");JSONArray rows=draft.getJSONArray("rows");
        if((!"bilsem-attendance-draft".equals(draft.optString("format"))&&!"bilsem-attendance-selection".equals(draft.optString("format"))) || draft.optInt("version")!=1 || draft.optBoolean("submitted",true) || draft.getJSONArray("blocked").length()!=0 || rows.length()<1 || rows.length()>5000) throw new Exception();
        TransferJob next=new TransferJob();next.requestId=request.getString("requestId");next.owner=request.getString("owner");next.draft=draft;next.needsResolution="bilsem-attendance-selection".equals(draft.optString("format"));
        if(next.requestId.length()>100||next.owner.isEmpty()||next.owner.length()>200)throw new Exception();
        for(int i=0;i<rows.length();i++) {
            JSONObject row=rows.getJSONObject(i);
            if(next.needsResolution) {if(!"absent".equals(row.optString("status"))||row.optString("studentName").isEmpty()||row.optString("localGroupId").isEmpty()||row.optString("localStudentId").isEmpty())throw new Exception();continue;}
            String period=row.getString("period");
            if(!"present".equals(row.optString("status"))&&!"absent".equals(row.optString("status")))throw new Exception();
            if(!period.equals("Sabah")&&!period.equals("Öğle")&&!period.equals("Akşam"))throw new Exception();
            if(!next.periods.contains(period))next.periods.add(period);
        }
        job=next;showTracker(false);message("MEBBİS girişini tamamlayın. Seçilen "+rows.length()+" ders kaydı girişten sonra işlenecek.");
        notifyTracker("running","MEBBİS girişi bekleniyor.",next);
    }
    private void notifyTracker(String state,String message,TransferJob active) {
        if(active==null||!trustedTracker(tracker.getUrl()))return;
        try {JSONObject result=new JSONObject().put("requestId",active.requestId).put("state",state).put("message",message).put("verified",active.verified).put("selected",active.draft.getJSONArray("rows").length());
            tracker.evaluateJavascript("if(typeof NativeTransfer!=='undefined')NativeTransfer.result("+result.toString()+");",null);
        } catch(Exception ignored) {}
    }
    private void finishTransfer(String state,String text) {
        TransferJob active=job;job=null;lastTransfer=text;message(text);notifyTracker(state,text,active);if("completed".equals(state))showTracker(true);
    }
    private void nextTransferBatch(TransferJob active,int count) {
        active.verified+=count;active.index++;active.phase="prepare";active.since=SystemClock.elapsedRealtime();
        if(active.index>=active.periods.size()) finishTransfer("completed",active.verified+" seçili ders kaydı yeniden okunan BİLSEM listesiyle eşleşiyor. İşlem tamamlandı.");
    }
    private String phaseLabel(String phase) {
        switch(phase) {
            case "prepare":return "Tarih ve gün bölümü seçiliyor";
            case "listWait":return "Ders listesi yükleniyor";
            case "inspect":return "Öğrenci ve dersler eşleştiriliyor";
            case "commit":return "Seçilen kayıtlar işleniyor";
            case "saveWait":return "Kayıt yanıtı bekleniyor";
            case "recheckPrepare":case "recheckWait":return "Kayıtlar yeniden okunuyor";
            case "verify":return "Sonuç doğrulanıyor";
            default:return "İşlem sürüyor";
        }
    }
    private void advanceTransfer(TransferJob active) {
        if(browserLoading) {nativeBusy=false;return;}
        try {
            JSONObject request=new JSONObject().put("draft",active.draft).put("period",active.periods.isEmpty()?"":active.periods.get(active.index));
            String action;
            if(active.needsResolution) action="resolve";
            else if(!isAttendancePage()) action="navigate";
            else switch(active.phase) {
                case "prepare":case "recheckPrepare":action="prepare";break;
                case "listWait":case "recheckWait":action="awaitList";request.put("before",active.before);break;
                case "inspect":action="inspect";break;
                case "commit":action="commit";request.put("token",active.token);active.phase="saveWait";break;
                case "saveWait":action="awaitSave";request.put("before",active.before);break;
                case "verify":action="verify";break;
                default:throw new Exception();
            }
            request.put("action",action);
            String script="("+asset("automation.js")+")("+request.toString()+",("+asset("attendance.js")+"),()=> ("+asset("extract.js")+"),("+asset("resolve-selection.js")+"))";
            browser.evaluateJavascript(script,encoded->{
                nativeBusy=false;if(active!=job)return;
                try {
                    JSONObject result=decoded(encoded);
                    if(!result.optBoolean("ok")) {finishTransfer("stopped",result.optString("error")+" Doğrulanan: "+active.verified+". Sonraki kayıtlar işlenmedi.");return;}
                    String state=result.optString("state");
                    switch(state) {
                        case "resolved":acceptResolution(active,result.getJSONObject("resolution"));return;
                        case "login":active.since=SystemClock.elapsedRealtime();if(tryRememberedLogin(active))return;message("MEBBİS girişini ve varsa doğrulama kodunu tamamlayın; işlem ardından devam edecek.");return;
                        case "navigate":browser.loadUrl(result.getString("url"));return;
                        case "navigating":case "ready":case "filter":return;
                        case "listed":active.before=result.getJSONObject("before");active.phase=active.phase.equals("recheckPrepare")?"recheckWait":"listWait";break;
                        case "fresh":active.phase=active.phase.equals("saveWait")?"recheckPrepare":active.phase.equals("recheckWait")?"verify":"inspect";break;
                        case "waiting":return;
                        case "inspected":active.token=result.getString("token");active.before=result.getJSONObject("marker");if(result.getInt("changed")==0) {nextTransferBatch(active,result.getJSONArray("summary").length());return;}active.phase="commit";break;
                        case "already":nextTransferBatch(active,result.getInt("count"));return;
                        case "submitted":active.before=result.getJSONObject("before");active.phase="saveWait";break;
                        case "verified":if(result.optBoolean("readbackMatches")) {nextTransferBatch(active,result.getInt("matched"));return;}finishTransfer("stopped","Kaydet sonrası yeniden okunan listede farklılık var. Otomatik tekrar gönderilmedi. Doğrulanan: "+active.verified);return;
                    }
                    active.since=SystemClock.elapsedRealtime();message("MEBBİS aktarımı · "+active.periods.get(active.index)+" · "+phaseLabel(active.phase)+" · Doğrulanan "+active.verified);
                } catch(Exception e) {
                    // A navigation can replace the document while a Save callback returns.
                    // Never retry Save; wait for the new page and read back instead.
                    if(!active.phase.equals("saveWait")) finishTransfer("stopped","Ekran yanıtı tanınamadı. Aktarım durdu; kayıtlar kontrol edilmeli.");
                }
            });
        } catch(Exception e) {nativeBusy=false;finishTransfer("stopped","Aktarım adımı hazırlanamadı. İşlem durdu.");}
    }
    private void acceptResolution(TransferJob active,JSONObject resolution) {
        if(active!=job||!trustedTracker(tracker.getUrl()))return;
        try {
            nativeBusy=true;
            tracker.evaluateJavascript("JSON.stringify(typeof NativeTransfer!=='undefined'?NativeTransfer.resolved("+JSONObject.quote(active.requestId)+","+resolution.toString()+"):{ok:false,error:'Takip ekranı hazır değil'})",encoded->{
                nativeBusy=false;if(active!=job)return;
                try {
                    JSONObject ack=decoded(encoded);
                    if(!ack.optBoolean("ok")){finishTransfer("stopped",ack.optString("error","Eşleştirme kaydedilemedi. Resmî kayıt yapılmadı."));return;}
                    active.draft=resolution.getJSONObject("draft");active.periods.clear();
                    JSONArray rows=active.draft.getJSONArray("rows");
                    for(int i=0;i<rows.length();i++){String period=rows.getJSONObject(i).getString("period");if(!active.periods.contains(period))active.periods.add(period);}
                    active.needsResolution=false;active.phase="prepare";active.since=SystemClock.elapsedRealtime();
                    message("Program ve öğrenciler MEBBİS’ten eşleştirildi. Seçilen devamsızlıklar işleniyor.");
                }catch(Exception e){finishTransfer("stopped","Eşleştirme yanıtı doğrulanamadı. Resmî kayıt yapılmadı.");}
            });
        }catch(Exception e){nativeBusy=false;finishTransfer("stopped","Eşleştirme takip hesabına aktarılamadı. Resmî kayıt yapılmadı.");}
    }
    private void showCredentialSettings() {
        LinearLayout content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(28,16,28,8);
        TextView explanation=new TextView(this);explanation.setText("MEBBİS girişi yalnızca bu cihazda Android Keystore ile şifreli saklanır. Uygulama hesabına veya buluta gönderilmez. Doğrulama kodları saklanmaz.");content.addView(explanation);
        EditText username=new EditText(this);username.setHint("MEBBİS kullanıcı adı / T.C. kimlik no");username.setSingleLine(true);username.setInputType(android.text.InputType.TYPE_CLASS_TEXT);username.setAutofillHints(android.view.View.AUTOFILL_HINT_USERNAME);content.addView(username);
        EditText password=new EditText(this);password.setHint("MEBBİS şifresi");password.setSingleLine(true);password.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);password.setAutofillHints(android.view.View.AUTOFILL_HINT_PASSWORD);content.addView(password);
        try {JSONObject saved=credentialVault.read();if(saved!=null){username.setText(saved.optString("username"));password.setText(saved.optString("password"));}}catch(Exception e){message("Kayıtlı giriş açılamadı. Kaydı silip yeniden tanımlayabilirsiniz.");}
        TextView error=new TextView(this);content.addView(error);
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("MEBBİS giriş bilgileri").setView(content)
            .setPositiveButton("Şifreli kaydet ve kullan",null).setNegativeButton("Vazgeç",(d,w)->password.setText(""))
            .setNeutralButton("Kaydı sil",(d,w)->{try{credentialVault.clear();message("Kayıtlı MEBBİS girişi silindi.");}catch(Exception e){message("Giriş kaydı silinemedi.");}password.setText("");}).create();
        dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            String user=username.getText().toString().trim(),secret=password.getText().toString();
            if(user.isEmpty()||secret.isEmpty()){error.setText("Kullanıcı adı ve şifreyi girin.");return;}
            try {credentialVault.save(user,secret);password.setText("");dialog.dismiss();message("MEBBİS girişi bu cihazda şifreli saklandı. Gönderim sırasında kullanılacak.");}catch(Exception e){error.setText("Güvenli kayıt yapılamadı. Şifre saklanmadı; elle giriş kullanabilirsiniz.");}
        }));dialog.show();
    }
    private boolean tryRememberedLogin(TransferJob active) {
        Uri uri=Uri.parse(browser.getUrl()==null?"":browser.getUrl());
        if(active.credentialsTried||!"https".equals(uri.getScheme())||!"mebbis.meb.gov.tr".equals(uri.getHost())||!credentialVault.exists())return false;
        active.credentialsTried=true;
        try {
            JSONObject credentials=credentialVault.read();if(credentials==null)return false;
            String script="("+asset("credentials.js")+")("+credentials.toString()+")";
            credentials.remove("password");credentials.remove("username");nativeBusy=true;
            browser.evaluateJavascript(script,encoded->{
                nativeBusy=false;if(active!=job)return;
                try {
                    String state=decoded(encoded).optString("state");
                    if("submitted".equals(state))message("Kayıtlı giriş kullanıldı. MEBBİS yanıtı veya doğrulama kodu bekleniyor.");
                    else if("verification".equals(state))message("Kullanıcı adı ve şifre dolduruldu. MEBBİS doğrulama/güvenlik kodunu siz girin.");
                    else if("filled".equals(state))message("Kayıtlı giriş dolduruldu. MEBBİS Giriş düğmesini kullanın.");
                    else message("Giriş ekranı veya kullanıcı eşleşmedi. Şifre tekrar denenmeyecek; elle giriş yapın.");
                }catch(Exception e){message("Giriş yanıtı alınamadı. Güvenlik için otomatik tekrar yapılmayacak.");}
            });return true;
        }catch(Exception e){nativeBusy=false;message("Kayıtlı giriş açılamadı. Ayarlardan yeniden tanımlayın veya elle giriş yapın.");return false;}
    }
    private void clearSession() {
        new AlertDialog.Builder(this).setMessage("Bu uygulamadaki oturumlar, web depolaması ve kayıtlı MEBBİS girişi silinsin mi?")
            .setPositiveButton("Sil",(d,w)-> { finishTransfer("cancelled","Bekleyen işlem durduruldu.");try{credentialVault.clear();}catch(Exception error){message("Kayıtlı şifre silinemedi. Ayarlardan Kaydı sil işlemini tekrar deneyin.");return;} attendanceDraft=null; filledGeneration=-1; tracker.stopLoading(); tracker.loadUrl("about:blank"); browser.stopLoading(); browser.loadUrl("about:blank"); browser.clearHistory(); browser.clearCache(true); WebStorage.getInstance().deleteAllData(); CookieManager.getInstance().removeAllCookies(ok->{CookieManager.getInstance().flush(); message("Oturum silindi. MEBBİS düğmesiyle yeniden başlayabilirsiniz.");}); })
            .setNegativeButton("Vazgeç",null).show();
    }
    @Override public void onBackPressed() { WebView current=showingTracker?tracker:browser;if(current.canGoBack()) current.goBack();else if(!showingTracker)showTracker(true);else super.onBackPressed(); }
    @Override protected void onResume() {super.onResume();if(job!=null)job.since=SystemClock.elapsedRealtime();automationHandler.removeCallbacks(automationTick);automationHandler.post(automationTick);}
    @Override protected void onPause() {automationHandler.removeCallbacks(automationTick);super.onPause();}
    @Override protected void onDestroy() { automationHandler.removeCallbacksAndMessages(null);if(trackerFiles!=null){trackerFiles.onReceiveValue(null);trackerFiles=null;}tracker.destroy();browser.destroy(); job=null;pendingExport=null; attendanceDraft=null; super.onDestroy(); }
}
