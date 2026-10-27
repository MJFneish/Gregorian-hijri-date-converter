pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    google()
    mavenCentral()
    // Astronomy Engine's Kotlin build (the crescent forecast) is published on JitPack only; nothing
    // else may resolve from there.
    exclusiveContent {
      forRepository { maven("https://jitpack.io") }
      filter { includeGroup("com.github.cosinekitty") }
    }
  }
}

rootProject.name = "hijriconverter"
include(":app")
