package com.devlance.hijriconverter.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.devlance.hijriconverter.core.hijri.ConversionOptions
import com.devlance.hijriconverter.data.AppStore
import com.devlance.hijriconverter.data.Settings
import com.devlance.hijriconverter.data.TableState
import kotlinx.coroutines.delay

/** The current settings; recomposes on change. */
@Composable
fun useSettings(): Settings {
  val settings by AppStore.settings.collectAsStateWithLifecycle()
  return settings
}

/** Which month tables are in use and the last update check. */
@Composable
fun useTables(): TableState {
  val tables by AppStore.tables.state.collectAsStateWithLifecycle()
  return tables
}

/** The user's method + adjustment. Its value also changes when downloaded month tables replace
 * the ones in use (tablesVersion), so everything remembered on it recomputes — key conversions on
 * the whole options, not just the method. */
@Composable
fun useConversionOptions(): ConversionOptions {
  val settings = useSettings()
  val tables = useTables()
  return remember(settings.method, settings.adjustment, tables.version) {
    ConversionOptions(settings.method, settings.adjustment, tables.version)
  }
}

/** Current time, refreshed every `periodMs` and whenever the app returns to the foreground —
 * so "today" and the Maghrib eve hint roll over without restarting the app. */
@Composable
fun rememberNow(periodMs: Long = 30_000): Long {
  var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
  val lifecycle = LocalLifecycleOwner.current.lifecycle
  androidx.compose.runtime.LaunchedEffect(lifecycle, periodMs) {
    lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
      while (true) {
        now = System.currentTimeMillis()
        delay(periodMs)
      }
    }
  }
  return now
}
