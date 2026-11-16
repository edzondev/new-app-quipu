package expo.modules.quipudetection

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log

private const val TAG = "QuipuDetection"
private const val DETECTED_CHANNEL = "quipu"
private const val REMINDER_CHANNEL = "quipu-reminder"
private const val REMINDER_ID = 2302

internal object Notices {
  fun detected(context: Context, movement: Movement, bank: String, id: String) {
    val title = if (movement.kind == Kind.INCOME) {
      "Detectamos un posible ingreso"
    } else {
      "Detectamos un posible gasto"
    }
    post(context, DETECTED_CHANNEL, "Quipu", id.hashCode()) {
      setContentTitle(title)
      setContentText(body(movement, bank))
      setContentIntent(viewIntent(context, detectedUri(movement, bank), id.hashCode()))
      setAutoCancel(true)
      // En la pantalla de bloqueo se ve la versión pública, sin el monto.
      setVisibility(Notification.VISIBILITY_PRIVATE)
      setPublicVersion(
        base(context, DETECTED_CHANNEL).setContentTitle("Quipu detectó un movimiento").build(),
      )
    }
  }

  fun reminder(context: Context) {
    post(context, REMINDER_CHANNEL, "Recordatorio diario", REMINDER_ID) {
      setContentTitle("¿Anotaste tus gastos de hoy?")
      setContentIntent(viewIntent(context, Uri.parse("quipu://register"), 2303))
      setAutoCancel(true)
    }
  }

  // Sin permiso de notificaciones (Android 13+), notify() no hace nada y no falla.
  private fun post(
    context: Context,
    channelId: String,
    channelName: String,
    id: Int,
    build: Notification.Builder.() -> Unit,
  ) {
    try {
      val manager = context.getSystemService(NotificationManager::class.java) ?: return
      channel(manager, channelId, channelName)
      manager.notify(id, base(context, channelId).apply(build).build())
    } catch (e: Exception) {
      logFail(channelId, e)
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
