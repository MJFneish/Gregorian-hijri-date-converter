package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.HijriDate

enum class OccasionKind { Mourning, Celebration, Other }

data class Occasion(
  val month: Int,
  /** Ignored when [lastDayOfMonth] is set. */
  val day: Int,
  val kind: OccasionKind,
  val nameEn: String,
  val nameAr: String,
  /** Observed on the month's last day, whether that's the 29th or the 30th. */
  val lastDayOfMonth: Boolean = false,
) {
  fun name(lang: Lang): String = if (lang == Lang.AR) nameAr else nameEn
}

private fun o(month: Int, day: Int, kind: OccasionKind, en: String, ar: String, lastDayOfMonth: Boolean = false) =
  Occasion(month, day, kind, en, ar, lastDayOfMonth)

private val M = OccasionKind.Mourning
private val C = OccasionKind.Celebration
private val X = OccasionKind.Other

/**
 * Twelver Shia occasions, as observed in Lebanon / Iran's official calendar. Researched against
 * Iran's official holiday list, Sistani's office (I.M.A.M.) monthly lists, Fadlallah's office and
 * WikiShia — see CLAUDE.md "Occasions". Where narrations differ, the date Iran's calendar (and
 * Lebanese Hezbollah-affiliated calendars) use is the one listed; the alternative is noted inline.
 * One entry per (month, day): occasions that coincide are merged.
 */
