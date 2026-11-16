package expo.modules.quipudetection

internal data class Bank(
  val name: String,
  val packageId: String,
)

/** The nine Peru bank apps from the previous module. Checked against the Play Store then. */
internal object Banks {
  val all: List<Bank> = listOf(
    Bank("Banca Móvil BCP", "com.bcp.bank.bcp"),
    Bank("Yape", "com.bcp.innovacxion.yapeapp"),
    Bank("Interbank", "pe.com.interbank.mobilebanking"),
    Bank("Scotiabank Perú", "pe.com.scotiabank.blpm.android.client"),
    Bank("BBVA Perú | Banca Móvil", "com.bbva.nxt_peru"),
    Bank("Banco de la Nación", "pe.com.bn.app.bancodelanacion"),
    Bank("Nueva BanBif", "pe.com.banbif.pnappmobile"),
    Bank("Banco Pichincha Perú", "pe.pichincha.bm"),
    Bank("Caja Arequipa Móvil", "com.cmac.cajamovilaqp"),
  )

  fun contains(packageId: String): Boolean = all.any { it.packageId == packageId }

  fun name(packageId: String): String = all.firstOrNull { it.packageId == packageId }?.name ?: packageId

  /** Drops anything outside the catalog, including Billetera de Google. */
  fun keep(ids: Collection<String>): Set<String> =
    ids.map { it.trim() }.filter { contains(it) }.toSet()
}
