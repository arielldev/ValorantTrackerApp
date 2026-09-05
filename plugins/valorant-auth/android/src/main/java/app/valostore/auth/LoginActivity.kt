package app.valostore.auth

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout

class LoginActivity : Activity() {

    companion object {
        const val EXTRA_URL = "url"
        const val EXTRA_REDIRECT_PREFIX = "redirectPrefix"
        const val RESULT_REDIRECT_URL = "redirectUrl"
        const val RESULT_COOKIES = "cookies"
        private const val AUTH_ORIGIN = "https://auth.riotgames.com"
    }

    private lateinit var webView: WebView
    private var finished = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val url = intent.getStringExtra(EXTRA_URL) ?: run { cancel(); return }
        val redirectPrefix = intent.getStringExtra(EXTRA_REDIRECT_PREFIX) ?: "https://playvalorant.com/opt_in"

        val root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#0A0A0C")) }
        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            setBackgroundColor(Color.parseColor("#0A0A0C"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.userAgentString = settings.userAgentString.replace("; wv", "")
        }
        root.addView(webView)
        setContentView(root)

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val target = request.url.toString()
                if (target.startsWith(redirectPrefix)) {
                    complete(target)
                    return true
                }
                return false
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                if (url.startsWith(redirectPrefix)) {
                    complete(url)
                    return true
                }
                return false
            }
        }

        webView.loadUrl(url)
    }

    private fun complete(redirectUrl: String) {
        if (finished) return
        finished = true
        val cm = CookieManager.getInstance()
        cm.flush()
        val cookies = cm.getCookie(AUTH_ORIGIN) ?: ""
        val data = Intent()
            .putExtra(RESULT_REDIRECT_URL, redirectUrl)
            .putExtra(RESULT_COOKIES, cookies)
        setResult(RESULT_OK, data)
        finish()
    }

    private fun cancel() {
        if (finished) return
        finished = true
        setResult(RESULT_CANCELED)
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            cancel()
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }
}
