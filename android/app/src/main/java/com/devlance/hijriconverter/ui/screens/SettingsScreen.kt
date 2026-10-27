package com.devlance.hijriconverter.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.devlance.hijriconverter.BuildConfig
import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.core.formatGregorian
import com.devlance.hijriconverter.core.formatHijri
import com.devlance.hijriconverter.core.formatTime
import com.devlance.hijriconverter.core.hijri.MAX_ADJUSTMENT
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.hijriOfJdn
import com.devlance.hijriconverter.core.localDate
import com.devlance.hijriconverter.core.localizeDigits
import com.devlance.hijriconverter.core.todayJdn
import com.devlance.hijriconverter.data.AppStore
import com.devlance.hijriconverter.data.CheckStatus
import com.devlance.hijriconverter.data.TableSource
import com.devlance.hijriconverter.data.ThemeMode
import com.devlance.hijriconverter.ui.LocalNavigator
import com.devlance.hijriconverter.ui.Route
import com.devlance.hijriconverter.ui.brand.AppLogo
import com.devlance.hijriconverter.ui.components.Card
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.IconBadge
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.SectionLabel
import com.devlance.hijriconverter.ui.components.SegmentOption
import com.devlance.hijriconverter.ui.components.SegmentedControl
import com.devlance.hijriconverter.ui.components.Tag
import com.devlance.hijriconverter.ui.components.pressDim
import com.devlance.hijriconverter.ui.components.pressable
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import com.devlance.hijriconverter.ui.useSettings
import com.devlance.hijriconverter.ui.useTables
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

