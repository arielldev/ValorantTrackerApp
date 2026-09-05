package app.valostore.auth

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object Notifier {
    private const val GROUP = "app.valostore.SHOP"
    private const val GOLD = 0xFFC9A227.toInt()
    private const val SUMMARY_ID = 1000

    private data class Channel(val id: String, val name: String, val description: String, val importance: Int)

    private val CHANNELS = mapOf(
        "daily" to Channel("daily", "Daily shop", "Today's four skins at the time you choose", NotificationManager.IMPORTANCE_DEFAULT),
        "wishlist" to Channel("wishlist", "Wishlist", "A starred skin rotated into your shop", NotificationManager.IMPORTANCE_HIGH),
        "bundle" to Channel("bundle", "Bundles", "A new featured bundle appeared", NotificationManager.IMPORTANCE_DEFAULT),
    )

    fun show(context: Context, notice: JSONObject, index: Int) {
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) return
        ensureChannels(context)

        val kind = notice.optString("kind", "daily")
        val channel = CHANNELS[kind] ?: CHANNELS.getValue("daily")
        val title = notice.optString("title")
        val body = notice.optString("body")
        val lines = notice.optJSONArray("lines")
        val image = notice.optString("image").takeIf { it.isNotEmpty() }

        val res = context.resources
        val pkg = context.packageName
        val small = res.getIdentifier("ic_notification", "drawable", pkg).takeIf { it != 0 } ?: context.applicationInfo.icon
        val largeId = res.getIdentifier("ic_notification_large", "drawable", pkg)
        val large = if (largeId != 0) BitmapFactory.decodeResource(res, largeId) else null

        val launch = context.packageManager.getLaunchIntentForPackage(pkg)
        val pending = launch?.let {
            PendingIntent.getActivity(context, index, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        val builder = NotificationCompat.Builder(context, channel.id)
            .setSmallIcon(small)
            .setColor(GOLD)
            .setContentTitle(title)
            .setContentText(body)
            .setGroup(GROUP)
            .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
            .setPriority(if (kind == "wishlist") NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pending)
        if (large != null) builder.setLargeIcon(large)
        if (pending != null) builder.addAction(0, "Open shop", pending)

        val picture = image?.let { fetch(it) }
        when {
            picture != null -> builder.setStyle(
                NotificationCompat.BigPictureStyle().bigPicture(picture).bigLargeIcon(null as Bitmap?).setSummaryText(body),
            )
            lines != null && lines.length() > 0 -> {
                val inbox = NotificationCompat.InboxStyle().setBigContentTitle(title)
                for (i in 0 until lines.length()) inbox.addLine(lines.optString(i))
                builder.setStyle(inbox)
            }
            else -> builder.setStyle(NotificationCompat.BigTextStyle().bigText(body))
        }

        val summary = NotificationCompat.Builder(context, channel.id)
            .setSmallIcon(small)
            .setColor(GOLD)
            .setGroup(GROUP)
            .setGroupSummary(true)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build()

        try {
            manager.notify(2000 + index + (kind.hashCode() and 0xff) * 4, builder.build())
            manager.notify(SUMMARY_ID, summary)
        } catch (_: SecurityException) {
        }
    }

    private fun fetch(url: String): Bitmap? = try {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 12000
        conn.inputStream.use { stream ->
            val opts = BitmapFactory.Options().apply { inSampleSize = 1 }
            BitmapFactory.decodeStream(stream, null, opts)
        }
    } catch (_: Throwable) {
        null
    }

    private fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        for (c in CHANNELS.values) {
            if (nm.getNotificationChannel(c.id) != null) continue
            nm.createNotificationChannel(
                NotificationChannel(c.id, c.name, c.importance).apply {
                    description = c.description
                    lightColor = Color.parseColor("#C9A227")
                    enableLights(true)
                },
            )
        }
    }
}
