package org.iinicia.android

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import org.iinicia.android.data.local.EncryptedSessionTokenStorage
import org.iinicia.android.data.repository.IiniciaRepositoryImpl
import org.iinicia.android.ui.navigation.IiniciaNavGraph
import org.iinicia.android.ui.theme.IiniciaTheme
import org.iinicia.android.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {
    private val solicitarPermisoNotificaciones =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* el usuario decide; sin este permiso (Android 13+) FCM entrega el mensaje pero el sistema no lo muestra. */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        pedirPermisoDeNotificacionesSiHaceFalta()
        setContent {
            IiniciaTheme {
                val mainViewModel: MainViewModel = viewModel(
                    factory = MainViewModel.provideFactory(
                        repository = IiniciaRepositoryImpl(
                            tokenStorage = EncryptedSessionTokenStorage(applicationContext)
                        )
                    )
                )
                IiniciaNavGraph(
                    viewModel = mainViewModel,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }

    private fun pedirPermisoDeNotificacionesSiHaceFalta() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val yaConcedido = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        if (!yaConcedido) {
            solicitarPermisoNotificaciones.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
