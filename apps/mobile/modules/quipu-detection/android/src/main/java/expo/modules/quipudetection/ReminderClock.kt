package expo.modules.quipudetection

import java.util.Calendar
import java.util.TimeZone

// El día de Quipu es el de Lima, no el del reloj del teléfono.
internal object Lima {
  val zone: TimeZone = TimeZone.getTimeZone("America/Lima")

  fun calendar(millis: Long): Calendar =
    Calendar.getInstance(zone).apply { timeInMillis = millis }

  fun date(millis: Long): String {
    val c = calendar(millis)
    return "%04d-%02d-%02d".format(
      c.get(Calendar.YEAR),
      c.get(Calendar.MONTH) + 1,
      c.get(Calendar.DAY_OF_MONTH),
    )
  }

  fun at(dayMillis: Long, hour: Int, minute: Int, dayOffset: Int): Long {
    val c = calendar(dayMillis)
    c.set(Calendar.HOUR_OF_DAY, hour)
    c.set(Calendar.MINUTE, minute)
    c.set(Calendar.SECOND, 0)
    c.set(Calendar.MILLISECOND, 0)
    c.add(Calendar.DAY_OF_MONTH, dayOffset)
    return c.timeInMillis
  }
}

private const val EARLY_MS = 30L * 60 * 1000

internal fun nextAlarmMillis(nowMillis: Long, hour: Int, minute: Int): Long {
  val today = Lima.at(nowMillis, hour, minute, 0)
  return if (nowMillis < today) today else Lima.at(nowMillis, hour, minute, 1)
}

// Doze puede entregar la alarma de la noche después de medianoche. Desde las 02:00 ya es tarde.
internal fun shouldRemind(nowMillis: Long, hour: Int, minute: Int, loggedDay: String?): Boolean {
  val slot = closestSlot(nowMillis, hour, minute)
  // setInexactRepeating también puede adelantarse un poco.
  if (nowMillis < slot - EARLY_MS) return false
  if (nowMillis >= cutoffMillis(slot)) return false
  return loggedDay != Lima.date(slot)
}

private fun closestSlot(nowMillis: Long, hour: Int, minute: Int): Long {
  val today = Lima.at(nowMillis, hour, minute, 0)
  return listOf(Lima.at(nowMillis, hour, minute, -1), today, Lima.at(nowMillis, hour, minute, 1))
    .minBy { kotlin.math.abs(it - nowMillis) }
}

private fun cutoffMillis(slotMillis: Long): Long {
  val slot = Lima.calendar(slotMillis)
  val minutes = slot.get(Calendar.HOUR_OF_DAY) * 60 + slot.get(Calendar.MINUTE)
  return if (minutes < 2 * 60) Lima.at(slotMillis, 2, 0, 0) else Lima.at(slotMillis, 2, 0, 1)
}
