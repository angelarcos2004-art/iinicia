package org.iinicia.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = IiniciaPrimary,             // #0B2A5B Azul marino
    onPrimary = Color.White,
    primaryContainer = IiniciaAcademicBg,
    onPrimaryContainer = IiniciaPrimary,
    secondary = IiniciaSecondary,         // #1E5AA8 Azul secundario
    onSecondary = Color.White,
    secondaryContainer = IiniciaSurfaceNeutral,
    onSecondaryContainer = IiniciaPrimary,
    tertiary = IiniciaAccent,             // #F2A900 Ámbar de acento
    onTertiary = IiniciaPrimary,
    tertiaryContainer = IiniciaAdmissionBg,
    onTertiaryContainer = IiniciaAdmissionInk,
    background = IiniciaSurfaceSubtle,
    onBackground = IiniciaInk,
    surface = IiniciaSurfaceCanvas,
    onSurface = IiniciaInk,
    surfaceVariant = IiniciaSurfaceNeutral,
    onSurfaceVariant = IiniciaInkMuted,
    outline = IiniciaBorderSubtle,
    error = IiniciaError,
    onError = Color.White
)

private val DarkColorScheme = darkColorScheme(
    primary = IiniciaPrimary,             // #0B2A5B Azul marino
    onPrimary = Color.White,
    secondary = IiniciaSecondary,         // #1E5AA8 Azul secundario
    onSecondary = Color.White,
    tertiary = IiniciaAccent,             // #F2A900 Ámbar de acento
    onTertiary = IiniciaPrimary,
    background = Color(0xFF0A192F),
    onBackground = Color.White,
    surface = Color(0xFF112240),
    onSurface = Color.White,
    error = IiniciaError,
    onError = Color.White
)

@Composable
fun IiniciaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
