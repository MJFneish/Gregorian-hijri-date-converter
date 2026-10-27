package com.devlance.hijriconverter.ui.share

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.util.Log
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.layer.drawLayer
import androidx.compose.ui.graphics.rememberGraphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.devlance.hijriconverter.ui.theme.appTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.android.awaitFrame
import kotlinx.coroutines.withContext
import java.io.File

/** A card to turn into an image, the caption sent with it (and alone if the image fails), and the
 * image's file name without extension. */
class ShareRequest(val card: @Composable () -> Unit, val message: String, val filename: String)

/** Shares cards as images (v1's useShareImage). `busy` covers the capture only, not the share sheet. */
class ShareController {
  var pending by mutableStateOf<ShareRequest?>(null)
    internal set
  val busy: Boolean get() = pending != null

  fun share(request: ShareRequest) {
    if (pending == null) pending = request
  }
}

val LocalShare = staticCompositionLocalOf { ShareController() }

/**
 * Mounted once at the app root: composes a requested card far off-screen at its full size, records
 * what it draws into a graphics layer, saves it as a JPEG in the cache and opens the share sheet
 * with the caption. Every part of a card draws synchronously (the moon texture is a resource), so
 * two frames are enough before reading the layer back.
 */
@Composable
fun ShareHost(content: @Composable () -> Unit) {
  val controller = remember { ShareController() }
  CompositionLocalProvider(LocalShare provides controller) {
    Box {
      content()
      controller.pending?.let { request -> CaptureAndShare(request) { controller.pending = null } }
    }
  }
}

@Composable
private fun CaptureAndShare(request: ShareRequest, done: () -> Unit) {
  val context = LocalContext.current
  val title = appTheme().strings["home.share"]
  val layer = rememberGraphicsLayer()
  Box(
    Modifier
      .offset(x = (-4000).dp)
      .wrapContentSize(unbounded = true)
      .clearAndSetSemantics {}
      .drawWithContent {
        layer.record { this@drawWithContent.drawContent() }
        drawLayer(layer)
      },
  ) {
    request.card()
  }
  LaunchedEffect(request) {
    var file: File? = null
    try {
      awaitFrame()
      awaitFrame()
      val bitmap = layer.toImageBitmap().asAndroidBitmap()
      file = withContext(Dispatchers.IO) { writeJpeg(context, bitmap, request.filename) }
    } catch (e: Exception) {
      Log.w("HijriConverter", "Making the share image failed", e)
    } finally {
      done()
    }
    try {
      context.startActivity(shareIntent(context, file, request.message, title))
    } catch (e: Exception) {
      Log.w("HijriConverter", "Opening the share sheet failed", e)
    }
  }
}

private fun writeJpeg(context: Context, bitmap: Bitmap, name: String): File {
  val dir = File(context.cacheDir, "shared").apply { mkdirs() }
  dir.listFiles()?.forEach { it.delete() } // only the latest image is kept
  return File(dir, "$name.jpg").also { file -> file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 95, it) } }
}

/** The image with the caption, or the caption alone when the image couldn't be made. */
private fun shareIntent(context: Context, file: File?, message: String, title: String): Intent {
  val send = Intent(Intent.ACTION_SEND).putExtra(Intent.EXTRA_TEXT, message)
  if (file == null) {
    send.type = "text/plain"
  } else {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
    send.type = "image/jpeg"
    send.putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    // ClipData is what lets the system share sheet show the image preview.
    send.clipData = ClipData.newRawUri(null, uri)
  }
  return Intent.createChooser(send, title).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
}
