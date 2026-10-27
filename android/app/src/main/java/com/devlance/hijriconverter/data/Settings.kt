package com.devlance.hijriconverter.data

import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.core.hijri.DEFAULT_METHOD
import com.devlance.hijriconverter.core.hijri.MAX_ADJUSTMENT
import com.devlance.hijriconverter.core.hijri.MethodId
import org.json.JSONObject
import kotlin.math.floor

enum class ThemeMode(val id: String) {
  System("system"),
  Light("light"),
  Dark("dark");

  companion object {
    fun fromId(id: String?): ThemeMode? = entries.firstOrNull { it.id == id }
  }
}

/** Everything the user chooses, persisted on the phone (v1's settings store, same fields). */
data class Settings(
  val language: Lang,
  val themeMode: ThemeMode = ThemeMode.System,
  /** Which authority's calendar to follow (Settings → Calculation method). */
  val method: MethodId = DEFAULT_METHOD,
  /** Manual Hijri shift in days, −MAX_ADJUSTMENT…+MAX_ADJUSTMENT. */
  val adjustment: Int = 0,
  val onboardingDone: Boolean = false,
  /** Tools → Hijri birthday: the user's birth date as a JDN (stored on the phone only), or null. */
  val birthJdn: Int? = null,
)

fun clampAdjustment(value: Double): Int =
  floor(value + 0.5).toInt().coerceIn(-MAX_ADJUSTMENT, MAX_ADJUSTMENT) // v1: Math.round, then clamp

/**
 * Settings as JSON — the shape v1 persisted (zustand `state`: language, themeMode, method,
 * adjustment, onboardingDone, birthJdn), so v1's stored settings decode as they are. Decoding
 * guards against values a future/older build wrote that this one doesn't know, as v1's `merge` did.
 */
object SettingsJson {
  fun encode(s: Settings): JSONObject = JSONObject()
    .put("language", s.language.code)
    .put("themeMode", s.themeMode.id)
    .put("method", s.method.id)
    .put("adjustment", s.adjustment)
    .put("onboardingDone", s.onboardingDone)
    .put("birthJdn", s.birthJdn ?: JSONObject.NULL)

  fun decode(o: JSONObject, deviceLanguage: Lang): Settings {
    val adjustment = (o.opt("adjustment") as? Number)?.toDouble()?.takeIf { it.isFinite() }
    val birth = o.opt("birthJdn") as? Number
    return Settings(
      language = Lang.fromCode(o.opt("language") as? String) ?: deviceLanguage,
      themeMode = ThemeMode.fromId(o.opt("themeMode") as? String) ?: ThemeMode.System,
      method = MethodId.fromId(o.opt("method") as? String) ?: DEFAULT_METHOD,
      adjustment = if (adjustment != null) clampAdjustment(adjustment) else 0,
      onboardingDone = o.opt("onboardingDone") == true,
      birthJdn = birth?.toDouble()?.takeIf { it.isFinite() && it == floor(it) && kotlin.math.abs(it) < Int.MAX_VALUE }?.toInt(),
    )
  }
}
