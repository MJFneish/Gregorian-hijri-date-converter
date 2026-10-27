package com.devlance.hijriconverter.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.devlance.hijriconverter.ui.components.CenteredNote
import com.devlance.hijriconverter.ui.theme.appTheme

/** Home = the Today card and the converter (ported in the next pre-release). */
@Composable
fun HomeScreen() {
  Box(Modifier.fillMaxSize().background(appTheme().colors.background)) {
    CenteredNote("The converter arrives in the next 2.0.0 pre-release.")
  }
}
