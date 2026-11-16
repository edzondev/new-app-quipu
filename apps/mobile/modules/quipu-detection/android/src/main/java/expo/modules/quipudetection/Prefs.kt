package expo.modules.quipudetection

import android.content.Context

internal data class ReminderPref(val enabled: Boolean, val hour: Int, val minute: Int)

internal val DEFAULT_REMINDER = ReminderPref(enabled = false, hour = 23, minute = 30)

internal object Prefs {
  private const val FILE = "quipu-detection"
  private const val BANKS = "banks"
  private const val ENABLED = "reminder"
  private const val HOUR = "hour"
  private const val MINUTE = "minute"

  fun saveBanks(context: Context, ids: Collection<String>) {
    // apply() vuelve al tiro y escribe en segundo plano. commit() trabaría el hilo de la UI.
    prefs(context).edit().putStringSet(BANKS, Banks.keep(ids)).apply()
  }

  // El servicio lo lee en cada aviso. Tras la primera carga, SharedPreferences ya está en memoria.
  fun readBanks(context: Context): Set<String> {
    val stored = prefs(context).getStringSet(BANKS, emptySet()) ?: emptySet()
    return Banks.keep(stored)
  }

  fun reminder(context: Context): ReminderPref {
    val stored = prefs(context)
    return ReminderPref(
      enabled = stored.getBoolean(ENABLED, DEFAULT_REMINDER.enabled),
      hour = stored.getInt(HOUR, DEFAULT_REMINDER.hour).coerceIn(0, 23),
      minute = stored.getInt(MINUTE, DEFAULT_REMINDER.minute).coerceIn(0, 59),
    )
  }

  fun saveReminder(context: Context, enabled: Boolean, hour: Int, minute: Int) {
    prefs(context).edit()
      .putBoolean(ENABLED, enabled)
      .putInt(HOUR, hour)
      .putInt(MINUTE, minute)
      .apply()
  }

  private fun prefs(context: Context) =
    context.getSharedPreferences(FILE, Context.MODE_PRIVATE)
}
