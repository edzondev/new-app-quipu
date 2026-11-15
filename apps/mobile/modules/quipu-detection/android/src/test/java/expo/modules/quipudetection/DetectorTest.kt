package expo.modules.quipudetection

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DetectorTest {
  @Test
  fun interbankDebitPurchase() {
    val movement = Detector.detect(
      "Realizaste un consumo de S/.40.00 en VM*ELECTROVIBE con tu Tarjeta de Débito.",
    )
    assertEquals(Movement(4000, "VM*ELECTROVIBE", Kind.EXPENSE), movement)
  }

  @Test
  fun yapeReceived() {
    val movement = Detector.detect("Yape! Brad Edzon Perez Castillo te envió un pago por S/ 1")
    assertEquals(Movement(100, null, Kind.INCOME), movement)
  }

  @Test
  fun plinReceived() {
    val movement = Detector.detect("Brad Edzon Perez Castillo te ha plineado S/ 1.00")
    assertEquals(Movement(100, null, Kind.INCOME), movement)
  }

  @Test
  fun penAmount() {
    val movement = Detector.detect(
      "Realizaste un consumo de PEN40.00 en VM*ELECTROVIBE con tu Tarjeta de Débito.",
    )
    assertEquals(Movement(4000, "VM*ELECTROVIBE", Kind.EXPENSE), movement)
  }

  @Test
  fun googleWalletTextHasNoPaymentWord() {
    assertNull(Detector.detect("VM*ELECTROVIBE\nPEN40.00 con TD Clasica ••2971"))
  }

  @Test
  fun googleWalletPackageIsDropped() {
    val kept = Banks.keep(listOf("com.google.android.apps.walletnfcrel", "pe.com.interbank.mobilebanking"))
    assertEquals(setOf("pe.com.interbank.mobilebanking"), kept)
  }

  @Test
  fun promoWithAmountAndNoPaymentWord() {
    assertNull(Detector.detect("¿Qué harías con S/5,000? Crea tu primer Wardadito y participa por S/5,000."))
    assertNull(Detector.detect("¡Ahorra S/100 en Wong! Compra desde S/500 en alimentos y bebidas."))
    assertNull(Detector.detect("Inscríbete y participa con cada compra desde S/50 con tu Tarjeta Efectibank."))
    assertNull(Detector.detect("¡Olvídate de las fechas de pago! Afilia tus Tarjetas Visa BCP."))
  }

  @Test
  fun twoDifferentAmounts() {
    assertNull(Detector.detect("Realizaste un consumo de S/ 40.00 y otro de S/ 15.00 en Wong."))
  }

  @Test
  fun sameAmountTwiceIsOneMovement() {
    val movement = Detector.detect("Realizaste un consumo de S/ 40.00 en Wong. Total S/ 40.00.")
    assertEquals(Movement(4000, "Wong", Kind.EXPENSE), movement)
  }

  @Test
  fun doubtfulDecimalComma() {
    assertNull(Detector.detect("Pagaste S/ 40,50 en E.WONG."))
  }

  @Test
  fun commaAfterAFinishedAmountIsPunctuation() {
    val movement = Detector.detect("Pagaste S/ 40.00, en Wong.")
    assertEquals(Movement(4000, "Wong", Kind.EXPENSE), movement)
  }

  @Test
  fun merchantKeepsInternalDot() {
    val movement = Detector.detect("Pagaste S/ 20.00 en E.WONG con tu Tarjeta de Débito.")
    assertEquals(Movement(2000, "E.WONG", Kind.EXPENSE), movement)
  }

  @Test
  fun thousandsSeparator() {
    val movement = Detector.detect("Pagaste S/5,000 en Wong.")
    assertEquals(Movement(500_000, "Wong", Kind.EXPENSE), movement)
  }

  @Test
  fun bothKindsCancel() {
    assertNull(Detector.detect("Pagaste S/ 10.00 y además te envió S/ 10.00."))
  }
}

class RecentTest {
  @Test
  fun updateInsideTwoMinutesIsDuplicate() {
    val recent = Recent()
    val first = 1_000_000L
    assertEquals(false, recent.duplicate("key", 4000, "VM*ELECTROVIBE", first))
    assertEquals(true, recent.duplicate("key", 4000, "VM*ELECTROVIBE", first + 90_000))
  }

  @Test
  fun samePurchaseAfterTwoMinutesCountsAgain() {
    val recent = Recent()
    val first = 1_000_000L
    recent.duplicate("key", 4000, "VM*ELECTROVIBE", first)
    assertEquals(false, recent.duplicate("key", 4000, "VM*ELECTROVIBE", first + 121_000))
  }

  @Test
  fun differentKeyIsNotDuplicate() {
    val recent = Recent()
    val at = 1_000_000L
    recent.duplicate("one", 4000, "Wong", at)
    assertEquals(false, recent.duplicate("two", 4000, "Wong", at + 1_000))
  }
}
