package com.devlance.hijriconverter.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import java.util.concurrent.ConcurrentHashMap

private val parsed = ConcurrentHashMap<Lucide, List<Path>>()

private fun pathsOf(icon: Lucide): List<Path> = parsed.getOrPut(icon) { icon.paths.map { PathParser().parsePathString(it).toPath() } }

/**
 * A lucide icon (v1's icon set) at `size`, stroked like lucide draws it: 2 units on its 24-unit
 * grid, round caps and joins. Decorative — give the surrounding control its label. Not mirrored in
 * Arabic: screens pick the arrow/chevron that points the right way, as v1 did.
 */
@Composable
fun Icon(icon: Lucide, tint: Color, size: Dp = 20.dp, modifier: Modifier = Modifier, strokeWidth: Float = 2f) {
  val paths = pathsOf(icon)
  Canvas(modifier.size(size)) {
    val scale = this.size.minDimension / 24f
    val stroke = Stroke(width = strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round)
    withTransform({ scale(scale, scale, pivot = Offset.Zero) }) {
      for (path in paths) drawPath(path, tint, style = stroke)
    }
  }
}
