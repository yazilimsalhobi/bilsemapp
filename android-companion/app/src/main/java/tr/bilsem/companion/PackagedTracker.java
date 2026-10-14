package tr.bilsem.companion;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;

final class PackagedTracker {
    static WebResourceResponse serve(Context context,String method,Uri uri) {
        if(!"GET".equals(method)||!"https".equals(uri.getScheme())||!"bilsemappp.vercel.app".equals(uri.getHost()))return null;
        String path=uri.getPath();
        if(path==null||path.contains("..")||path.contains("\\"))return null;
        try {
            if("/native-start".equals(path)) {
                String html="<!doctype html><meta charset=utf-8><title>BİLSEM Takip</title><p>Uygulama açılıyor…</p><script>(async()=>{try{if('serviceWorker'in navigator){const registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.map(r=>r.unregister()));}if('caches'in window){await Promise.all((await caches.keys()).filter(k=>k.startsWith('bilsem-')).map(k=>caches.delete(k)));}}catch(e){}location.replace('/');})();</script>";
                return response("text/html",new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8)));
            }
            if(path.equals("/"))path="/index.html";
            if(!path.matches("/(index\\.html|manifest\\.json|sw\\.js|favicon\\.ico|privacy-policy\\.html|terms-of-service\\.html|(?:js|css|icons)/[A-Za-z0-9_./-]+)"))return null;
            InputStream input=context.getAssets().open("tracker"+path);
            if(path.equals("/index.html")) {
                ByteArrayOutputStream buffer=new ByteArrayOutputStream();byte[] bytes=new byte[4096];int count;while((count=input.read(bytes))!=-1)buffer.write(bytes,0,count);input.close();
                input=new ByteArrayInputStream(buffer.toString("UTF-8").replace("if ('serviceWorker' in navigator)","if (false)").getBytes(StandardCharsets.UTF_8));
            }
            String type=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".json")?"application/json":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".png")?"image/png":path.endsWith(".ico")?"image/x-icon":"text/html";
            return response(type,input);
        } catch(IOException error) {return null;}
    }
    private static WebResourceResponse response(String type,InputStream input) {
        HashMap<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-store");headers.put("X-Content-Type-Options","nosniff");
        return new WebResourceResponse(type,"UTF-8",200,"OK",headers,input);
    }
}
