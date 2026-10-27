package com.devlance.hijriconverter

import android.app.Application
import com.devlance.hijriconverter.data.AppStore
import com.devlance.hijriconverter.i18n.Strings

class HijriApp : Application() {
  override fun onCreate() {
    super.onCreate()
    Strings.reader = { path -> assets.open(path).bufferedReader().use { it.readText() } }
    AppStore.init(this)
  }
}
