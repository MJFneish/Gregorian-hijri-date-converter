package com.devlance.hijriconverter.data

import com.devlance.hijriconverter.core.hijri.BUNDLED_TABLES
import com.devlance.hijriconverter.core.hijri.currentTables
import com.devlance.hijriconverter.core.hijri.setTableData
import com.devlance.hijriconverter.core.hijri.validateTableData
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import org.json.JSONObject

/** Where downloaded tables are kept between launches (SharedPreferences in the app). */
interface KeyValueStore {
  fun getString(key: String): String?
  fun putString(key: String, value: String)
}

enum class CheckStatus(val key: String) {
  Idle("idle"),
  Checking("checking"),
  Updated("updated"),
  UpToDate("upToDate"),
  Failed("failed"),
}

enum class TableSource { Bundled, Downloaded }

data class TableState(
  /** Bumped whenever the tables in use change — part of the conversion options, so anything
   * remembered on them recomputes. */
  val version: Int = 0,
  val source: TableSource = TableSource.Bundled,
  /** `generated` timestamp of the tables in use. */
  val generated: String = BUNDLED_TABLES.generated,
  /** Last time the repo answered (epoch ms), or null. */
  val lastCheck: Long? = null,
  val status: CheckStatus = CheckStatus.Idle,
)

/**
 * Month-start updates without a new APK (user request, 2026-10-26). The build script also writes
 * the tables to data/hijri-tables.json; once that's pushed to GitHub, installed apps download it
 * (at most once a day, or from Settings → Calendar data), validate it hard (validateTableData),
 * and switch to it if it's newer than what they use. The download is kept for offline starts.
 *
 * `fetch` returns the body of a successful (2xx) response and throws otherwise.
 */
class TableUpdates(
  private val store: KeyValueStore,
  private val fetch: suspend (url: String) -> String,
  private val clock: () -> Long = System::currentTimeMillis,
) {
  private val _state = MutableStateFlow(TableState())
  val state: StateFlow<TableState> = _state.asStateFlow()
  private val checking = Mutex()

  /** At startup, before the first frame: switch to a stored download that is newer than the
   * bundled tables, and read when the app last checked. Synchronous (a few KB). */
  fun restore() {
    try {
      val data = store.getString(STORED_KEY)?.let { validateTableData(JSONObject(it)) }
      if (data != null && data.generated > currentTables().generated) {
        setTableData(data)
        _state.update { it.copy(version = it.version + 1, source = TableSource.Downloaded, generated = data.generated) }
      }
      _state.update { it.copy(lastCheck = store.getString(LAST_CHECK_KEY)?.toLongOrNull()) }
    } catch (e: Exception) {
      // Unreadable storage: keep the bundled tables.
    }
  }

  /** After [restore]: download if a day has passed since the last check. */
  suspend fun checkIfDue() {
    val lastCheck = _state.value.lastCheck
    if (lastCheck == null || clock() - lastCheck > CHECK_EVERY_MS) check()
  }

  /** Download and apply if newer. `force` ignores the once-a-day limit (the Settings button). */
  suspend fun check(force: Boolean = false) {
    if (!checking.tryLock()) return
    try {
      val lastCheck = _state.value.lastCheck
      if (!force && lastCheck != null && clock() - lastCheck < CHECK_EVERY_MS) return
      _state.update { it.copy(status = CheckStatus.Checking) }
      try {
        val text = fetch(TABLES_URL)
        val data = validateTableData(JSONObject(text))
        val now = clock()
        store.putString(LAST_CHECK_KEY, now.toString())
        if (data == null) {
          _state.update { it.copy(status = CheckStatus.Failed, lastCheck = now) }
        } else if (data.generated > currentTables().generated) {
          store.putString(STORED_KEY, text)
          setTableData(data)
          _state.update {
            it.copy(
              version = it.version + 1,
              source = TableSource.Downloaded,
              generated = data.generated,
              status = CheckStatus.Updated,
              lastCheck = now,
            )
          }
        } else {
          _state.update { it.copy(status = CheckStatus.UpToDate, lastCheck = now) }
        }
      } catch (e: CancellationException) {
        _state.update { it.copy(status = CheckStatus.Idle) }
        throw e
      } catch (e: Exception) {
        _state.update { it.copy(status = CheckStatus.Failed) }
      }
    } finally {
      checking.unlock()
    }
  }

  companion object {
    const val TABLES_URL = "https://raw.githubusercontent.com/MJFneish/Gregorian-hijri-date-converter/develop/data/hijri-tables.json"
    const val STORED_KEY = "tables-remote"
    const val LAST_CHECK_KEY = "tables-last-check"
    const val CHECK_EVERY_MS = 24 * 3_600_000L
  }
}
