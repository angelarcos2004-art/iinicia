package org.iinicia.android.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.iinicia.android.MainActivity
import org.iinicia.android.data.local.EncryptedSessionTokenStorage
import org.iinicia.android.data.remote.ServerConfig
import org.iinicia.android.data.repository.IiniciaRepositoryImpl

private const val CANAL_AVISOS_ID = "iinicia_avisos"

/**
 * Recibe notificaciones push (Requerimiento 9.1: "notificaciones push para avisos académicos y
 * eventos relevantes"). Necesita un proyecto Firebase real (ver android/app/google-services.json
 * y backend/.env FIREBASE_SERVICE_ACCOUNT) para recibir algo de verdad; sin eso nunca se invoca.
 */
class IiniciaFirebaseMessagingService : FirebaseMessagingService() {

    /**
     * FCM puede invocar esto antes de que exista ninguna sesión de usuario (p. ej. recién
     * instalada la app). Se registra en el backend solo si hay una sesión guardada; si no,
     * MainViewModel.registrarTokenPushActual() lo hace justo después de iniciar sesión.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val repository = IiniciaRepositoryImpl(
            baseUrl = ServerConfig.getBaseUrl(applicationContext),
            tokenStorage = EncryptedSessionTokenStorage(applicationContext)
        )
        if (repository.getCurrentSessionUser() == null) return
        // shortcut: fire-and-forget sin reintentos; si falla, se reintentará en el próximo
        // onNewToken o login. Suficiente para esta fase sin backend de cola de reintentos.
        CoroutineScope(Dispatchers.IO).launch {
            repository.registrarTokenPush(token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val storage = EncryptedSessionTokenStorage(applicationContext)
        if (!storage.notificacionesHabilitadas()) return

        val titulo = message.notification?.title ?: message.data["titulo"] ?: "IINICIA"
        val cuerpo = message.notification?.body ?: message.data["mensaje"] ?: return
        mostrarNotificacion(titulo, cuerpo, message.data["cursoId"])
    }

    /**
     * `cursoId` (si el backend lo envió, ver UsuariosController.notificar) es el deep link:
     * tocar la notificación abre directo el detalle de ese curso en vez de solo el dashboard
     * (requerimientos 9.1: "deep links hacia contenidos o actividades específicas").
     */
    private fun mostrarNotificacion(titulo: String, cuerpo: String, cursoId: String?) {
        crearCanalSiNoExiste()
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (cursoId != null) putExtra(MainActivity.EXTRA_CURSO_ID, cursoId)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            cursoId?.hashCode() ?: 0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notificacion = NotificationCompat.Builder(this, CANAL_AVISOS_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(titulo)
            .setContentText(cuerpo)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        // El permiso POST_NOTIFICATIONS (Android 13+) se pide desde MainActivity; si el usuario
        // lo negó, notify() simplemente no muestra nada (no lanza).
        NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notificacion)
    }

    private fun crearCanalSiNoExiste() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CANAL_AVISOS_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(CANAL_AVISOS_ID, "Avisos académicos", NotificationManager.IMPORTANCE_DEFAULT)
        )
    }
}
