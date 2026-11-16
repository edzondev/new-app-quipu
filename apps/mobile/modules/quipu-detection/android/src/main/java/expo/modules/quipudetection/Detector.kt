package expo.modules.quipudetection

import java.text.Normalizer

internal enum class Kind { EXPENSE, INCOME }

internal data class Movement(
  val cents: Int,
  val merchant: String?,
  val kind: Kind,
)

internal object Detector {
  private const val MAX_CHARS = 2_000

  // Una sola lista. Se busca en el texto en minúsculas y sin tildes.
  private val WORDS = listOf(
    "te ha plineado" to Kind.INCOME,
    "te envio" to Kind.INCOME,
    "consumo" to Kind.EXPENSE,
    "pagaste" to Kind.EXPENSE,
  )

  // Primero los miles (5,000). Si no, "40,50" se leería como 40 y sobraría la coma.
  private val AMOUNT = Regex(
    "(?i)(?<![A-Za-z])(?:S/\\.?|PEN)[\\s\\u00A0]*(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)",
  )
  private val THOUSANDS = Regex("^\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?\$")
  private val PLAIN = Regex("^\\d+(?:\\.\\d{1,2})?\$")
  private val DOUBTFUL_COMMA = Regex("^,\\d")
  // "Saldo disponible: S/ 1,250.00" es el saldo de la cuenta, no el monto del movimiento.
  private val BALANCE = Regex("(?i)saldo\\D{0,20}\$")
  private val MERCHANT = Regex("(?i)\\ben\\s+(.+?)(?=\\s+con\\s|\\s+por\\s|[\\n;]|[.!?](?:\\s|\$)|\$)")

  fun detect(raw: String): Movement? {
    val text = if (raw.length > MAX_CHARS) raw.substring(0, MAX_CHARS) else raw
    val kind = kindOf(normalize(text)) ?: return null
    val cents = centsOf(text) ?: return null
    return Movement(cents, merchantOf(text), kind)
  }

  private fun kindOf(normalized: String): Kind? {
    val kinds = WORDS.filter { (word, _) -> normalized.contains(word) }.map { it.second }.toSet()
    return if (kinds.size == 1) kinds.first() else null
  }

  private fun centsOf(text: String): Int? {
    var found: Int? = null
    for (match in AMOUNT.findAll(text)) {
      if (BALANCE.containsMatchIn(text.substring(0, match.range.first))) continue
      val token = match.groupValues[1]
      // "S/ 40,50" no es miles. "S/ 40.00, en Wong" sí: la coma no va seguida de un dígito.
      val after = text.substring(match.range.last + 1)
      if (',' !in token && DOUBTFUL_COMMA.containsMatchIn(after)) return null
      val cents = toCents(token) ?: return null
      if (found != null && cents != found) return null
      found = cents
    }
    return found
  }

  private fun toCents(token: String): Int? {
    val grouped = ',' in token
    if (grouped && !THOUSANDS.matches(token)) return null
    if (!grouped && !PLAIN.matches(token)) return null
    val plain = token.replace(",", "")
    val dot = plain.indexOf('.')
    val whole = if (dot >= 0) plain.substring(0, dot) else plain
    val fractionDigits = if (dot >= 0) plain.substring(dot + 1) else ""
    val soles = whole.toLongOrNull() ?: return null
    val fraction = when (fractionDigits.length) {
      0 -> 0
      1 -> fractionDigits.toInt() * 10
      2 -> fractionDigits.toInt()
      else -> return null
    }
    val cents = soles * 100 + fraction
    if (cents <= 0 || cents > Int.MAX_VALUE) return null
    return cents.toInt()
  }

  private fun merchantOf(text: String): String? {
    val amount = AMOUNT.find(text) ?: return null
    val rest = text.substring(amount.range.last + 1)
    val raw = MERCHANT.find(rest)?.groupValues?.get(1)?.trim() ?: return null
    val name = raw.trimEnd('.', ',', ';', ':', '!', '?').trim()
    if (name.isEmpty()) return null
    return name.take(80)
  }

  private fun normalize(text: String): String {
    val stripped = Normalizer.normalize(text, Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "")
    return stripped.lowercase().replace(Regex("\\s+"), " ").trim()
  }
}
