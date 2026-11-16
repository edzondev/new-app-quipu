package expo.modules.quipudetection

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ManifestQueriesTest {
  @Test
  fun manifestListsEachCatalogPackageAndNotQueryAll() {
    // Gradle corre los tests con la carpeta android/ del módulo como directorio actual.
    val manifest = File("src/main/AndroidManifest.xml").readText()
    assertFalse(manifest.contains("QUERY_ALL_PACKAGES"))
    assertFalse(manifest.contains("com.google.android.apps.walletnfcrel"))
    assertTrue(manifest.contains("android.permission.POST_NOTIFICATIONS"))
    assertTrue(manifest.contains("android.permission.RECEIVE_BOOT_COMPLETED"))
    assertFalse(manifest.contains("android:exported=\"true\""))
    val declared = Regex("""<package\s+android:name="([^"]+)"\s*/>""")
      .findAll(manifest)
      .map { it.groupValues[1] }
      .toList()
    assertEquals(Banks.all.map { it.packageId }, declared)
  }
}
