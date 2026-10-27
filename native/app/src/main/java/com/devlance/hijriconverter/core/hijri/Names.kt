package com.devlance.hijriconverter.core.hijri

import com.devlance.hijriconverter.core.Lang

val HIJRI_MONTHS_AR = listOf(
  "محرّم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوّال",
  "ذو القعدة",
  "ذو الحجة",
)

val HIJRI_MONTHS_EN = listOf(
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
)

/** Levantine month names — what Lebanese calendars print (same set prayer-times-lb uses). */
val GREGORIAN_MONTHS_AR = listOf(
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تمّوز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
)

val GREGORIAN_MONTHS_EN = listOf(
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
)

private val WEEKDAYS_AR = listOf("الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت")
private val WEEKDAYS_EN = listOf("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")

fun hijriMonthName(month: Int, lang: Lang): String = (if (lang == Lang.AR) HIJRI_MONTHS_AR else HIJRI_MONTHS_EN)[month - 1]

fun gregorianMonthName(month: Int, lang: Lang): String =
  (if (lang == Lang.AR) GREGORIAN_MONTHS_AR else GREGORIAN_MONTHS_EN)[month - 1]

/** 0 = Sunday. */
fun weekdayName(weekday: Int, lang: Lang): String = (if (lang == Lang.AR) WEEKDAYS_AR else WEEKDAYS_EN)[weekday]