@Composable
fun SettingsScreen() {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val settings = useSettings()
  val navigator = LocalNavigator.current
  val followSystem = settings.themeMode == ThemeMode.System
  val previewToday = remember(settings.method, settings.adjustment, theme.lang) {
    formatHijri(hijriOfJdn(todayJdn(), com.devlance.hijriconverter.core.hijri.ConversionOptions(settings.method, settings.adjustment)), theme.lang)
  }
  val signedAdjustment = if (settings.adjustment > 0) "+${settings.adjustment}" else settings.adjustment.toString()

  Column(
    Modifier
      .fillMaxSize()
      .background(c.background)
      .windowInsetsPadding(WindowInsets.statusBars)
      .verticalScroll(rememberScrollState())
      .padding(start = Spacing.lg, end = Spacing.lg, top = Spacing.md, bottom = Spacing.xxxl),
  ) {
    Text(s["settings.title"], style = Type.displayMedium, color = c.text, modifier = Modifier.semantics { heading() })

    // Language
    SectionLabel(s["settings.language"], first = true)
    SegmentedControl(
      options = listOf(SegmentOption(Lang.EN, "English"), SegmentOption(Lang.AR, "العربية")),
      value = settings.language,
      onChange = { lang -> AppStore.updateSettings { it.copy(language = lang) } },
    )

    // Appearance — follow-system switch, light/dark tiles otherwise (prayer-times-lb's interaction)
    SectionLabel(s["settings.appearance"])
    Card {
      Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
        IconBadge(Lucide.Contrast, c.primary, c.surfaceAlt)
        Column(Modifier.weight(1f)) {
          Text(s["settings.followSystem"], style = Type.bodyStrong, color = c.text)
          Text(s["settings.followSystemHint"], style = Type.caption, color = c.textMuted)
        }
        Switch(
          checked = followSystem,
          onCheckedChange = { on ->
            AppStore.updateSettings {
              it.copy(themeMode = if (on) ThemeMode.System else if (theme.isDark) ThemeMode.Dark else ThemeMode.Light)
            }
          },
          colors = SwitchDefaults.colors(
            checkedTrackColor = c.primary,
            checkedThumbColor = c.onPrimary,
            uncheckedTrackColor = c.switchTrackOff,
            uncheckedThumbColor = c.switchThumbOff,
            uncheckedBorderColor = c.switchTrackOff,
          ),
          modifier = Modifier.semantics { contentDescription = s["settings.followSystem"] },
        )
      }
      AnimatedVisibility(
        visible = !followSystem,
        enter = fadeIn(tween(200)) + expandVertically(tween(200)),
        exit = fadeOut(tween(150)) + shrinkVertically(tween(150)),
      ) {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), modifier = Modifier.padding(top = Spacing.md).selectableGroup()) {
          for ((mode, key, icon) in listOf(
            Triple(ThemeMode.Light, "settings.light", Lucide.Sun),
            Triple(ThemeMode.Dark, "settings.dark", Lucide.Moon),
          )) {
            val active = settings.themeMode == mode
            Column(
              horizontalAlignment = Alignment.CenterHorizontally,
              verticalArrangement = Arrangement.spacedBy(Spacing.xs, Alignment.CenterVertically),
              modifier = Modifier
                .weight(1f)
                .heightIn(min = 72.dp)
                .clip(RoundedCornerShape(Radius.md))
                .border(1.5.dp, if (active) c.primary else c.border, RoundedCornerShape(Radius.md))
                .background(if (active) c.primarySoft else Color.Transparent)
                .selectable(selected = active, role = Role.RadioButton) { AppStore.updateSettings { it.copy(themeMode = mode) } }
                .padding(vertical = Spacing.md),
            ) {
              Icon(icon, if (active) c.primary else c.textMuted, 22.dp)
              Text(s[key], style = Type.bodyStrong, color = if (active) c.primary else c.text)
            }
          }
        }
      }
    }

    // Calculation method
    SectionLabel(s["settings.method"])
    Text(s["settings.methodHint"], style = Type.caption, color = c.textMuted, modifier = Modifier.padding(bottom = Spacing.sm))
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm), modifier = Modifier.selectableGroup()) {
      for (id in MethodId.entries) MethodCard(id, active = id == settings.method)
    }

    // Manual adjustment
    SectionLabel(s["settings.adjustment"])
    Card {
      Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
        StepperButton(Lucide.Minus, s["settings.adjustmentMinus"], enabled = settings.adjustment > -MAX_ADJUSTMENT) {
          AppStore.updateSettings { it.copy(adjustment = (it.adjustment - 1).coerceAtLeast(-MAX_ADJUSTMENT)) }
        }
        Column(Modifier.weight(1f).semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite }) {
          Text(localizeDigits(signedAdjustment, theme.lang), style = Type.displayMedium, color = c.text, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
          Text(s["settings.adjustmentUnit"], style = Type.caption, color = c.textMuted, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }
        StepperButton(Lucide.Plus, s["settings.adjustmentPlus"], enabled = settings.adjustment < MAX_ADJUSTMENT) {
          AppStore.updateSettings { it.copy(adjustment = (it.adjustment + 1).coerceAtMost(MAX_ADJUSTMENT)) }
        }
      }
      Text(s["settings.adjustmentHint"], style = Type.caption, color = c.textMuted, modifier = Modifier.padding(top = Spacing.md))
      Text(s.t("settings.adjustmentPreview", "date" to previewToday), style = Type.bodyStrong, color = c.primary, modifier = Modifier.padding(top = Spacing.sm))
    }

    // Calendar data: month-start updates without a new APK
    SectionLabel(s["settings.calendarData.title"])
    CalendarDataCard()

    // Help
    SectionLabel(s["settings.help"])
    Card(padding = 0.dp) {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
        modifier = Modifier
          .fillMaxWidth()
          .heightIn(min = 64.dp)
          .pressDim(onClick = { navigator.push(Route.Onboarding(replay = true)) })
          .padding(Spacing.lg),
      ) {
        IconBadge(Lucide.Sparkles, c.primary, c.surfaceAlt)
        Text(s["settings.showIntro"], style = Type.bodyStrong, color = c.text, modifier = Modifier.weight(1f))
        Icon(if (theme.isRtl) Lucide.ChevronLeft else Lucide.ChevronRight, c.textMuted, 20.dp)
      }
    }

    // About
    SectionLabel(s["settings.about"])
    Card {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
        modifier = Modifier.padding(bottom = Spacing.md),
      ) {
        AppLogo(52.dp, tile = true)
        Column(Modifier.weight(1f)) {
          Text(s["app.name"], style = Type.subtitle, color = c.text)
          // In a left-to-right isolate, so "2.0.0-alpha.3" keeps its order inside Arabic text.
          Text(s.t("settings.version", "version" to "\u2066${localizeDigits(BuildConfig.VERSION_NAME, theme.lang)}\u2069"), style = Type.caption, color = c.textMuted)
        }
      }
      Text(s["settings.aboutBody"], style = Type.body, color = c.text)
      Text(s["settings.credits"], style = Type.caption, color = c.textMuted, modifier = Modifier.padding(top = Spacing.md))
    }

    Row(
      horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
      modifier = Modifier
        .padding(top = Spacing.xl)
        .fillMaxWidth()
        .border(1.dp, c.border, RoundedCornerShape(Radius.md))
        .padding(Spacing.md),
    ) {
      Icon(Lucide.Info, c.textMuted, 18.dp)
      Text(s["settings.disclaimer"], style = Type.caption, color = c.textMuted, modifier = Modifier.weight(1f))
    }
  }
}

