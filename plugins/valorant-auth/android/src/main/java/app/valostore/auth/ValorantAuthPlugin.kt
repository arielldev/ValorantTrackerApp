package app.valostore.auth

import android.app.Activity
import android.content.Intent
import android.webkit.CookieManager
import androidx.activity.result.ActivityResult
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class LoginArgs {
    var url: String = ""
    var redirectPrefix: String = ""
}

@InvokeArg
class ScheduleArgs {
    var dailyEnabled: Boolean = false
    var hour: Int = 0
    var minute: Int = 0
    var rotationEnabled: Boolean = false
}

@InvokeArg
class SecretArgs {
    var key: String = ""
    var value: String? = null
}

@TauriPlugin
class ValorantAuthPlugin(private val activity: Activity) : Plugin(activity) {

    private val store by lazy { SecureCookieStore(activity) }

    @Command
    fun login(invoke: Invoke) {
        val args = invoke.parseArgs(LoginArgs::class.java)
        val intent = Intent(activity, LoginActivity::class.java)
            .putExtra(LoginActivity.EXTRA_URL, args.url)
            .putExtra(LoginActivity.EXTRA_REDIRECT_PREFIX, args.redirectPrefix)
        startActivityForResult(invoke, intent, "onLoginResult")
    }

    @ActivityCallback
    fun onLoginResult(invoke: Invoke, result: ActivityResult) {
        val data = result.data
        if (result.resultCode != Activity.RESULT_OK || data == null) {
            invoke.reject("cancelled")
            return
        }
        val ret = JSObject()
        ret.put("redirectUrl", data.getStringExtra(LoginActivity.RESULT_REDIRECT_URL) ?: "")
        ret.put("cookies", data.getStringExtra(LoginActivity.RESULT_COOKIES) ?: "")
        invoke.resolve(ret)
    }

    @Command
    fun getSecret(invoke: Invoke) {
        val args = invoke.parseArgs(SecretArgs::class.java)
        val ret = JSObject()
        val value = store.get(args.key)
        if (value == null) ret.put("value", org.json.JSONObject.NULL) else ret.put("value", value)
        invoke.resolve(ret)
    }

    @Command
    fun setSecret(invoke: Invoke) {
        val args = invoke.parseArgs(SecretArgs::class.java)
        val value = args.value
        if (value == null) store.remove(args.key) else store.put(args.key, value)
        invoke.resolve()
    }

    @Command
    fun scheduleDaily(invoke: Invoke) {
        val args = invoke.parseArgs(ScheduleArgs::class.java)
        ShopScheduler.configure(activity.applicationContext, args.dailyEnabled, args.hour, args.minute, args.rotationEnabled)
        invoke.resolve()
    }

    @Command
    fun cancelDaily(invoke: Invoke) {
        ShopScheduler.cancel(activity.applicationContext)
        invoke.resolve()
    }

    @Command
    fun clear(invoke: Invoke) {
        ShopScheduler.cancel(activity.applicationContext)
        store.clear()
        val cm = CookieManager.getInstance()
        cm.removeAllCookies { cm.flush() }
        invoke.resolve()
    }
}
