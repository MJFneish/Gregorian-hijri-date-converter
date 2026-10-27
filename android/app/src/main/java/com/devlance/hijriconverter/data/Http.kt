package com.devlance.hijriconverter.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** GET `url` as text (10 s timeouts, no cached copy); throws on a network error or a non-2xx reply. */
suspend fun httpGetText(url: String): String = withContext(Dispatchers.IO) {
  val connection = URL(url).openConnection() as HttpURLConnection
  try {
    connection.connectTimeout = 10_000
    connection.readTimeout = 10_000
    connection.useCaches = false
    connection.setRequestProperty("Cache-Control", "no-cache")
    val code = connection.responseCode
    if (code !in 200..299) throw IOException("HTTP $code")
    connection.inputStream.bufferedReader().use { it.readText() }
  } finally {
    connection.disconnect()
  }
}
