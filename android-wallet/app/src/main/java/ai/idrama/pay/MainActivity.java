package ai.idrama.pay;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String HOME = "file:///android_asset/index.html";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView webView;
    private FrameLayout container;
    private LinearLayout errorPanel;
    private TextView errorText;
    private ProgressBar progress;
    private String retryUrl = HOME;
    private boolean failed;
    private final Runnable timeout = () -> {
        if (webView != null) webView.stopLoading();
        showError("ការផ្ទុកចំណាយពេលយូរ។ សូមពិនិត្យ Internet ហើយសាកម្តងទៀត។");
    };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        container = new FrameLayout(this);
        container.setBackgroundColor(Color.rgb(246, 247, 251));
        setContentView(container);
        if (android.os.Build.VERSION.SDK_INT >= 35) {
            container.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        createWebView();
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams bar = new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP);
        container.addView(progress, bar);
        createErrorPanel();
        // Always render the bundled screen on launch, including Activity recreation.
        // Restoring an empty WebView history was capable of leaving no document to draw.
        webView.loadUrl(HOME);
    }

    private int dp(int value) { return (int)(value * getResources().getDisplayMetrics().density + .5f); }

    private void createWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(246, 247, 251));
        container.addView(webView, 0, new FrameLayout.LayoutParams(-1, -1));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                if (progress != null) progress.setProgress(value);
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                failed = false;
                retryUrl = url;
                if (errorPanel != null) errorPanel.setVisibility(View.GONE);
                if (progress != null) progress.setVisibility(View.VISIBLE);
                handler.removeCallbacks(timeout);
                handler.postDelayed(timeout, 20000);
            }
            @Override public void onPageFinished(WebView view, String url) {
                handler.removeCallbacks(timeout);
                if (progress != null) progress.setVisibility(View.GONE);
                if (!failed && errorPanel != null) errorPanel.setVisibility(View.GONE);
                if (HOME.equals(url)) view.evaluateJavascript(
                    "(function(){var w=document.querySelector('.wrap'),r=w.getBoundingClientRect(),s=getComputedStyle(w);return JSON.stringify({ready:document.readyState,width:innerWidth,height:innerHeight,scroll:scrollY,body:document.body.innerText,wrap:{x:r.x,y:r.y,w:r.width,h:r.height,display:s.display,visibility:s.visibility,opacity:s.opacity}})})()",
                    result -> android.util.Log.i("WalletDebug", result));
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError("មិនអាចផ្ទុកទំព័របានទេ។ សូមសាកម្តងទៀត ឬត្រឡប់ទៅទំព័រមេ។");
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400)
                    showError("ទំព័រនេះមិនអាចប្រើបានបណ្ដោះអាសន្ន (HTTP " + response.getStatusCode() + ")។");
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return route(request.getUrl().toString());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return route(url); }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                container.removeView(view);
                view.destroy();
                webView = null;
                showError("ផ្នែកបង្ហាញបានឈប់។ សូមចុចទំព័រមេដើម្បីបើកឡើងវិញ។");
                return true;
            }
        });
    }

    private boolean route(String url) {
        if (HOME.equals(url) || url.startsWith(HOME + "#")) return false;
        Uri uri = Uri.parse(url);
        if ("https".equalsIgnoreCase(uri.getScheme())) return false;
        if ("about:blank".equals(url)) return false;
        if ("tg".equals(uri.getScheme()) || "mailto".equals(uri.getScheme()) || "tel".equals(uri.getScheme())) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
            catch (Exception e) { showError("មិនអាចបើក Link នេះបានទេ។"); }
        }
        return true;
    }

    private void createErrorPanel() {
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(28), dp(28), dp(28), dp(28));
        errorPanel.setBackgroundColor(Color.rgb(246, 247, 251));
        TextView title = new TextView(this);
        title.setText("iDrama Pay");
        title.setTextColor(Color.rgb(217, 47, 118));
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER);
        errorPanel.addView(title);
        errorText = new TextView(this);
        errorText.setTextSize(16);
        errorText.setTextColor(Color.rgb(36, 36, 56));
        errorText.setGravity(Gravity.CENTER);
        errorText.setPadding(0, dp(20), 0, dp(20));
        errorPanel.addView(errorText);
        Button retry = new Button(this);
        retry.setText("សាកម្តងទៀត / Retry");
        retry.setOnClickListener(v -> load(retryUrl));
        errorPanel.addView(retry, new LinearLayout.LayoutParams(-1, -2));
        Button home = new Button(this);
        home.setText("ទំព័រមេ / Home");
        home.setOnClickListener(v -> load(HOME));
        errorPanel.addView(home, new LinearLayout.LayoutParams(-1, -2));
        errorPanel.setVisibility(View.GONE);
        container.addView(errorPanel, new FrameLayout.LayoutParams(-1, -1));
    }

    private void load(String url) {
        if (webView == null) createWebView();
        errorPanel.setVisibility(View.GONE);
        webView.loadUrl(url == null ? HOME : url);
    }

    private void showError(String message) {
        failed = true;
        handler.removeCallbacks(timeout);
        if (progress != null) progress.setVisibility(View.GONE);
        if (errorPanel != null) {
            errorText.setText(message);
            errorPanel.setVisibility(View.VISIBLE);
        }
    }

    @Override public void onBackPressed() {
        if (errorPanel.getVisibility() == View.VISIBLE) load(HOME);
        else if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (webView != null) {
            container.removeView(webView);
            webView.destroy();
        }
        super.onDestroy();
    }
}
