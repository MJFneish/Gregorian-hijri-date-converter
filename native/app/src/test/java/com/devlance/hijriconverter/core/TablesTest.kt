package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.BUNDLED_TABLES
import com.devlance.hijriconverter.core.hijri.DateSource
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.TABLE_FIRST_YEAR
import com.devlance.hijriconverter.core.hijri.currentTables
import com.devlance.hijriconverter.core.hijri.hijriFromJdn
import com.devlance.hijriconverter.core.hijri.hijriSource
import com.devlance.hijriconverter.core.hijri.jdnFromHijri
import com.devlance.hijriconverter.core.hijri.setTableData
import com.devlance.hijriconverter.core.hijri.validateTableData
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

/** Port of v1's tables.test.ts — the downloadable copy (data/hijri-tables.json) and swapping tables. */
class TablesTest {
  private fun remoteJson() = JSONObject(repoFile("data/hijri-tables.json").readText())

  /** A copy of the bundled tables with one year's Iran month mask replaced. */
  private fun withYearMask(year: Int, mutate: (Int) -> Int, generated: String = "2099-01-01T00:00:00Z"): JSONObject {
    val raw = remoteJson()
    val iran = raw.getJSONObject("methods").getJSONObject("iran")
    val lengths = iran.getString("lengths")
    val i = (year - TABLE_FIRST_YEAR) * 3
    val bits = mutate(lengths.substring(i, i + 3).toInt(16))
    iran.put("lengths", lengths.substring(0, i) + bits.toString(16).padStart(3, '0') + lengths.substring(i + 3))
    raw.put("generated", generated)
    return raw
  }

  @After
  fun restore() = setTableData(BUNDLED_TABLES)

  @Test
  fun `the downloadable tables match the bundled ones exactly - rerun the build script and commit both`() {
    val data = validateTableData(remoteJson())
    assertNotNull(data)
    assertEquals(BUNDLED_TABLES.generated, data!!.generated)
    assertEquals(BUNDLED_TABLES.iranLastOfficial, data.iranLastOfficial)
    assertEquals(BUNDLED_TABLES.methods, data.methods)
  }

  @Test
  fun `anything malformed or implausible is rejected`() {
    val bad: List<Pair<String, (JSONObject) -> Unit>> = listOf(
      "format" to { raw -> raw.put("format", 2) },
      "year range" to { raw -> raw.put("lastYear", 1501) },
      "timestamp" to { raw -> raw.put("generated", "yesterday") },
      "Arabic-Indic digits in the timestamp" to { raw -> raw.put("generated", "٢٠٩٩-01-01T00:00:00Z") },
      "missing method" to { raw -> raw.getJSONObject("methods").remove("sistani") },
      "short mask" to { raw ->
        val iran = raw.getJSONObject("methods").getJSONObject("iran")
        iran.put("lengths", iran.getString("lengths").substring(3))
      },
      "not hex" to { raw ->
        val iran = raw.getJSONObject("methods").getJSONObject("iran")
        iran.put("lengths", "z" + iran.getString("lengths").substring(1))
      },
      "Iran cutoff" to { raw -> raw.put("iranLastOfficial", JSONObject().put("year", 1447).put("month", 13)) },
      "drift" to { raw ->
        val fadlallah = raw.getJSONObject("methods").getJSONObject("fadlallah")
        fadlallah.put("firstJdn", fadlallah.getInt("firstJdn") + 5)
      },
      "firstJdn as a string" to { raw ->
        val iran = raw.getJSONObject("methods").getJSONObject("iran")
        iran.put("firstJdn", iran.getInt("firstJdn").toString())
      },
    )
    assertNull(validateTableData(null))
    assertNull(validateTableData("nope"))
    for ((label, mutate) in bad) {
      val raw = remoteJson()
      mutate(raw)
      assertNull(label, validateTableData(raw))
    }
    // A year with only 4 thirty-day months would be 352 days — impossible.
    assertNull(validateTableData(withYearMask(1448, { 0b000000001111 })))
  }

  @Test
  fun `a downloaded correction moves the month start everywhere`() {
    // Find a 29-day month followed by a 30-day one in Iran's 1448 and swap them, as if the office
    // had announced the next month a day later than predicted.
    val i = (1448 - TABLE_FIRST_YEAR) * 3
    val bits = remoteJson().getJSONObject("methods").getJSONObject("iran").getString("lengths").substring(i, i + 3).toInt(16)
    val k = (0 until 11).first { m -> (bits shr m) and 1 == 0 && (bits shr (m + 1)) and 1 == 1 }
    val shorter = k + 1
    val moved = k + 2
    val after = k + 3 // 1-based months
    val before = jdnFromHijri(HijriDate(1448, moved, 1), MethodId.Iran)
    val afterStart = jdnFromHijri(HijriDate(1448, after, 1), MethodId.Iran)

    val corrected = validateTableData(withYearMask(1448, { b -> (b or (1 shl k)) and (1 shl (k + 1)).inv() }))
    assertNotNull(corrected)
    setTableData(corrected!!)
    assertEquals("2099-01-01T00:00:00Z", currentTables().generated)
    assertEquals(before + 1, jdnFromHijri(HijriDate(1448, moved, 1), MethodId.Iran))
    assertEquals(HijriDate(1448, shorter, 30), hijriFromJdn(before, MethodId.Iran))
    // The month after is unchanged: the two lengths were only swapped.
    assertEquals(afterStart, jdnFromHijri(HijriDate(1448, after, 1), MethodId.Iran))
  }

  @Test
  fun `Iran's official-calculated cutoff moves with the data`() {
    val raw = remoteJson()
    raw.put("generated", "2099-01-01T00:00:00Z")
    raw.put("iranLastOfficial", JSONObject().put("year", 1448).put("month", 5))
    assertEquals(DateSource.Calculated, hijriSource(HijriDate(1448, 5, 1), MethodId.Iran))
    setTableData(validateTableData(raw)!!)
    assertEquals(DateSource.Official, hijriSource(HijriDate(1448, 5, 1), MethodId.Iran))
    assertEquals(DateSource.Calculated, hijriSource(HijriDate(1448, 6, 1), MethodId.Iran))
  }
}
