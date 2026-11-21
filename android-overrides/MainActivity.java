package com.heyhacene.cine3casinos;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ClipDrawable;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.LayerDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String CHROME_MOBILE_UA =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

    private LinearLayout portalContainer;
    private WebView portalWebView;
    private TextView portalTitleView;
    private ProgressBar progressBar;
    private OnBackPressedCallback portalBackCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView bridgeWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (bridgeWebView != null) {
            configureWebViewSettings(bridgeWebView);
            bridgeWebView.addJavascriptInterface(new CineCasinoBridge(), "CineCasinoNative");
        }

        setupPortalOverlay();

        portalBackCallback = new OnBackPressedCallback(false) {
            @Override
            public void handleOnBackPressed() {
                if (portalContainer != null && portalContainer.getVisibility() == View.VISIBLE) {
                    if (portalWebView != null && portalWebView.canGoBack()) {
                        portalWebView.goBack();
                    } else {
                        hidePortalInternal();
                    }
                }
            }
        };
        getOnBackPressedDispatcher().addCallback(this, portalBackCallback);
    }

    private void configureWebViewSettings(WebView wv) {
        WebSettings settings = wv.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(CHROME_MOBILE_UA);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(wv, true);
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            getResources().getDisplayMetrics()
        );
    }

    private Drawable createPillBackground(String hexColor, String strokeHex) {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(Color.parseColor(hexColor));
        gd.setCornerRadius(dp(10));
        if (strokeHex != null) {
            gd.setStroke(dp(1), Color.parseColor(strokeHex));
        }
        return gd;
    }

    private Button createToolbarButton(String label, String bgHex, String textHex, String strokeHex) {
        Button btn = new Button(this);
        btn.setText(label);
        btn.setAllCaps(false);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        btn.setTextColor(Color.parseColor(textHex));
        btn.setBackground(createPillBackground(bgHex, strokeHex));
        btn.setPadding(dp(12), 0, dp(12), 0);
        btn.setMinWidth(0);
        btn.setMinimumWidth(0);
        btn.setMinHeight(0);
        btn.setMinimumHeight(0);
        return btn;
    }

    private void setupPortalOverlay() {
        ViewGroup rootContent = findViewById(android.R.id.content);
        if (rootContent == null) return;

        portalContainer = new LinearLayout(this);
        portalContainer.setOrientation(LinearLayout.VERTICAL);
        portalContainer.setBackgroundColor(Color.parseColor("#090B10"));
        portalContainer.setVisibility(View.GONE);
        portalContainer.setClickable(true);
        portalContainer.setFocusable(true);

        ViewCompat.setOnApplyWindowInsetsListener(portalContainer, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(insets.left, insets.top, insets.right, insets.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setBackgroundColor(Color.parseColor("#090B10"));
        toolbar.setPadding(dp(10), dp(6), dp(10), dp(6));

        Button backBtn = createToolbarButton("← Retour aux films", "#F59E0B", "#090B10", "#FBBF24");
        backBtn.setOnClickListener(v -> hidePortalInternal());
        toolbar.addView(backBtn, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            dp(34)
        ));

        portalTitleView = new TextView(this);
        portalTitleView.setText("Billetterie 3 Casinos");
        portalTitleView.setTextColor(Color.WHITE);
        portalTitleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        portalTitleView.setSingleLine(true);
        portalTitleView.setEllipsize(TextUtils.TruncateAt.END);
        portalTitleView.setGravity(Gravity.CENTER_VERTICAL);
        portalTitleView.setPadding(dp(10), 0, dp(8), 0);
        toolbar.addView(portalTitleView, new LinearLayout.LayoutParams(
            0,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            1f
        ));

        Button reloadBtn = createToolbarButton("↻", "#181D2C", "#FFFFFF", "#262E45");
        reloadBtn.setOnClickListener(v -> {
            if (portalWebView != null) portalWebView.reload();
        });
        toolbar.addView(reloadBtn, new LinearLayout.LayoutParams(dp(38), dp(34)));

        portalContainer.addView(toolbar, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dp(46)
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setVisibility(View.GONE);
        LayerDrawable progressDrawable = new LayerDrawable(new Drawable[] {
            new ColorDrawable(Color.parseColor("#121621")),
            new ClipDrawable(new ColorDrawable(Color.parseColor("#F59E0B")), Gravity.LEFT, ClipDrawable.HORIZONTAL)
        });
        progressDrawable.setId(0, android.R.id.background);
        progressDrawable.setId(1, android.R.id.progress);
        progressBar.setProgressDrawable(progressDrawable);
        portalContainer.addView(progressBar, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dp(3)
        ));

        portalWebView = new WebView(this);
        configureWebViewSettings(portalWebView);
        portalWebView.getSettings().setLoadWithOverviewMode(true);
        portalWebView.getSettings().setUseWideViewPort(true);
        portalWebView.getSettings().setBuiltInZoomControls(true);
        portalWebView.getSettings().setDisplayZoomControls(false);

        portalWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (progressBar == null) return;
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        portalWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) return false;
                String scheme = uri.getScheme();
                String uriStr = uri.toString().toLowerCase();
                if (("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) && !uriStr.endsWith(".apk")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        portalContainer.addView(portalWebView, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ));

        rootContent.addView(portalContainer, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
    }

    private void openPortalInternal(String url, String title) {
        if (portalContainer == null || portalWebView == null) return;
        if (title != null && !title.trim().isEmpty() && portalTitleView != null) {
            portalTitleView.setText(title);
        } else if (portalTitleView != null) {
            portalTitleView.setText("Billetterie 3 Casinos");
        }
        portalContainer.setVisibility(View.VISIBLE);
        portalContainer.bringToFront();
        if (portalBackCallback != null) {
            portalBackCallback.setEnabled(true);
        }
        if (url != null && !url.trim().isEmpty()) {
            portalWebView.loadUrl(url);
        }
    }

    private void hidePortalInternal() {
        if (portalContainer != null) {
            portalContainer.setVisibility(View.GONE);
        }
        if (portalBackCallback != null) {
            portalBackCallback.setEnabled(false);
        }
        if (portalWebView != null) {
            portalWebView.loadUrl("about:blank");
        }
        CookieManager.getInstance().flush();
    }

    public class CineCasinoBridge {
        @JavascriptInterface
        public boolean isNativePortalSupported() {
            return true;
        }

        @JavascriptInterface
        public void openPortal(String url, String title) {
            runOnUiThread(() -> openPortalInternal(url, title));
        }

        @JavascriptInterface
        public void hidePortal() {
            runOnUiThread(MainActivity.this::hidePortalInternal);
        }

        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null || url.trim().isEmpty()) return;
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception ignored) {
                }
            });
        }
    }
}