@Composable
private fun MethodCard(id: MethodId, active: Boolean) {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val shape = RoundedCornerShape(Radius.lg)
  Row(
    horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    modifier = Modifier
      .fillMaxWidth()
      .pressable(onClick = { AppStore.updateSettings { it.copy(method = id) } }, role = Role.RadioButton)
      .semantics(mergeDescendants = true) {}
      .clip(shape)
      .background(if (active) c.primarySoft else c.card)
      .border(1.5.dp, if (active) c.primary else c.border, shape)
      .padding(Spacing.lg),
  ) {
    Icon(if (active) Lucide.CircleCheck else Lucide.Circle, if (active) c.primary else c.textMuted, 22.dp)
    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
      FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(s["methods.${id.id}.name"], style = Type.bodyStrong, color = c.text, modifier = Modifier.align(Alignment.CenterVertically))
        if (id == MethodId.Iran) Tag(s["settings.defaultTag"], c.primary, c.surface, Modifier.align(Alignment.CenterVertically))
        if (id == MethodId.UmmAlQura) Tag(s["settings.sunniTag"], c.accent, c.accentSoft, Modifier.align(Alignment.CenterVertically))
      }
      Text(s["methods.${id.id}.description"], style = Type.caption, color = c.textMuted)
    }
  }
}

@Composable
private fun StepperButton(icon: Lucide, label: String, enabled: Boolean, onClick: () -> Unit) {
  val c = appTheme().colors
  Box(
    Modifier
      .size(48.dp)
      .clip(CircleShape)
      .background(c.surfaceAlt)
      .pressable(onClick = onClick, enabled = enabled, label = label),
    contentAlignment = Alignment.Center,
  ) { Icon(icon, c.primary, 20.dp) }
}

/**
 * Settings → Calendar data: which month tables are in use (bundled with the app, or downloaded
 * from the repo), when the app last checked, and a "Check for updates" button (TableUpdates).
 */
@Composable
private fun CalendarDataCard() {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val tables = useTables()
  val scope = rememberCoroutineScope()
  val checking = tables.status == CheckStatus.Checking

  val dataDate = formatGregorian(localDate(parseIsoUtc(tables.generated)), theme.lang)
  val checkedText = tables.lastCheck?.let {
    s.t("settings.calendarData.lastCheck", "date" to "${formatGregorian(localDate(it), theme.lang)} ${formatTime(it, theme.lang)}")
  } ?: s["settings.calendarData.neverChecked"]
  val statusColor = when (tables.status) {
    CheckStatus.Failed -> c.mourning
    CheckStatus.Updated -> c.celebration
    else -> c.textMuted
  }

  Card {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
      IconBadge(Lucide.CloudDownload, c.primary, c.primarySoft)
      Column(Modifier.weight(1f)) {
        Text(
          s.t(if (tables.source == TableSource.Downloaded) "settings.calendarData.downloaded" else "settings.calendarData.builtIn", "date" to dataDate),
          style = Type.bodyStrong,
          color = c.text,
        )
        Text(checkedText, style = Type.caption, color = c.textMuted)
      }
    }
    Text(s["settings.calendarData.hint"], style = Type.caption, color = c.textMuted, modifier = Modifier.padding(top = Spacing.md))
    Row(
      horizontalArrangement = Arrangement.spacedBy(Spacing.sm, Alignment.CenterHorizontally),
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier
        .padding(top = Spacing.md)
        .fillMaxWidth()
        .heightIn(min = 48.dp)
        .pressable(
          onClick = { scope.launch { AppStore.tables.check(force = true) } },
          enabled = !checking,
          dimWhenDisabled = false,
          label = s["settings.calendarData.check"],
        )
        .border(1.dp, c.border, RoundedCornerShape(Radius.md)),
    ) {
      if (checking) {
        CircularProgressIndicator(color = c.primary, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
      } else {
        Icon(Lucide.RefreshCw, c.primary, 18.dp)
      }
      Text(s[if (checking) "settings.calendarData.checking" else "settings.calendarData.check"], style = Type.bodyStrong, color = c.primary)
    }
    if (tables.status == CheckStatus.Updated || tables.status == CheckStatus.UpToDate || tables.status == CheckStatus.Failed) {
      Text(
        s["settings.calendarData.status.${tables.status.key}"],
        style = Type.caption,
        color = statusColor,
        modifier = Modifier.padding(top = Spacing.sm).semantics { liveRegion = LiveRegionMode.Polite },
      )
    }
  }
  Spacer(Modifier.height(0.dp))
}

/** "2026-10-26T10:38:09Z" → epoch ms. */
private fun parseIsoUtc(text: String): Long =
  runCatching {
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(text)!!.time
  }.getOrDefault(0L)
