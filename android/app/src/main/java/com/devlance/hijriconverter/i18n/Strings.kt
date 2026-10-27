package com.devlance.hijriconverter.i18n

import com.devlance.hijriconverter.core.Lang
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * The app's texts in one language, from assets/i18n/<lang>.json (v1's i18next files, unchanged):
 * nested keys addressed with dots ("settings.language"), `{{name}}` placeholders. The app's
 * language is its own setting, independent of the phone's, and switches instantly — so texts are
 * looked up here rather than through Android string resources. Missing keys fall back to English.
 */
class Strings private constructor(val lang: Lang, private val table: Map<String, String>, private val fallback: Strings?) {
  operator fun get(key: String): String = table[key] ?: fallback?.get(key) ?: key

  /** `t("home.eveOf", "date" to …)` — v1's `t(key, { date })`. */
  fun t(key: String, vararg args: Pair<String, Any?>): String {
    var text = get(key)
    for ((name, value) in args) text = text.replace("{{$name}}", value.toString())
    return text
  }

  companion object {
    /** Reads an asset as text; set once at startup (tests read the files from disk). */
    @Volatile
    var reader: (String) -> String = { path -> error("Strings.reader not set (asset $path)") }

    private val cache = ConcurrentHashMap<Lang, Strings>()

    fun of(lang: Lang): Strings = cache.getOrPut(lang) {
      Strings(lang, load(lang), if (lang == Lang.EN) null else of(Lang.EN))
    }

    private fun load(lang: Lang): Map<String, String> {
      val out = HashMap<String, String>()
      fun flatten(o: JSONObject, prefix: String) {
        for (key in o.keys()) {
          when (val value = o.get(key)) {
            is JSONObject -> flatten(value, "$prefix$key.")
            else -> out["$prefix$key"] = value.toString()
          }
        }
      }
      flatten(JSONObject(reader("i18n/${lang.code}.json")), "")
      return out
    }
  }
}
