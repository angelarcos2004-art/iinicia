package org.iinicia.android

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import org.iinicia.android.data.local.EncryptedSessionTokenStorage
import org.iinicia.android.data.remote.ServerConfig
import org.iinicia.android.data.repository.IiniciaRepositoryImpl
import org.iinicia.android.ui.navigation.IiniciaNavGraph
import org.iinicia.android.ui.theme.IiniciaTheme
import org.iinicia.android.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {
    private val solicitarPermisoNotificaciones =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* el usuario decide; sin este permiso (Android 13+) FCM entrega el mensaje pero el sistema no lo muestra. */ }

    /** Id de curso pendiente de abrir por deep link (ver IiniciaFirebaseMessagingService). Se
     * lee tanto en frío (onCreate) como con la app ya abierta (onNewIntent). */
    private var deepLinkCursoId by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        pedirPermisoDeNotificacionesSiHaceFalta()
        deepLinkCursoId = intent?.getStringExtra(EXTRA_CURSO_ID)
        setContent {
            IiniciaTheme {
                val mainViewModel: MainViewModel = viewModel(
                    factory = MainViewModel.provideFactory(
                        repository = IiniciaRepositoryImpl(
                            baseUrl = ServerConfig.getBaseUrl(applicationContext),
                            tokenStorage = EncryptedSessionTokenStorage(applicationContext)
                        )
                    )
                )
                IiniciaNavGraph(
                    viewModel = mainViewModel,
                    deepLinkCursoId = deepLinkCursoId,
                    onDeepLinkConsumido = { deepLinkCursoId = null },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }

    /** launchMode="singleTop" (ver AndroidManifest) hace que esto se llame en vez de crear una
     * segunda instancia cuando se toca una notificación mientras la app ya está abierta. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        deepLinkCursoId = intent.getStringExtra(EXTRA_CURSO_ID)
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

    companion object {
        const val EXTRA_CURSO_ID = "cursoId"
    }
}
