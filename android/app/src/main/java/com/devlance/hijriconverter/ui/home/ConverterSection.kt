package com.devlance.hijriconverter.ui.home

import android.content.ClipData
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.ClipEntry
import androidx.compose.ui.platform.LocalClipboard
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import com.devlance.hijriconverter.core.dayInfo
import com.devlance.hijriconverter.core.formatGregorian
import com.devlance.hijriconverter.core.formatHijri
import com.devlance.hijriconverter.core.gregorianToJdn
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.hijriOfJdn
import com.devlance.hijriconverter.core.hijri.jdnOfHijri
import com.devlance.hijriconverter.core.hijri.weekdayName
import com.devlance.hijriconverter.core.isoDate
import com.devlance.hijriconverter.core.jdnToGregorian
import com.devlance.hijriconverter.core.Lang
import com.devlance.hijriconverter.core.moonPhaseOnDay
import com.devlance.hijriconverter.core.todayJdn
import com.devlance.hijriconverter.ui.LocalNavigator
import com.devlance.hijriconverter.ui.Route
import com.devlance.hijriconverter.ui.components.Card
import com.devlance.hijriconverter.ui.components.Icon
import com.devlance.hijriconverter.ui.components.Lucide
import com.devlance.hijriconverter.ui.components.OccasionBadge
import com.devlance.hijriconverter.ui.components.SectionLabel
import com.devlance.hijriconverter.ui.components.SegmentOption
import com.devlance.hijriconverter.ui.components.SegmentedControl
import com.devlance.hijriconverter.ui.components.SourceBadge
import com.devlance.hijriconverter.ui.components.negativeMargin
import com.devlance.hijriconverter.ui.components.pressDim
import com.devlance.hijriconverter.ui.components.pressable
import com.devlance.hijriconverter.ui.components.showToast
import com.devlance.hijriconverter.ui.picker.CalendarKind
import com.devlance.hijriconverter.ui.picker.DateWheels
import com.devlance.hijriconverter.ui.picker.Ymd
import com.devlance.hijriconverter.ui.share.LocalShare
import com.devlance.hijriconverter.ui.share.ShareRequest
import com.devlance.hijriconverter.ui.theme.Radius
import com.devlance.hijriconverter.ui.theme.Spacing
import com.devlance.hijriconverter.ui.theme.Type
import com.devlance.hijriconverter.ui.theme.appTheme
import com.devlance.hijriconverter.ui.useConversionOptions
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class Direction { ToHijri, ToGregorian }

/** `run` is bumped on every Convert press so the result fades in even when the date didn't change. */
private data class Conversion(val jdn: Int, val direction: Direction, val run: Int)

/** How long the result card shows its loading state. The lookup itself takes well under a
 * millisecond; this keeps the feedback readable instead of a one-frame flicker, and lets the scroll
 * to the result finish first. */
private const val MIN_CONVERTING_MS = 550L

/**
 * The converter. The wheels edit a *draft* (a JDN — one day on the shared timeline — plus the
 * direction); nothing is converted while they turn (user request: convert on demand, not on every
 * change). "Convert" scrolls Home to the result card, shows a loading state there, then applies the
 * draft. The result card always shows the last *applied* conversion and says so when the wheels
 * have moved since, so it never silently disagrees with them.
 *
 * Switching direction keeps the draft's day; changing method/adjustment in Settings re-labels the
 * applied result instantly (same day, new authority). Emits its parts straight into Home's column,
 * so the arrow bubble can overlap the cards above and below it.
 */
