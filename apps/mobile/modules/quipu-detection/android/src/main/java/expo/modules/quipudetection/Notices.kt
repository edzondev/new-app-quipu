package expo.modules.quipudetection

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log

private const val TAG = "QuipuDetection"
private const val DETECTED_CHANNEL = "quipu"
private const val REMINDER_CHANNEL = "quipu-reminder"

internal object Notices {
  fun detected(context: Context, movement: Movement, bank: String, id: String) {
    try {
      if (!canPost(context)) return
      val manager = context.getSystemService(NotificationManager::class.java) ?: return
      channel(manager, DETECTED_CHANNEL, "Quipu")
      val title = if (movement.kind == Kind.INCOME) {
        "Detectamos un posible ingreso"
      } else {
        "Detectamos un posible gasto"
      }
      val open = viewIntent(context, detectedUri(movement, bank), id.hashCode())
      val notice = base(context, DETECTED_CHANNEL)
        .setContentTitle(title)
        .setContentText(body(movement, bank))
        .setContentIntent(open)
        .setAutoCancel(true)
        // En la pantalla de bloqueo se ve la versión pública, sin el monto.
        .setVisibility(Notification.VISIBILITY_PRIVATE)
        .setPublicVersion(
          base(context, DETECTED_CHANNEL)
            .setContentTitle("Quipu detectó un movimiento")
            .build(),
        )
        .build()
      manager.notify(id.hashCode(), notice)
    } catch (e: Exception) {
      logFail("notice", e)
    }
  }

  fun reminder(context: Context) {
    try {
      if (!canPost(context)) return
      val manager = context.getSystemService(NotificationManager::class.java) ?: return
      channel(manager, REMINDER_CHANNEL, "Recordatorio diario")
      val open = viewIntent(context, Uri.parse("quipu://register"), 2303)
      val notice = base(context, REMINDER_CHANNEL)
        .setContentTitle("¿Anotaste tus gastos de hoy?")
        .setContentIntent(open)
        .setAutoCancel(true)
        .build()
      manager.notify(REMINDER_ID, notice)
    } catch (e: Exception) {
      logFail("reminder", e)
    }
  }

  private fun body(movement: Movement, bank: String): String {
    val amount = "S/ ${movement.cents / 100}.${(movement.cents % 100).toString().padStart(2, '0')}"
    val merchant = movement.merchant?.trim().orEmpty()
    return if (merchant.isEmpty()) "$amount · $bank" else "$amount en $merchant · $bank"
  }

  private fun detectedUri(movement: Movement, bank: String): Uri {
    val kind = if (movement.kind == Kind.INCOME) "income" else "expense"
    val uri = Uri.Builder()
      .scheme("quipu")
      .authority("register")
      .appendQueryParameter("kind", kind)
      .appendQueryParameter("cents", movement.cents.toString())
      .appendQueryParameter("bank", bank)
    val merchant = movement.merchant?.trim().orEmpty()
    if (merchant.isNotEmpty()) uri.appendQueryParameter("merchant", merchant)
    return uri.build()
  }
}

private const val REMINDER_ID = 2302

private fun canPost(context: Context): Boolean {
  if (Build.VERSION.SDK_INT < 33) return true
  return context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
    PackageManager.PERMISSION_GRANTED
}

private fun channel(manager: NotificationManager, id: String, name: String) {
  if (Build.VERSION.SDK_INT < 26) return
  manager.createNotificationChannel(NotificationChannel(id, name, NotificationManager.IMPORTANCE_DEFAULT))
}

private fun base(context: Context, channelId: String): Notification.Builder {
  val icon = context.applicationInfo.icon.let { if (it != 0) it else android.R.drawable.ic_dialog_info }
  val builder = if (Build.VERSION.SDK_INT >= 26) {
    Notification.Builder(context, channelId)
  } else {
    @Suppress("DEPRECATION")
    Notification.Builder(context).setPriority(Notification.PRIORITY_DEFAULT)
  }
  return builder.setSmallIcon(icon)
}

private fun viewIntent(context: Context, uri: Uri, request: Int): PendingIntent {
  // setPackage: solo Quipu puede abrir este enlace.
  val intent = Intent(Intent.ACTION_VIEW, uri)
    .setPackage(context.packageName)
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
  return PendingIntent.getActivity(context, request, intent, PendingIntent.FLAG_IMMUTABLE)
}

internal fun logFail(where: String, error: Exception) {
  // Solo la clase: el mensaje puede traer el texto del aviso.
  Log.w(TAG, "$where failed: ${error.javaClass.simpleName}")
}
