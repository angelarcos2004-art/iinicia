package org.iinicia.android.ui.screens

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.iinicia.android.data.model.CursoEstudiante
import org.iinicia.android.ui.theme.IiniciaAccent
import org.iinicia.android.ui.theme.IiniciaPrimary
import org.iinicia.android.ui.theme.IiniciaSecondary

/**
 * Pantalla de detalle de curso (requerimientos 9.1: "detalle básico de cada curso").
 * Moodle no expone docente/descripción/actividades en `GET /estudiante/cursos`, así que esos
 * campos no se muestran inventados: solo lo que el backend sí reporta de verdad.
 * "Entrar al Campus" reutiliza el mismo SSO del portal web (auth_userkey): pide una URL de un
 * solo uso y la abre en el navegador del dispositivo, sin pedir contraseña de Moodle.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetalleCursoScreen(
    curso: CursoEstudiante?,
    onEntrarAlCampus: suspend () -> Result<String>,
    onVolver: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var abriendoCampus by remember { mutableStateOf(false) }
    var errorCampus by remember { mutableStateOf<String?>(null) }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Text(text = "Detalle del curso", color = Color.White, fontWeight = FontWeight.Bold)
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
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding).padding(20.dp)) {
            if (curso == null) {
                Text(
                    text = "No se encontró este curso. Vuelve al dashboard e intenta de nuevo.",
                    style = MaterialTheme.typography.bodyMedium
                )
                return@Column
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = curso.nombre,
                        style = MaterialTheme.typography.headlineSmall,
                        color = IiniciaPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = curso.periodo,
                        style = MaterialTheme.typography.bodyMedium,
                        color = IiniciaSecondary
                    )

                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        color = IiniciaAccent.copy(alpha = 0.25f),
                        shape = RoundedCornerShape(50)
                    ) {
                        Text(
                            text = curso.estado.etiqueta,
                            style = MaterialTheme.typography.labelMedium,
                            color = IiniciaPrimary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                        )
                    }

                    if (curso.progreso != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        LinearProgressIndicator(
                            progress = { curso.progreso / 100f },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(50)),
                            color = IiniciaSecondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${curso.progreso}% completado",
                            style = MaterialTheme.typography.labelMedium
                        )
                    } else {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Este curso no tiene seguimiento de progreso activado en Moodle.",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Button(
                    onClick = {
                        errorCampus = null
                        abriendoCampus = true
                        scope.launch {
                            onEntrarAlCampus()
                                .onSuccess { url ->
                                    abriendoCampus = false
                                    try {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                    } catch (e: ActivityNotFoundException) {
                                        errorCampus = "No se encontró un navegador para abrir Moodle."
                                    }
                                }
                                .onFailure { error ->
                                    abriendoCampus = false
                                    errorCampus = error.message ?: "No se pudo abrir el campus. Intenta más tarde."
                                }
                        }
                    },
                    enabled = !abriendoCampus,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.height(48.dp)
                ) {
                    if (abriendoCampus) {
                        CircularProgressIndicator(modifier = Modifier.height(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Entrar al Campus")
                    }
                }
            }

            if (errorCampus != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = errorCampus.orEmpty(),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
