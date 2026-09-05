package app.valostore.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureCookieStore(context: Context) {

    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "valostore_secure",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun get(key: String): String? = prefs.getString(key, null)

    fun put(key: String, value: String) {
        prefs.edit().putString(key, value).commit()
    }

    fun remove(key: String) {
        prefs.edit().remove(key).commit()
    }

    fun clear() {
        prefs.edit().clear().commit()
    }
}
