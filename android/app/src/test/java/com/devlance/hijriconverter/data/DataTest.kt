package com.devlance.hijriconverter.data

import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.core.hijri.BUNDLED_TABLES
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.currentTables
import com.devlance.hijriconverter.core.hijri.setTableData
import com.devlance.hijriconverter.core.repoFile
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.IOException

/** Settings decoding (incl. v1's stored state) and a port of v1's useTableStore.test.ts. */
class DataTest {
  // ------------------------------------------------ settings

  @Test
  fun `v1's stored settings decode as they are`() {
    val v1 = JSONObject(
      """{"language":"ar","themeMode":"dark","method":"fadlallah","adjustment":-1,"onboardingDone":true,"birthJdn":2452356}""",
    )
    assertEquals(
      Settings(Lang.AR, ThemeMode.Dark, MethodId.Fadlallah, -1, true, 2452356),
      SettingsJson.decode(v1, Lang.EN),
    )
  }

  @Test
  fun `unknown or broken values fall back like v1's merge`() {
    val odd = JSONObject("""{"language":"fr","themeMode":"sepia","method":"hanafi","adjustment":7.6,"birthJdn":12.5}""")
    // 7.6 rounds to 8, clamped to +2 (v1's clampAdjustment).
    assertEquals(Settings(Lang.EN, adjustment = 2), SettingsJson.decode(odd, Lang.EN))
    assertEquals(-2, SettingsJson.decode(JSONObject("""{"adjustment":-3}"""), Lang.EN).adjustment)
    assertEquals(1, SettingsJson.decode(JSONObject("""{"adjustment":0.5}"""), Lang.EN).adjustment) // Math.round
    assertEquals(Settings(Lang.AR), SettingsJson.decode(JSONObject("{}"), Lang.AR))
  }

  @Test
  fun `settings round-trip through JSON`() {
    val s = Settings(Lang.AR, ThemeMode.Light, MethodId.Sistani, 2, true, null)
    assertEquals(s, SettingsJson.decode(JSONObject(SettingsJson.encode(s).toString()), Lang.EN))
  }

  // ------------------------------------------------ month-table updates

  private class MemoryStore : KeyValueStore {
    val map = HashMap<String, String>()
    override fun getString(key: String) = map[key]
    override fun putString(key: String, value: String) {
      map[key] = value
    }
  }

  private fun remote(generated: String): String {
    val raw = JSONObject(repoFile("data/hijri-tables.json").readText())
    raw.put("generated", generated)
    return raw.toString()
  }

  private var calls = 0
  private var now = 1_800_000_000_000L
  private val store = MemoryStore()

  private fun updates(respond: () -> String) = TableUpdates(
    store,
    fetch = {
      calls++
      respond()
    },
    clock = { now },
  )

  @Before
  @After
  fun bundled() = setTableData(BUNDLED_TABLES)

  @Test
  fun `applies and stores a newer download`() = runBlocking {
    val u = updates { remote("2099-01-01T00:00:00Z") }
    u.check(force = true)
    val s = u.state.value
    assertEquals(CheckStatus.Updated, s.status)
    assertEquals(TableSource.Downloaded, s.source)
    assertEquals(1, s.version)
    assertEquals("2099-01-01T00:00:00Z", currentTables().generated)
    assertTrue(store.map.getValue(TableUpdates.STORED_KEY).contains("2099-01-01T00:00:00Z"))
    assertNotNull(s.lastCheck)
  }

  @Test
  fun `keeps the bundled tables when the download is not newer`() = runBlocking {
    val u = updates { remote(BUNDLED_TABLES.generated) }
    u.check(force = true)
    assertEquals(CheckStatus.UpToDate, u.state.value.status)
    assertEquals(0, u.state.value.version)
    assertSame(BUNDLED_TABLES, currentTables())
  }

  @Test
  fun `rejects garbage and network errors without touching the tables`() = runBlocking {
    updates { """{"format": 1}""" }.apply {
      check(force = true)
      assertEquals(CheckStatus.Failed, state.value.status)
    }
    updates { throw IOException("HTTP 404") }.apply {
      check(force = true)
      assertEquals(CheckStatus.Failed, state.value.status)
    }
    updates { "not json" }.apply {
      check(force = true)
      assertEquals(CheckStatus.Failed, state.value.status)
    }
    assertSame(BUNDLED_TABLES, currentTables())
  }

  @Test
  fun `checks at most once a day unless forced`() = runBlocking {
    val u = updates { remote(BUNDLED_TABLES.generated) }
    u.check(force = true)
    assertEquals(1, calls)
    u.check()
    u.checkIfDue()
    assertEquals(1, calls)
    now += TableUpdates.CHECK_EVERY_MS + 1
    u.checkIfDue()
    assertEquals(2, calls)
  }

  @Test
  fun `restores a stored download on startup, offline`() = runBlocking {
    store.putString(TableUpdates.STORED_KEY, remote("2099-01-01T00:00:00Z"))
    store.putString(TableUpdates.LAST_CHECK_KEY, (now - 1000).toString())
    val u = updates { throw IOException("offline") }
    u.restore()
    u.checkIfDue()
    assertEquals(TableSource.Downloaded, u.state.value.source)
    assertEquals("2099-01-01T00:00:00Z", currentTables().generated)
    assertEquals(0, calls) // checked less than a day ago
  }

  @Test
  fun `a stored download no newer than the bundled tables is ignored`() {
    store.putString(TableUpdates.STORED_KEY, remote(BUNDLED_TABLES.generated))
    val u = updates { error("no fetch") }
    u.restore()
    assertEquals(TableSource.Bundled, u.state.value.source)
    assertSame(BUNDLED_TABLES, currentTables())
  }
}
