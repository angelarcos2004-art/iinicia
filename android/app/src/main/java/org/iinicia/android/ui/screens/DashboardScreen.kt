package org.iinicia.android.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.iinicia.android.data.model.CursoEstudiante
import org.iinicia.android.ui.components.ConfirmarCerrarSesionDialog
import org.iinicia.android.ui.theme.IiniciaAccent
import org.iinicia.android.ui.theme.IiniciaPrimary
import org.iinicia.android.ui.theme.IiniciaSecondary
import org.iinicia.android.ui.theme.IiniciaTheme
import org.iinicia.android.ui.viewmodel.MainUiState

/**
 * Pantalla 2 - Dashboard del estudiante.
 * Los cursos vienen de `GET /estudiante/cursos` (ver [MainViewModel.iniciarSesion]); la tarjeta
 * "Lista de cursos vacía" solo se muestra cuando el backend no devuelve cursos reales.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    uiState: MainUiState,
    onCursoClick: (String) -> Unit = {},
    onPerfilClick: () -> Unit = {},
    onReintentarCursos: () -> Unit = {},
    onAbrirActividad: suspend (String) -> Result<String> = { Result.failure(UnsupportedOperationException()) },
    onUrlObtenida: (String) -> Unit = {},
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cursos: List<CursoEstudiante> = uiState.cursos
    var mostrarConfirmacionLogout by remember { mutableStateOf(false) }
    var abriendoActividadId by remember { mutableStateOf<Int?>(null) }
    var errorActividad by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    if (mostrarConfirmacionLogout) {
        ConfirmarCerrarSesionDialog(
            onConfirmar = {
                mostrarConfirmacionLogout = false
                onLogout()
            },
            onCancelar = { mostrarConfirmacionLogout = false }
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Mi IINICIA",
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    IconButton(onClick = onPerfilClick) {
                        Icon(
                            imageVector = Icons.Default.AccountCircle,
                            contentDescription = "Mi perfil",
                            tint = Color.White
                        )
                    }
                    OutlinedButton(
                        onClick = { mostrarConfirmacionLogout = true },
                        modifier = Modifier.padding(end = 12.dp)
                    ) {
                        Text(
                            text = "Cerrar sesión",
                            color = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = IiniciaPrimary
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp)
        ) {
            // Encabezado de bienvenida
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "Bienvenido",
                            style = MaterialTheme.typography.headlineMedium,
                            color = IiniciaPrimary
                        )
                        Surface(
                            color = IiniciaAccent.copy(alpha = 0.25f),
                            shape = RoundedCornerShape(50)
                        ) {
                            Text(
                                text = uiState.usuarioAutenticado?.rol?.etiqueta ?: "Estudiante",
                                style = MaterialTheme.typography.labelLarge,
                                color = IiniciaPrimary,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = uiState.usuarioAutenticado?.correo ?: "estudiante@iinicia.edu.mx",
                        style = MaterialTheme.typography.bodyMedium,
                        color = IiniciaSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Sección de cursos
            Text(
                text = "Mis cursos (${cursos.size})",
                style = MaterialTheme.typography.headlineSmall,
                color = IiniciaPrimary
            )

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (uiState.cargandoCursos) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Text(
                                text = "Consultando tus cursos en Moodle…",
                                style = MaterialTheme.typography.bodyMedium,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth().padding(28.dp)
                            )
                        }
                    }
                } else if (uiState.errorCursos != null) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(28.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = uiState.errorCursos,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.error,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                OutlinedButton(onClick = onReintentarCursos) {
                                    Text("Reintentar")
                                }
                            }
                        }
                    }
                } else if (cursos.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(28.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "Lista de cursos vacía",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = IiniciaPrimary,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Aún no tienes cursos activos sincronizados desde el BFF.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                } else {
                    items(cursos, key = { it.id }) { curso ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onCursoClick(curso.id) },
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = curso.nombre,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = IiniciaPrimary
                                    )
                                    Surface(
                                        color = IiniciaAccent.copy(alpha = 0.25f),
                                        shape = RoundedCornerShape(50)
                                    ) {
                                        Text(
                                            text = curso.estado.etiqueta,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = IiniciaPrimary,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = curso.periodo,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                if (curso.progreso != null) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    LinearProgressIndicator(
                                        progress = { curso.progreso / 100f },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(6.dp)
                                            .clip(RoundedCornerShape(50)),
                                        color = IiniciaSecondary
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "${curso.progreso}% completado",
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Próximas actividades",
                        style = MaterialTheme.typography.headlineSmall,
                        color = IiniciaPrimary
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }

                if (uiState.actividades.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Text(
                                text = "No tienes actividades con fecha límite próxima.",
                                style = MaterialTheme.typography.bodyMedium,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth().padding(20.dp)
                            )
                        }
                    }
                } else {
                    items(uiState.actividades, key = { it.id }) { actividad ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = actividad.titulo,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = IiniciaPrimary
                                )
                                if (actividad.curso.isNotBlank()) {
                                    Text(
                                        text = actividad.curso,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                                Text(
                                    text = formatFechaActividad(actividad.fecha),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = IiniciaSecondary
                                )
                                val actividadUrl = actividad.url
                                if (actividadUrl != null) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    OutlinedButton(
                                        onClick = {
                                            errorActividad = null
                                            abriendoActividadId = actividad.id
                                            scope.launch {
                                                onAbrirActividad(actividadUrl)
                                                    .onSuccess { ssoUrl ->
                                                        abriendoActividadId = null
                                                        onUrlObtenida(ssoUrl)
                                                    }
                                                    .onFailure { error ->
                                                        abriendoActividadId = null
                                                        errorActividad = error.message
                                                            ?: "No se pudo abrir la actividad. Intenta más tarde."
                                                    }
                                            }
                                        },
                                        enabled = abriendoActividadId != actividad.id
                                    ) {
                                        Text(if (abriendoActividadId == actividad.id) "Abriendo…" else "Abrir en Moodle")
                                    }
                                }
                            }
                        }
                    }
                }

                if (errorActividad != null) {
                    item {
                        Text(
                            text = errorActividad.orEmpty(),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        }
    }
}

/**
 * Convierte el ISO-8601 que devuelve el backend ("2026-11-01T00:00:00.000Z") a "01/11/2026" sin
 * depender de java.time (minSdk 24, sin core library desugaring en este módulo).
 */
private fun formatFechaActividad(fechaIso: String): String {
    if (fechaIso.length < 10) return fechaIso
    val (anio, mes, dia) = fechaIso.substring(0, 10).split("-").takeIf { it.size == 3 }
        ?: return fechaIso
    return "$dia/$mes/$anio"
}

@Preview(showBackground = true)
@Composable
fun DashboardScreenPreview() {
    IiniciaTheme {
        DashboardScreen(
            uiState = MainUiState(cursos = emptyList()),
            onLogout = {}
        )
    }
}
