package com.devlance.hijriconverter

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.devlance.hijriconverter.data.AppStore
import com.devlance.hijriconverter.ui.AppRoot
import com.devlance.hijriconverter.ui.theme.HijriTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // The system splash (night + emblem) is removed without a fade: the loading screen's first
    // frame underneath is identical.
    installSplashScreen().setOnExitAnimationListener { it.remove() }
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      val settings by AppStore.settings.collectAsStateWithLifecycle()
      HijriTheme(settings) { AppRoot() }
    }
  }
}