@Composable
fun ConverterSection(scrollTo: (LayoutCoordinates) -> Unit) {
  val theme = appTheme()
  val c = theme.colors
  val s = theme.strings
  val lang = theme.lang
  val opts = useConversionOptions()
  val navigator = LocalNavigator.current
  val shareController = LocalShare.current
  val clipboard = LocalClipboard.current
  val scope = rememberCoroutineScope()

  var direction by remember { mutableStateOf(Direction.ToHijri) }
  var draftJdn by remember { mutableIntStateOf(todayJdn()) }
  var applied by remember { mutableStateOf(Conversion(todayJdn(), Direction.ToHijri, 0)) }
  var converting by remember { mutableStateOf(false) }
  var resultCoords by remember { mutableStateOf<LayoutCoordinates?>(null) }

  // Draft (wheels)
  val inputIsHijri = direction == Direction.ToGregorian
  val inputValue = if (inputIsHijri) {
    hijriOfJdn(draftJdn, opts).let { Ymd(it.year, it.month, it.day) }
  } else {
    jdnToGregorian(draftJdn).let { Ymd(it.year, it.month, it.day) }
  }
  val onWheelsChange = { v: Ymd ->
    draftJdn = if (inputIsHijri) jdnOfHijri(HijriDate(v.year, v.month, v.day), opts) else gregorianToJdn(v.year, v.month, v.day)
  }
  val draftIsToday = draftJdn == todayJdn()
  val isStale = draftJdn != applied.jdn || direction != applied.direction

  fun convert() {
    if (converting) return
    converting = true
    resultCoords?.let(scrollTo)
    val next = Conversion(draftJdn, direction, applied.run + 1)
    scope.launch {
      delay(MIN_CONVERTING_MS)
      applied = next
      converting = false
    }
  }

  // Applied result — recomputed only when a conversion is applied (or the method changes).
  val info = remember(applied.jdn, opts) { dayInfo(applied.jdn, opts) }
  val outputIsGregorian = applied.direction == Direction.ToGregorian
  val weekday = weekdayName(info.weekday, lang)
  val hijriText = formatHijri(info.hijri, lang)
  val gregorianText = formatGregorian(info.gregorian, lang)
  val resultText = if (outputIsGregorian) gregorianText else hijriText
  val inputText = if (outputIsGregorian) hijriText else gregorianText
  val sentence = "$weekday${if (lang == Lang.AR) "، " else ", "}$inputText = $resultText"
  val resultLabel = if (outputIsGregorian) s["home.resultGregorian"] else s["home.resultHijri"]
  val detail = "$weekday · $inputText"
  // The real Moon that evening — depends on the day only, not on the method/adjustment.
  val moon = remember(applied.jdn) { moonPhaseOnDay(applied.jdn) }

  fun copy() {
    scope.launch { clipboard.setClipEntry(ClipEntry(ClipData.newPlainText("date", sentence))) }
    showToast(s["home.copied"])
  }

  /** Shares the result as an image of the card (ShareCard, via ShareHost) with the sentence as its
   * caption; text only if the image can't be made. */
  fun share() {
    val method = opts.method
    shareController.share(
      ShareRequest(
        card = { ShareCard(info, resultLabel, resultText, detail, moon, method) },
        message = "$sentence\n${s.t("home.shareFooter", "method" to s["methods.${method.id}.name"])}",
        filename = "HijriConverter-${isoDate(info.gregorian)}",
      ),
    )
  }

  SectionLabel(s["home.convert"])
  Card {
    SegmentedControl(
      listOf(
        SegmentOption(Direction.ToHijri, s["home.toHijri"], Lucide.Moon),
        SegmentOption(Direction.ToGregorian, s["home.toGregorian"], Lucide.Sun),
      ),
      direction,
      { direction = it },
      Modifier.semantics { contentDescription = s["home.direction"] },
    )
    Text(
      if (inputIsHijri) s["home.pickHijri"] else s["home.pickGregorian"],
      style = Type.caption,
      color = c.textMuted,
      modifier = Modifier.padding(top = Spacing.md, bottom = Spacing.sm),
    )
    DateWheels(if (inputIsHijri) CalendarKind.Hijri else CalendarKind.Gregorian, inputValue, onWheelsChange, opts.method, c.card)
    Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md), modifier = Modifier.padding(top = Spacing.md)) {
      ActionButton(
        Lucide.CalendarCheck2,
        s["home.goToToday"],
        Color.Transparent,
        c.primary,
        Modifier.weight(1f),
        enabled = !draftIsToday,
        border = c.border,
      ) { draftJdn = todayJdn() }
      ActionButton(
        Lucide.ArrowLeftRight,
        if (converting) s["home.converting"] else s["home.convertButton"],
        c.primary,
        c.onPrimary,
        Modifier.weight(1.6f),
        enabled = !converting,
        busy = converting,
        onClick = ::convert,
      )
    }
  }

  // The arrow overlaps the cards above and below; drawn over both.
  Box(
    Modifier
      .fillMaxWidth()
      .negativeMargin(vertical = Spacing.md)
      .zIndex(2f)
      .clearAndSetSemantics {},
    contentAlignment = Alignment.Center,
  ) {
    Box(
      Modifier
        .size(36.dp)
        .shadow(6.dp, CircleShape)
        .background(c.primary, CircleShape),
      contentAlignment = Alignment.Center,
    ) { Icon(Lucide.ArrowDown, c.onPrimary, 18.dp) }
  }

  Card(Modifier.onGloballyPositioned { resultCoords = it }) {
    if (converting) {
      ResultSkeleton()
    } else {
      key(applied.run) {
        val alpha = remember { Animatable(if (applied.run > 0) 0f else 1f) }
        LaunchedEffect(Unit) { alpha.animateTo(1f, tween(280)) }
        Column(Modifier.graphicsLayer { this.alpha = alpha.value }) {
          if (isStale) {
            Row(
              horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
              verticalAlignment = Alignment.CenterVertically,
              modifier = Modifier
                .padding(bottom = Spacing.md)
                .fillMaxWidth()
                .clip(RoundedCornerShape(Radius.md))
                .background(c.accentSoft)
                .padding(horizontal = Spacing.md, vertical = Spacing.sm),
            ) {
              Icon(Lucide.Info, c.accent, 16.dp)
              Text(s["home.staleResult"], style = Type.caption, color = c.accent, modifier = Modifier.weight(1f))
            }
          }
          ResultPanel(resultLabel, resultText, detail, moon, interactive = true)
          // Same row as the badge, so the result card doesn't grow (Home stays short).
          Row(
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(top = Spacing.md).fillMaxWidth(),
          ) {
            SourceBadge(info.source)
            Box(Modifier.weight(1f))
            Row(
              horizontalArrangement = Arrangement.spacedBy(4.dp),
              verticalAlignment = Alignment.CenterVertically,
              modifier = Modifier
                .pressDim({ navigator.push(Route.CompareOffices(applied.jdn)) })
                .heightIn(min = 40.dp)
                .padding(horizontal = Spacing.xs),
            ) {
              Icon(Lucide.Scale, c.primary, 16.dp)
              Text(s["home.compareOffices"], style = Type.caption, color = c.primary)
              Icon(if (theme.isRtl) Lucide.ChevronLeft else Lucide.ChevronRight, c.primary, 16.dp)
            }
          }
          if (info.occasions.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm), modifier = Modifier.padding(top = Spacing.md)) {
              for (o in info.occasions) OccasionBadge(o)
            }
          }
          Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md), modifier = Modifier.padding(top = Spacing.lg)) {
            ActionButton(Lucide.Copy, s["home.copy"], c.primarySoft, c.primary, Modifier.weight(1f), onClick = ::copy)
            ActionButton(
              Lucide.Share2,
              s["home.share"],
              c.primary,
              c.onPrimary,
              Modifier.weight(1f),
              enabled = !shareController.busy,
              busy = shareController.busy,
              onClick = ::share,
            )
          }
        }
      }
    }
  }
}

/** A 48 dp button with an icon (or a spinner while `busy`) and a label. A busy button doesn't dim. */
@Composable
private fun ActionButton(
  icon: Lucide,
  label: String,
  background: Color,
  color: Color,
  modifier: Modifier = Modifier,
  enabled: Boolean = true,
  busy: Boolean = false,
  border: Color? = null,
  onClick: () -> Unit,
) {
  val shape = RoundedCornerShape(Radius.md)
  Row(
    horizontalArrangement = Arrangement.spacedBy(Spacing.sm, Alignment.CenterHorizontally),
    verticalAlignment = Alignment.CenterVertically,
    modifier = modifier
      .pressable(onClick = onClick, enabled = enabled, dimWhenDisabled = !busy, role = Role.Button)
      .clip(shape)
      .background(background)
      .then(if (border != null) Modifier.border(1.dp, border, shape) else Modifier)
      .heightIn(min = 48.dp)
      .padding(horizontal = Spacing.sm),
  ) {
    if (busy) {
      CircularProgressIndicator(color = color, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
    } else {
      Icon(icon, color, 18.dp)
    }
    Text(label, style = Type.bodyStrong, color = color, maxLines = 1)
  }
}
