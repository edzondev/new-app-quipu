package expo.modules.quipudetection

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class QuipuDetectionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QuipuDetection")

    Function("isAccessEnabled") {
      val context = context() ?: return@Function false
      accessEnabled(context)
    }

    Function("openAccessSettings") {
      val context = context() ?: return@Function null
      openAccess(context)
      null
    }

    AsyncFunction("getBanks") {
      val context = context() ?: return@AsyncFunction emptyList<Map<String, Any>>()
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

    AsyncFunction("setChosenBanks") { ids: List<String> ->
      val context = context() ?: return@AsyncFunction Unit
      Prefs.saveBanks(context, ids)
    }

    AsyncFunction("setReminder") { enabled: Boolean, hour: Int, minute: Int ->
      val context = context() ?: return@AsyncFunction Unit
      if (hour !in 0..23 || minute !in 0..59) return@AsyncFunction Unit
      Prefs.saveReminder(context, enabled, hour, minute)
      if (enabled) Reminder.schedule(context, hour, minute) else Reminder.cancel(context)
    }

    AsyncFunction("getReminder") {
      val context = context() ?: return@AsyncFunction mapOf(
        "enabled" to DEFAULT_REMINDER.enabled,
        "hour" to DEFAULT_REMINDER.hour,
        "minute" to DEFAULT_REMINDER.minute,
      )
      val saved = Prefs.reminder(context)
      mapOf("enabled" to saved.enabled, "hour" to saved.hour, "minute" to saved.minute)
    }

    AsyncFunction("markLoggedToday") {
      val context = context() ?: return@AsyncFunction Unit
      Prefs.markLoggedToday(context)
    }
  }

  private fun context(): Context? = appContext.reactContext?.applicationContext
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
  return try {
    val flat = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_NOTIFICATION_LISTENERS,
    ) ?: return false
    flat.split(':').any { it.substringBefore('/') == context.packageName }
  } catch (e: Exception) {
    logFail("access", e)
    false
  }
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
