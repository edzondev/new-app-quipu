package expo.modules.quipudetection

import android.app.Notification
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class BankListenerService : NotificationListenerService() {
  private val recent = Recent()
  private var ready = false

  override fun onListenerConnected() {
    try {
      Prefs.loadBanks(this)
      ready = true
    } catch (e: Exception) {
      logFail("connect", e)
    }
  }

  override fun onListenerDisconnected() {
    ready = false
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    try {
      if (sbn == null) return
      posted(sbn)
    } catch (e: Exception) {
      logFail("posted", e)
    }
  }

  private fun posted(sbn: StatusBarNotification) {
    if (!ready) return
    val pkg = sbn.packageName ?: return
    if (pkg == packageName || !Banks.contains(pkg) || pkg !in Prefs.banks) return
    val notification = sbn.notification ?: return
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    val text = readText(notification.extras) ?: return
    val movement = Detector.detect(text) ?: return
    val key = sbn.key ?: "$pkg:${sbn.id}"
    if (recent.duplicate(key, movement.cents, movement.merchant, sbn.postTime)) return
    Notices.detected(this, movement, Banks.name(pkg), "$key|${sbn.postTime}")
  }

  private fun readText(extras: Bundle?): String? {
    if (extras == null) return null
    val parts = listOf(
      Notification.EXTRA_TITLE,
      Notification.EXTRA_TEXT,
      Notification.EXTRA_SUB_TEXT,
      Notification.EXTRA_BIG_TEXT,
    ).mapNotNull { key -> readExtra(extras, key) }
    if (parts.isEmpty()) return null
    return parts.joinToString("\n")
  }

  private fun readExtra(extras: Bundle, key: String): String? {
    return try {
      extras.getCharSequence(key)?.toString()?.trim()?.take(500)?.takeIf { it.isNotEmpty() }
    } catch (_: Exception) {
      null
    }
  }
}
