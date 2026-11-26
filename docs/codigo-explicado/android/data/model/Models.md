# `android/app/src/main/java/org/iinicia/android/data/model/Models.kt`

**En una frase:** define todas las estructuras de datos (usuario, curso, roles, peticiones y respuestas de red) que el resto de la app Android usa para hablar entre capas y con el backend.

## Por qué existe

Kotlin necesita tipos concretos para que Retrofit/Gson puedan convertir JSON en objetos y viceversa, y para que el `ViewModel`/UI trabajen con datos fuertemente tipados en vez de `Map<String, Any?>` sueltos. Juntar todos los modelos en un solo archivo (en vez de un archivo por clase) mantiene a la vista, en un lugar, la "forma" completa de los datos que fluyen en la app: quién manda qué al backend y qué recibe de vuelta.

## Recorrido del código

```kotlin
enum class Rol(val valor: String, val etiqueta: String) {
    @SerializedName("superadmin")
    SUPERADMIN("superadmin", "Superadministrador"),
    @SerializedName("admin_academico")
    ADMIN_ACADEMICO("admin_academico", "Administrador académico"),
    ...
    companion object {
        fun fromString(raw: String?): Rol {
            return entries.firstOrNull { it.valor.equals(raw, ignoreCase = true) } ?: ESTUDIANTE
        }
    }
}
```

Los seis roles son exactamente los definidos en `CLAUDE.md` (superadmin, admin_academico, coordinador, profesor, estudiante, aspirante). `@SerializedName` le dice a Gson cómo mapear el string que manda el backend JSON (p. ej. `"admin_academico"`) al valor del enum correspondiente, incluso si en el futuro se decide usar nombres distintos en Kotlin vs. JSON. `fromString` con un `?: ESTUDIANTE` por defecto es una salvaguarda: si el backend llegara a mandar un rol desconocido o nulo, la app no crashea, simplemente trata al usuario como estudiante (el rol más restringido de los que tienen acceso a la app móvil) en vez de fallar la deserialización completa.

```kotlin
/**
 * DTO de inicio de sesión enviado únicamente por HTTPS/HTTP al BFF.
 * La contraseña jamás se persiste en almacenamiento local.
 */
data class LoginRequest(
    val correo: String,
    val password: String
)
```

El comentario es la aclaración de seguridad: este objeto viaja por la red (hacia el backend) pero nunca debe terminar guardado en disco. Quien SÍ persiste algo del login es `EncryptedSessionTokenStorage`, y ese código deliberadamente no tiene ningún campo para `password`.

```kotlin
/** Respuesta de `POST /auth/login`: nunca entrega el token todavía, solo confirma que el
 * backend mandó un código de verificación en dos pasos al correo. */
data class Requiere2FAResponse(
    val correo: String,
    val mensaje: String
)

/** Cuerpo de `POST /auth/login/verificar`: el código de 6 dígitos que llegó al correo. */
data class Verificar2FARequest(
    val correo: String,
    val codigo: String
)
```

Estos dos tipos existen específicamente por el flujo de dos factores: el primero es lo que el backend responde tras el primer paso (correo+password correctos, pero sin sesión aún); el segundo es lo que la app manda en el segundo paso.

```kotlin
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
```

`desdeProgreso` convierte un número (el porcentaje de avance que Moodle reporta) en una categoría visual. El caso `progreso == null -> SIN_SEGUIMIENTO` existe porque Moodle no siempre tiene "finalización de curso" configurada — en ese caso no hay ningún porcentaje que mostrar, y es distinto de "0% avanzado" (que sí implica que el curso tiene seguimiento pero el alumno no ha empezado). Esta misma regla está duplicada a propósito en el portal web (`frontend/app/mi-iinicia/page.tsx`) para que ambas plataformas clasifiquen un curso exactamente igual.

```kotlin
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
```

Hay **dos** tipos de curso distintos a propósito: `CursoInscritoDto` es exactamente lo que el backend manda por JSON (un espejo fiel del endpoint real, con solo 4 campos), mientras que `CursoEstudiante` es el modelo de dominio que usa la UI, con más campos (`docente`, `descripcion`, `actividades`) que Moodle no siempre expone en ese endpoint. Separar el DTO crudo del modelo de UI evita que un cambio en la forma del JSON del backend obligue a tocar todas las pantallas que usan `CursoEstudiante` — solo se ajustaría la función de conversión (`CursoInscritoDto.aCursoEstudiante()`, en `IiniciaRepository.kt`).

```kotlin
/** Próxima actividad con fecha límite (`GET /estudiante/actividades`), tal como la devuelve el
 * backend desde Moodle (`core_calendar_get_action_events_by_timesort`). */
data class ActividadProximaDto(
    val id: Int,
    val titulo: String,
    val curso: String,
    val fecha: String,
    val url: String?
)
```

El comentario deja la traza exacta hacia la función del API de Moodle que originó este dato en el backend, útil para cualquiera que necesite depurar por qué una actividad no aparece o aparece con datos raros.

## Conexión con el resto del sistema

- `IiniciaApiService` usa estos tipos como parámetros `@Body` y como tipos de retorno para cada endpoint.
- `IiniciaRepositoryImpl` convierte entre los DTOs crudos (`CursoInscritoDto`) y los modelos de dominio (`CursoEstudiante`) que consume la UI.
- `EncryptedSessionTokenStorage` serializa/deserializa `Usuario` con Gson para guardarlo cifrado en disco.
- Prácticamente todas las pantallas (`LoginScreen`, `DashboardScreen`, `DetalleCursoScreen`, `PerfilScreen`) reciben alguno de estos tipos como parte de `MainUiState`.

## Cosas que no son obvias a primera vista

- No existe ningún modelo relacionado con tokens o credenciales de Moodle en este archivo: es consistente con la regla de que Android nunca procesa eso.
- `Usuario.rol` tiene un valor por defecto (`Rol.ESTUDIANTE`), igual que `Rol.fromString`: ambos son la misma filosofía de "ante la duda, el rol menos privilegiado", aunque la validación de permisos real de todas formas ocurre en el backend, nunca solo en Android.
- `ActividadCurso` (del mock/dominio) y `ActividadProximaDto` (crudo del backend) son conceptos distintos que podrían confundirse por el nombre: el primero vive dentro de `CursoEstudiante.actividades` (datos de ejemplo/mock), el segundo es lo que realmente llena `MainUiState.actividades` en producción.
