package com.devlance.hijriconverter.data

import android.content.Context
import android.content.SharedPreferences
import com.devlance.hijriconverter.core.Lang
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.Locale

/**
 * The app's persisted state — settings and the month-table updates — as observable flows, saved to
 * SharedPreferences on every change. Loaded synchronously at startup (a few KB), so the first frame
 * already has the user's language, theme and method. On the first launch after updating from v1,
 * the state is imported from v1's storage (LegacyMigration).
 */
object AppStore {
  private const val PREFS = "hijriconverter"
  private const val KEY_SETTINGS = "settings"

  private lateinit var prefs: SharedPreferences

  /** Work that outlives a screen (the daily table check). */
  val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

  private val _settings = MutableStateFlow(Settings(language = Lang.EN))
  val settings: StateFlow<Settings> = _settings.asStateFlow()

  lateinit var tables: TableUpdates
    private set

  @Synchronized
  fun init(context: Context) {
    if (::prefs.isInitialized) return
    prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val deviceLang = if (Locale.getDefault().language == "ar") Lang.AR else Lang.EN

    if (!prefs.contains(KEY_SETTINGS)) {
      // First launch of v2: carry v1's state over (if this install was v1), else start fresh.
      val legacy = LegacyMigration.read(context)
      prefs.edit()
        .putString(KEY_SETTINGS, (legacy.settings ?: JSONObject()).toString())
        .apply { legacy.tablesRemote?.let { putString(TableUpdates.STORED_KEY, it) } }
        .apply { legacy.tablesLastCheck?.let { putString(TableUpdates.LAST_CHECK_KEY, it.toString()) } }
        .commit()
    }

    _settings.value = prefs.getString(KEY_SETTINGS, null)
      ?.let { runCatching { SettingsJson.decode(JSONObject(it), deviceLang) }.getOrNull() }
      ?: Settings(language = deviceLang)

    tables = TableUpdates(
      store = object : KeyValueStore {
        override fun getString(key: String): String? = prefs.getString(key, null)
        override fun putString(key: String, value: String) {
          prefs.edit().putString(key, value).apply()
        }
      },
      fetch = ::httpGetText,
    )
    tables.restore()
    scope.launch { tables.checkIfDue() }
  }

  fun updateSettings(transform: (Settings) -> Settings) {
    _settings.update(transform)
    prefs.edit().putString(KEY_SETTINGS, SettingsJson.encode(_settings.value).toString()).apply()
  }
}
