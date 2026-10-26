package org.iinicia.android.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable

/**
 * Confirmación antes de cerrar sesión (requerimientos 9.3: "gestión segura de sesión"),
 * para que un toque accidental no saque al usuario sin aviso. Se usa desde Dashboard y Perfil.
 */
@Composable
fun ConfirmarCerrarSesionDialog(
    onConfirmar: () -> Unit,
    onCancelar: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onCancelar,
        title = { Text("Cerrar sesión") },
        text = { Text("¿Seguro que quieres salir de tu sesión en IINICIA Campus Móvil?") },
        confirmButton = {
            TextButton(onClick = onConfirmar) {
                Text("Cerrar sesión")
            }
        },
        dismissButton = {
            TextButton(onClick = onCancelar) {
                Text("Cancelar")
            }
        }
    )
}
