package com.devlance.hijriconverter.i18n

import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.core.YmdSpan
import org.junit.Assert.assertEquals
import org.junit.Test

/** Port of v1's plural.test.ts. */
class PluralTest {
  @Test
  fun `Arabic dual is nominative on its own and genitive after a preposition`() {
    assertEquals("يومان", countPhrase(CountUnit.Day, 2, Lang.AR))
    assertEquals("يومين", countPhrase(CountUnit.Day, 2, Lang.AR, true))
    assertEquals("شهرين", countPhrase(CountUnit.Month, 2, Lang.AR, true))
    assertEquals("سنتين", countPhrase(CountUnit.Year, 2, Lang.AR, true))
    assertEquals("أسبوعين", countPhrase(CountUnit.Week, 2, Lang.AR, true))
  }

  @Test
  fun `other counts read the same either way`() {
    for (n in listOf(1, 3, 10, 11, 19, 100)) {
      assertEquals(countPhrase(CountUnit.Day, n, Lang.AR), countPhrase(CountUnit.Day, n, Lang.AR, true))
    }
    assertEquals("١٩ يومًا", countPhrase(CountUnit.Day, 19, Lang.AR))
    assertEquals("٣ أيام", countPhrase(CountUnit.Day, 3, Lang.AR))
    assertEquals("2 days", countPhrase(CountUnit.Day, 2, Lang.EN, true))
  }

  @Test
  fun `spanPhrase joins the non-zero parts`() {
    assertEquals("25 years, 7 months and 3 days", spanPhrase(YmdSpan(25, 7, 3), Lang.EN))
    assertEquals("سنتان ويوم واحد", spanPhrase(YmdSpan(2, 0, 1), Lang.AR))
    assertEquals("0 days", spanPhrase(YmdSpan(0, 0, 0), Lang.EN))
  }

  @Test
  fun `numbers are grouped`() {
    assertEquals("9,780", formatNumber(9780, Lang.EN))
    assertEquals("٩٬٧٨٠", formatNumber(9780, Lang.AR))
    assertEquals("1,234,567", formatNumber(1234567, Lang.EN))
    assertEquals("-12", formatNumber(-12, Lang.EN))
    assertEquals("999", formatNumber(999, Lang.EN))
  }
}
