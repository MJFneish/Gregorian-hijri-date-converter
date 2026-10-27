package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.ConversionOptions
import com.devlance.hijriconverter.core.hijri.MethodId
import java.io.File

/** "2002-03-22" -> its JDN. */
fun jdnOf(iso: String): Int = gregorianToJdn(iso(iso))

fun iso(text: String): GregorianDate {
  val (y, m, d) = text.split("-").map(String::toInt)
  return GregorianDate(y, m, d)
}

fun opts(method: MethodId, adjustment: Int = 0) = ConversionOptions(method, adjustment)

/** A file of the repository (Gradle runs unit tests in native/app). */
fun repoFile(path: String): File {
  var dir: File? = File(System.getProperty("user.dir") ?: ".").absoluteFile
  while (dir != null && !File(dir, "data/hijri-tables.json").exists()) dir = dir.parentFile
  return File(requireNotNull(dir) { "repository root not found" }, path)
}

/** UTC noon of a JDN's civil day, in epoch ms (v1's `Date.UTC(y, m - 1, d, 12)`). */
fun noonUtc(jdn: Int): Long = utcMidnightMs(jdnToGregorian(jdn)) + 12 * 3_600_000L
