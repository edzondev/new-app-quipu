package expo.modules.quipudetection

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

private const val REQUEST = 2301

internal object Reminder {
  fun schedule(context: Context, hour: Int, minute: Int) {
    val alarm = context.getSystemService(AlarmManager::class.java) ?: return
    val trigger = nextAlarmMillis(System.currentTimeMillis(), hour, minute)
    alarm.setInexactRepeating(
      AlarmManager.RTC_WAKEUP,
      trigger,
      AlarmManager.INTERVAL_DAY,
      pending(context),
    )
  }

  fun cancel(context: Context) {
    val alarm = context.getSystemService(AlarmManager::class.java) ?: return
    val intent = pending(context)
    alarm.cancel(intent)
    intent.cancel()
  }

  private fun pending(context: Context): PendingIntent {
    val intent = Intent(context, ReminderReceiver::class.java)
    // Mismo request code + UPDATE_CURRENT reemplaza la alarma anterior, no agrega otra.
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(context, REQUEST, intent, flags)
  }
}

class ReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    try {
      val saved = Prefs.reminder(context)
      if (!saved.enabled) return
      val now = System.currentTimeMillis()
      if (!shouldRemind(now, saved.hour, saved.minute, Prefs.loggedDay(context))) return
      Notices.reminder(context)
    } catch (e: Exception) {
      logFail("reminder", e)
    }
  }
}

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    try {
      val action = intent?.action
      if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return
      val saved = Prefs.reminder(context)
      if (saved.enabled) Reminder.schedule(context, saved.hour, saved.minute)
    } catch (e: Exception) {
      logFail("boot", e)
    }
  }
}
