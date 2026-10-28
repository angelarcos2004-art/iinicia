package org.iinicia.android.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.iinicia.android.data.local.EncryptedSessionTokenStorage
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
        val repository = IiniciaRepositoryImpl(tokenStorage = EncryptedSessionTokenStorage(applicationContext))
        if (repository.getCurrentSessionUser() == null) return
        // shortcut: fire-and-forget sin reintentos; si falla, se reintentará en el próximo
        // onNewToken o login. Suficiente para esta fase sin backend de cola de reintentos.
        CoroutineScope(Dispatchers.IO).launch {
            repository.registrarTokenPush(token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val titulo = message.notification?.title ?: message.data["titulo"] ?: "IINICIA"
        val cuerpo = message.notification?.body ?: message.data["mensaje"] ?: return
        mostrarNotificacion(titulo, cuerpo)
    }

    private fun mostrarNotificacion(titulo: String, cuerpo: String) {
        crearCanalSiNoExiste()
        val notificacion = NotificationCompat.Builder(this, CANAL_AVISOS_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(titulo)
            .setContentText(cuerpo)
            .setAutoCancel(true)
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