val OCCASIONS: List<Occasion> = listOf(
  o(1, 1, X, "Islamic New Year", "رأس السنة الهجرية"),
  o(1, 9, M, "Tasu'a (9th of Muharram)", "تاسوعاء"),
  o(1, 10, M, "Ashura — Martyrdom of Imam Husayn (AS)", "عاشوراء — استشهاد الإمام الحسين (ع)"),
  // Alternative narration: 12 Muharram.
  o(1, 25, M, "Martyrdom of Imam Ali Zayn al-Abidin (AS)", "استشهاد الإمام علي زين العابدين (ع)"),
  // Arab/Sistani-office date; Iran's calendar marks it on 20 Dhu al-Hijjah.
  o(2, 7, C, "Birth of Imam Musa al-Kazim (AS)", "ولادة الإمام موسى الكاظم (ع)"),
  o(2, 20, M, "Arbaeen of Imam Husayn (AS)", "أربعين الإمام الحسين (ع)"),
  // Iran/Lebanon date for Imam Hasan; Iraqi/Sistani-office calendars use 7 Safar.
  o(2, 28, M, "Demise of the Prophet (SAWA) & Martyrdom of Imam Hasan (AS)", "وفاة الرسول الأكرم (ص) واستشهاد الإمام الحسن المجتبى (ع)"),
  // Iraqi/Sistani-office calendars use 17 Safar.
  o(2, 30, M, "Martyrdom of Imam Ali al-Rida (AS)", "استشهاد الإمام علي بن موسى الرضا (ع)", lastDayOfMonth = true),
  o(3, 8, M, "Martyrdom of Imam Hasan al-Askari (AS)", "استشهاد الإمام الحسن العسكري (ع)"),
  o(3, 9, C, "Beginning of the Imamate of Imam al-Mahdi (AJ)", "بداية إمامة الإمام المهدي (عج)"),
  // Sunni Mawlid date is 12 Rabi' al-Awwal; 12–17 is Islamic Unity Week.
  o(3, 17, C, "Birth of the Prophet Muhammad (SAWA) & Imam al-Sadiq (AS)", "ولادة الرسول الأكرم (ص) والإمام جعفر الصادق (ع)"),
  o(4, 8, C, "Birth of Imam Hasan al-Askari (AS)", "ولادة الإمام الحسن العسكري (ع)"),
  o(4, 10, M, "Demise of Sayyida Fatima al-Ma'suma (AS)", "وفاة السيدة فاطمة المعصومة (ع)"),
  o(5, 5, C, "Birth of Sayyida Zaynab (AS)", "ولادة السيدة زينب الكبرى (ع)"),
  // 75-day narration (first Fatimiyya), mourned in addition to 3 Jumada al-Thani.
  o(5, 13, M, "Martyrdom of Sayyida Fatima al-Zahra (AS) — First Fatimiyya", "استشهاد السيدة فاطمة الزهراء (ع) — الفاطمية الأولى"),
  // 95-day narration (second Fatimiyya) — Iran's official date.
  o(6, 3, M, "Martyrdom of Sayyida Fatima al-Zahra (AS)", "استشهاد السيدة فاطمة الزهراء (ع)"),
  o(6, 20, C, "Birth of Sayyida Fatima al-Zahra (AS)", "ولادة السيدة فاطمة الزهراء (ع)"),
  // Alternative narration: 3 Safar.
  o(7, 1, C, "Birth of Imam Muhammad al-Baqir (AS)", "ولادة الإمام محمد الباقر (ع)"),
  // Alternative narration: 26 Jumada al-Thani.
  o(7, 3, M, "Martyrdom of Imam Ali al-Hadi (AS)", "استشهاد الإمام علي الهادي (ع)"),
  o(7, 10, C, "Birth of Imam Muhammad al-Jawad (AS)", "ولادة الإمام محمد الجواد (ع)"),
  o(7, 13, C, "Birth of Imam Ali ibn Abi Talib (AS)", "ولادة أمير المؤمنين الإمام علي (ع)"),
  o(7, 15, M, "Demise of Sayyida Zaynab (AS)", "وفاة السيدة زينب الكبرى (ع)"),
  o(7, 25, M, "Martyrdom of Imam Musa al-Kazim (AS)", "استشهاد الإمام موسى الكاظم (ع)"),
  o(7, 27, C, "Mab'ath — Beginning of the Prophet's (SAWA) Mission", "المبعث النبوي الشريف"),
  o(8, 3, C, "Birth of Imam Husayn (AS)", "ولادة الإمام الحسين (ع)"),
  o(8, 4, C, "Birth of al-Abbas ibn Ali (AS)", "ولادة أبي الفضل العباس (ع)"),
  // Alternative narration: 15 Jumada al-Awwal.
  o(8, 5, C, "Birth of Imam Ali Zayn al-Abidin (AS)", "ولادة الإمام علي زين العابدين (ع)"),
  o(8, 15, C, "Birth of Imam al-Mahdi (AJ)", "ولادة الإمام المهدي المنتظر (عج)"),
  o(9, 1, X, "First day of Ramadan", "أول أيام شهر رمضان المبارك"),
  o(9, 15, C, "Birth of Imam Hasan al-Mujtaba (AS)", "ولادة الإمام الحسن المجتبى (ع)"),
  // The Qadr nights are the eves of the 19th, 21st and 23rd (from Maghrib of the previous day).
  o(9, 19, M, "Laylat al-Qadr — Wounding of Imam Ali (AS)", "ليلة القدر — جرح أمير المؤمنين الإمام علي (ع)"),
  o(9, 21, M, "Laylat al-Qadr — Martyrdom of Imam Ali (AS)", "ليلة القدر — استشهاد أمير المؤمنين الإمام علي (ع)"),
  o(9, 23, X, "Laylat al-Qadr", "ليلة القدر"),
  o(10, 1, C, "Eid al-Fitr", "عيد الفطر السعيد"),
  // Alternative narration: 15 Rajab.
  o(10, 25, M, "Martyrdom of Imam Ja'far al-Sadiq (AS)", "استشهاد الإمام جعفر الصادق (ع)"),
  o(11, 1, C, "Birth of Sayyida Fatima al-Ma'suma (AS)", "ولادة السيدة فاطمة المعصومة (ع)"),
  o(11, 11, C, "Birth of Imam Ali al-Rida (AS)", "ولادة الإمام علي بن موسى الرضا (ع)"),
  o(11, 30, M, "Martyrdom of Imam Muhammad al-Jawad (AS)", "استشهاد الإمام محمد الجواد (ع)", lastDayOfMonth = true),
  o(12, 7, M, "Martyrdom of Imam Muhammad al-Baqir (AS)", "استشهاد الإمام محمد الباقر (ع)"),
  o(12, 9, X, "Day of Arafah", "يوم عرفة"),
  o(12, 10, C, "Eid al-Adha", "عيد الأضحى المبارك"),
  // Alternative narration: 2 Rajab.
  o(12, 15, C, "Birth of Imam Ali al-Hadi (AS)", "ولادة الإمام علي الهادي (ع)"),
  o(12, 18, C, "Eid al-Ghadir", "عيد الغدير الأغر"),
  o(12, 24, C, "Day of Mubahala", "يوم المباهلة"),
)

/** Occasions falling on a Hijri date. `monthLength` (29/30) resolves the last-day-of-month ones. */
fun occasionsOn(date: HijriDate, monthLength: Int): List<Occasion> = OCCASIONS.filter { o ->
  o.month == date.month && (if (o.lastDayOfMonth) date.day == monthLength else o.day == date.day)
}
