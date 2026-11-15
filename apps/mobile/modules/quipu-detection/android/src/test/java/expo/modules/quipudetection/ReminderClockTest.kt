package expo.modules.quipudetection

import java.util.Calendar
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReminderClockTest {
  @Test
  fun beforeTheHourDoesNotRemind() {
    assertFalse(shouldRemind(at(2026, 11, 15, 22, 0), 23, 30, null))
  }

  @Test
  fun onTimeRemindsUnlessLogged() {
    val now = at(2026, 11, 15, 23, 40)
    assertTrue(shouldRemind(now, 23, 30, null))
    assertFalse(shouldRemind(now, 23, 30, "2026-11-15"))
  }

  @Test
  fun aLittleEarlyStillCounts() {
    assertTrue(shouldRemind(at(2026, 11, 15, 23, 10), 23, 30, null))
    assertFalse(shouldRemind(at(2026, 11, 15, 22, 50), 23, 30, null))
  }

  @Test
  fun afterMidnightBeforeTwoStillRemindsTheScheduledDay() {
    val now = at(2026, 11, 16, 1, 30)
    assertTrue(shouldRemind(now, 23, 30, null))
    assertFalse(shouldRemind(now, 23, 30, "2026-11-15"))
  }

  @Test
  fun pastTwoAmIsTooLate() {
    assertFalse(shouldRemind(at(2026, 11, 16, 2, 10), 23, 30, null))
  }

  @Test
  fun nextAlarmIsTheComingSlot() {
    assertEquals(at(2026, 11, 15, 23, 30), nextAlarmMillis(at(2026, 11, 15, 22, 0), 23, 30))
    assertEquals(at(2026, 11, 16, 23, 30), nextAlarmMillis(at(2026, 11, 15, 23, 40), 23, 30))
  }

  private fun at(year: Int, month: Int, day: Int, hour: Int, minute: Int): Long {
    val calendar = Calendar.getInstance(Lima.zone)
    calendar.set(year, month - 1, day, hour, minute, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
  }
}
