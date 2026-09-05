package app.valostore.auth

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import java.util.Calendar
import java.util.TimeZone
import java.util.concurrent.TimeUnit

object ShopScheduler {
    private const val PREFS = "valostore_schedule"
    private const val KEY_DAILY = "daily"
    private const val KEY_HOUR = "hour"
    private const val KEY_MINUTE = "minute"
    private const val KEY_ROTATION = "rotation"
    const val WORK_DAILY = "valostore-daily"
    const val WORK_ROTATION = "valostore-rotation"
    const val MODE = "mode"

    fun configure(context: Context, dailyEnabled: Boolean, hour: Int, minute: Int, rotationEnabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_DAILY, dailyEnabled)
            .putInt(KEY_HOUR, hour)
            .putInt(KEY_MINUTE, minute)
            .putBoolean(KEY_ROTATION, rotationEnabled)
            .apply()
        val wm = WorkManager.getInstance(context)
        if (dailyEnabled) enqueue(context, WORK_DAILY, "daily", delayUntilLocal(hour, minute)) else wm.cancelUniqueWork(WORK_DAILY)
        if (rotationEnabled) enqueue(context, WORK_ROTATION, "rotation", delayUntilRotation()) else wm.cancelUniqueWork(WORK_ROTATION)
    }

    fun cancel(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
        val wm = WorkManager.getInstance(context)
        wm.cancelUniqueWork(WORK_DAILY)
        wm.cancelUniqueWork(WORK_ROTATION)
    }

    fun scheduleNext(context: Context, mode: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        when (mode) {
            "daily" -> if (prefs.getBoolean(KEY_DAILY, false)) {
                enqueue(context, WORK_DAILY, "daily", delayUntilLocal(prefs.getInt(KEY_HOUR, 0), prefs.getInt(KEY_MINUTE, 5)))
            }
            else -> if (prefs.getBoolean(KEY_ROTATION, false)) {
                enqueue(context, WORK_ROTATION, "rotation", delayUntilRotation())
            }
        }
    }

    private fun enqueue(context: Context, name: String, mode: String, delayMs: Long) {
        val request = OneTimeWorkRequestBuilder<ShopCheckWorker>()
            .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setInputData(workDataOf(MODE to mode))
            .addTag(name)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(name, ExistingWorkPolicy.REPLACE, request)
    }

    private fun delayUntilLocal(hour: Int, minute: Int): Long {
        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 30)
            set(Calendar.MILLISECOND, 0)
        }
        if (target.timeInMillis <= now.timeInMillis + 60_000) target.add(Calendar.DAY_OF_YEAR, 1)
        return target.timeInMillis - now.timeInMillis
    }

    private fun delayUntilRotation(): Long {
        val now = Calendar.getInstance()
        val target = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 2)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (target.timeInMillis <= now.timeInMillis + 60_000) target.add(Calendar.DAY_OF_YEAR, 1)
        return target.timeInMillis - now.timeInMillis
    }
}
