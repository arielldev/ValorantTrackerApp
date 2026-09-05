package app.valostore.auth

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class ShopCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private const val KEY_COOKIES = "auth_cookies"
        private const val KEY_VAULT = "vault_key"
        private const val KEY_DATA_DIR = "data_dir"

        init {
            System.loadLibrary("valostore_lib")
        }

        @JvmStatic
        external fun nativeCheck(dataDir: String, cookies: String, keyB64: String, mode: String): String
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val ctx = applicationContext
        val mode = inputData.getString(ShopScheduler.MODE) ?: "daily"
        try {
            val store = SecureCookieStore(ctx)
            val cookies = store.get(KEY_COOKIES)
            val key = store.get(KEY_VAULT)
            if (cookies.isNullOrEmpty() || key.isNullOrEmpty()) return@withContext Result.success()
            val dataDir = store.get(KEY_DATA_DIR) ?: ctx.filesDir.absolutePath

            val raw = try {
                nativeCheck(dataDir, cookies, key, mode)
            } catch (t: Throwable) {
                "{\"ok\":false,\"error\":\"${t.message}\"}"
            }
            val json = JSONObject(raw)
            if (json.optBoolean("ok")) {
                json.optString("cookies").takeIf { it.isNotEmpty() }?.let { store.put(KEY_COOKIES, it) }
                val notices = json.optJSONArray("notices")
                if (notices != null) {
                    for (i in 0 until notices.length()) {
                        val n = notices.optJSONObject(i) ?: continue
                        Notifier.show(ctx, n, i)
                    }
                }
            } else if (runAttemptCount < 3) {
                return@withContext Result.retry()
            }
            Result.success()
        } finally {
            ShopScheduler.scheduleNext(ctx, mode)
        }
    }
}
