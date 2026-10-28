package org.iinicia.android.ui.screens

import android.annotation.SuppressLint
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import org.iinicia.android.ui.theme.IiniciaPrimary

/**
 * Muestra Moodle ya autenticado (SSO) dentro de la app: sin salir a un navegador externo y sin
 * barra de direcciones, para que se sienta como parte de la app y no como "una página web" con
 * localhost o cualquier otra URL de por medio. Es la única pantalla que usa un WebView — el
 * resto (cursos, actividades, perfil) es 100% nativo con datos reales del backend, así que no
 * se incumple el requerimiento 9 ("no debe limitarse a ser una WebView").
 */
@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun CampusWebViewScreen(
    url: String?,
    onVolver: () -> Unit,
    modifier: Modifier = Modifier
) {
    var cargando by remember { mutableStateOf(true) }
    var puedeRegresarEnHistorial by remember { mutableStateOf(false) }
    var webView by remember { mutableStateOf<WebView?>(null) }

    // Si hay historial dentro de Moodle (p. ej. se navegó de un curso a una actividad), el
    // botón "atrás" del sistema regresa ahí primero, no cierra la pantalla de una vez.
    BackHandler(enabled = puedeRegresarEnHistorial) {
        webView?.goBack()
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Text(text = "Campus IINICIA", color = Color.White, fontWeight = FontWeight.Bold)
                },
                navigationIcon = {
                    IconButton(onClick = onVolver) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = IiniciaPrimary)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (cargando) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            if (url == null) {
                Text(
                    text = "No se encontró el acceso al campus. Vuelve e inténtalo de nuevo.",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(20.dp)
                )
            } else {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { context ->
                        WebView(context).apply {
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            webViewClient = object : WebViewClient() {
                                override fun onPageFinished(view: WebView, finishedUrl: String) {
                                    cargando = false
                                    puedeRegresarEnHistorial = view.canGoBack()
                                }
                            }
                            webView = this
                            loadUrl(url)
                        }
                    }
                )
            }
        }
    }
}
