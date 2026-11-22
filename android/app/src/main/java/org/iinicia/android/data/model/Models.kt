package org.iinicia.android.data.model

import com.google.gson.annotations.SerializedName

/**
 * Roles definidos en CLAUDE.md y validados por el backend (BFF).
 */
enum class Rol(val valor: String, val etiqueta: String) {
    @SerializedName("superadmin")
    SUPERADMIN("superadmin", "Superadministrador"),

    @SerializedName("admin_academico")
    ADMIN_ACADEMICO("admin_academico", "Administrador académico"),

    @SerializedName("coordinador")
    COORDINADOR("coordinador", "Coordinador"),

    @SerializedName("profesor")
    PROFESOR("profesor", "Profesor"),

    @SerializedName("estudiante")
    ESTUDIANTE("estudiante", "Estudiante"),

    @SerializedName("aspirante")
    ASPIRANTE("aspirante", "Aspirante");

    companion object {
        fun fromString(raw: String?): Rol {
            return entries.firstOrNull { it.valor.equals(raw, ignoreCase = true) } ?: ESTUDIANTE
        }
    }
}

data class Usuario(
    val id: String,
    val nombre: String,
    val correo: String,
    val rol: Rol = Rol.ESTUDIANTE
)

/**
 * DTO de inicio de sesión enviado únicamente por HTTPS/HTTP al BFF.
 * La contraseña jamás se persiste en almacenamiento local.
 */
data class LoginRequest(
    val correo: String,
    val password: String
)

/** Cuerpo de `POST /auth/google`: idToken emitido por Google (Credential Manager en Android,
 * Google Identity Services en el portal web), verificado por el backend. */
data class GoogleLoginRequest(
    val idToken: String
)

data class RegistroRequest(
    val nombreCompleto: String,
    val correo: String,
    val password: String,
    val programaInteresId: String,
    val aceptaAvisoPrivacidad: Boolean,
    val deseaInformacionBecas: Boolean
)

/**
 * Respuesta del BFF de IINICIA (/auth/login y /auth/registro).
 * El token corresponde exclusivamente al JWT de sesión de IINICIA (nunca un token de Moodle).
 */
data class AuthResponse(
    val token: String,
    val usuario: Usuario
)

enum class EstadoCurso(val valor: String, val etiqueta: String) {
    @SerializedName("en_curso")
    EN_CURSO("en_curso", "En curso"),

    @SerializedName("por_iniciar")
    POR_INICIAR("por_iniciar", "Por iniciar"),

    @SerializedName("finalizado")
    FINALIZADO("finalizado", "Finalizado"),

    /** Moodle no reporta progreso para este curso (p. ej. sin finalización configurada). */
    @SerializedName("sin_seguimiento")
    SIN_SEGUIMIENTO("sin_seguimiento", "Inscrito");

    companion object {
        /** Misma regla que `estadoCurso()` en frontend/app/mi-iinicia/page.tsx, para mantener
         * la misma lectura del progreso en portal web y app Android. */
        fun desdeProgreso(progreso: Int?): EstadoCurso = when {
            progreso == null -> SIN_SEGUIMIENTO
            progreso >= 100 -> FINALIZADO
            progreso <= 0 -> POR_INICIAR
            else -> EN_CURSO
        }
    }
}

data class ActividadCurso(
    val id: String,
    val titulo: String,
    val tipo: String,
    val fechaEntrega: String,
    val completada: Boolean = false
)

data class CursoEstudiante(
    val id: String,
    val nombre: String,
    val periodo: String,
    /** Null cuando Moodle no reporta porcentaje de avance para este curso. */
    val progreso: Int?,
    val estado: EstadoCurso,
    val docente: String = "Docente IINICIA",
    val descripcion: String = "",
    val actividades: List<ActividadCurso> = emptyList()
)

/**
 * Forma cruda que devuelve el backend en `GET /estudiante/cursos`
 * (ver `backend/src/estudiante/estudiante.controller.ts`, interfaz `CursoInscrito`).
 */
data class CursoInscritoDto(
    val id: Int,
    val nombre: String,
    val shortname: String,
    val progreso: Int?
)

/** Respuesta de `GET /estudiante/moodle-sso`: URL de un solo uso, expira en segundos. */
data class MoodleSsoResponse(
    val url: String
)

/** Cuerpo de `PATCH /estudiante/push-token`. */
data class RegistrarPushTokenRequest(
    val token: String
)

/**
 * Próxima actividad con fecha límite (`GET /estudiante/actividades`), tal como la devuelve el
 * backend desde Moodle (`core_calendar_get_action_events_by_timesort`).
 */
data class ActividadProximaDto(
    val id: Int,
    val titulo: String,
    val curso: String,
    val fecha: String,
    val url: String?
)

data class AvisoInstitucional(
    val id: String,
    val titulo: String,
    val fecha: String,
    val resumen: String
)

data class DashboardEstudiante(
    val usuario: Usuario,
    val cuatrimestre: String,
    val creditosObtenidos: Int,
    val creditosTotales: Int,
    val progresoCurricular: Int,
    val cursos: List<CursoEstudiante>,
    val avisos: List<AvisoInstitucional>,
    val actividades: List<ActividadProximaDto> = emptyList()
)
