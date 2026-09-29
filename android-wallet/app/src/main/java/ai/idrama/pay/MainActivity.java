package ai.idrama.pay;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String START_URL = "https://lensbykai-bit.github.io/iDrama.ai/wallet.html";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(255,247,251));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                if (url.startsWith("http://") || url.startsWith("https://")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) showOfflinePage();
            }
        });

        if (savedInstanceState == null) webView.loadUrl(START_URL);
        else webView.restoreState(savedInstanceState);
    }

    private void showOfflinePage() {
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                "<style>body{margin:0;background:#fff7fb;color:#25151f;font-family:sans-serif;display:grid;place-items:center;min-height:100vh}" +
                ".c{max-width:360px;margin:24px;padding:28px;background:white;border:1px solid #ffd4e5;border-radius:28px;text-align:center;box-shadow:0 14px 40px rgba(255,43,122,.14)}" +
                ".l{width:72px;height:72px;border-radius:24px;background:linear-gradient(135deg,#ff2b7a,#ff66aa);display:grid;place-items:center;color:white;font-size:34px;margin:auto}" +
                "h1{margin:16px 0 8px}p{color:#7c6573;line-height:1.6}button{border:0;border-radius:16px;padding:14px 22px;background:#ff2b7a;color:white;font-weight:800;font-size:16px}</style></head>" +
                "<body><div class='c'><div class='l'>♥</div><h1>iDrama Pay</h1><p>មិនអាចភ្ជាប់អ៊ីនធឺណិតបានទេ។ សូមពិនិត្យ Internet ហើយសាកម្តងទៀត។</p><button onclick=\"location.href='" + START_URL + "'\">សាកម្តងទៀត</button></div></body></html>";
        webView.loadDataWithBaseURL(START_URL, html, "text/html", "UTF-8", null);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
