package expo.modules.quipudetection

// 2 min: el banco reusa la key al actualizar el aviso. Después, un consumo igual es otro.
internal class Recent(private val windowMs: Long = 120_000) {
  private data class Item(val key: String, val cents: Int, val merchant: String, val postTime: Long)

  private val seen = ArrayList<Item>()

  fun duplicate(key: String, cents: Int, merchant: String?, postTime: Long): Boolean {
    val name = merchant ?: ""
    seen.removeAll { kotlin.math.abs(postTime - it.postTime) > windowMs }
    val dup = seen.any { it.key == key && it.cents == cents && it.merchant == name }
    if (!dup) seen.add(Item(key, cents, name, postTime))
    return dup
  }
}
