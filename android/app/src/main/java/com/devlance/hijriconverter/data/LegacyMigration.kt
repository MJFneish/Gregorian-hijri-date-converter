package com.devlance.hijriconverter.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import org.json.JSONObject

/**
 * Reads what v1 (the React Native app) saved, for the first launch after the update. v1 kept its
 * state in AsyncStorage 2.x, which on Android is the SQLite database "RKStorage", table
 * "catalystLocalStorage" (key, value):
 * - `hijri-converter-settings`: the zustand settings store, `{"state": {...}, "version": 0}` — the
 *   state has the shape v2 persists (SettingsJson), so it's handed over as is;
 * - `hijri-tables-remote`: the last downloaded month tables (data/hijri-tables.json, raw text);
 * - `hijri-tables-last-check`: when the app last asked GitHub for them (epoch ms, as text).
 * The old database is left in place (opened read-only, a few KB).
 */
object LegacyMigration {
  data class Legacy(val settings: JSONObject?, val tablesRemote: String?, val tablesLastCheck: Long?)

  private const val DATABASE = "RKStorage"
  private const val TABLE = "catalystLocalStorage"
  private const val SETTINGS_KEY = "hijri-converter-settings"
  private const val TABLES_KEY = "hijri-tables-remote"
  private const val LAST_CHECK_KEY = "hijri-tables-last-check"

  private val NONE = Legacy(null, null, null)

  fun read(context: Context): Legacy {
    val file = context.getDatabasePath(DATABASE)
    if (!file.exists()) return NONE
    return try {
      SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
        val values = HashMap<String, String>()
        db.rawQuery(
          "SELECT key, value FROM $TABLE WHERE key IN (?, ?, ?)",
          arrayOf(SETTINGS_KEY, TABLES_KEY, LAST_CHECK_KEY),
        ).use { cursor ->
          while (cursor.moveToNext()) values[cursor.getString(0)] = cursor.getString(1)
        }
        Legacy(
          settings = values[SETTINGS_KEY]?.let { runCatching { JSONObject(it).optJSONObject("state") }.getOrNull() },
          tablesRemote = values[TABLES_KEY],
          tablesLastCheck = values[LAST_CHECK_KEY]?.trim()?.toDoubleOrNull()?.toLong(),
        )
      }
    } catch (e: Exception) {
      NONE
    }
  }
}
