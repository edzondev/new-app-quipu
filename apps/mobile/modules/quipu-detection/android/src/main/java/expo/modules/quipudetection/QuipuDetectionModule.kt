package expo.modules.quipudetection

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class QuipuDetectionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QuipuDetection")

    Function("isAccessEnabled") { accessEnabled(context()) }

    Function("openAccessSettings") { openAccess(context()) }

    AsyncFunction("getBanks") {
      val context = context()
      val chosen = Prefs.readBanks(context)
      val pm = context.packageManager
      Banks.all.map { bank ->
        mapOf(
          "name" to bank.name,
          "packageName" to bank.packageId,
          "installed" to installed(pm, bank.packageId),
          "chosen" to chosen.contains(bank.packageId),
        )
      }
    }

    AsyncFunction("setChosenBanks") { ids: List<String> -> Prefs.saveBanks(context(), ids) }

    AsyncFunction("setReminder") { enabled: Boolean, hour: Int, minute: Int ->
      if (hour !in 0..23 || minute !in 0..59) return@AsyncFunction Unit
      val context = context()
      Prefs.saveReminder(context, enabled, hour, minute)
      if (enabled) Reminder.schedule(context, hour, minute) else Reminder.cancel(context)
    }

    // Para el arranque de la app: reprograma solo si la alarma no existe (ver Reminder.ensure).
    AsyncFunction("ensureReminder") {
      val context = context()
      val saved = Prefs.reminder(context)
      if (!saved.enabled) return@AsyncFunction Unit
      Reminder.ensure(context, saved.hour, saved.minute)
    }

    AsyncFunction("getReminder") {
      val saved = Prefs.reminder(context())
      mapOf("enabled" to saved.enabled, "hour" to saved.hour, "minute" to saved.minute)
    }
  }

  private fun context(): Context =
    appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()
}

private fun installed(pm: PackageManager, packageId: String): Boolean {
  return try {
    @Suppress("DEPRECATION")
    pm.getPackageInfo(packageId, 0)
    true
  } catch (_: Exception) {
    false
  }
}

private fun accessEnabled(context: Context): Boolean {
  // Settings.Secure.ENABLED_NOTIFICATION_LISTENERS es @hide: no existe en el SDK público.
  val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    ?: return false
  return flat.split(':').any { it.substringBefore('/') == context.packageName }
}

private fun openAccess(context: Context) {
  try {
    val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  } catch (e: ActivityNotFoundException) {
    logFail("settings", e)
  }
}
