# `android/app/src/main/java/org/iinicia/android/data/local/MockDataSource.kt`

**En una frase:** provee datos de ejemplo (un usuario, cursos, avisos) escritos a mano, para que la app Android se pueda usar y mostrar sin depender de que el backend NestJS esté levantado o tenga datos reales de Moodle.

## Por qué existe

El backend de IINICIA y la integración con Moodle se desarrollan en paralelo a la app Android. Antes de que `GET /estudiante/cursos` existiera o funcionara de forma confiable, el equipo necesitaba poder compilar y probar pantallas completas (dashboard, detalle de curso) con datos que se vean realistas. `MockDataSource` es ese set de datos fijo, calcado a propósito de `frontend/lib/mock-data.ts` (el mismo mock que usa el portal web) para que ambas plataformas muestren "lo mismo" mientras no hay datos reales.

## Recorrido del código

```kotlin
object MockDataSource {

    val mockUsuarioEstudiante = Usuario(
        id = "mock-estudiante-001",
        nombre = "Rodrigo Hernández",
        correo = "rodrigo.hernandez@iinicia.edu.mx",
        rol = Rol.ESTUDIANTE
    )
```

Es un `object` (singleton de Kotlin): no hace falta instanciarlo, solo se usa `MockDataSource.algo`. El id `mock-estudiante-001` es intencionalmente obvio para que, si por error estos datos aparecieran en una build real, sea evidente que algo está mal configurado.

```kotlin
    val mockCursos: List<CursoEstudiante> = listOf(
        CursoEstudiante(
            id = "curso-estructuras-datos",
            nombre = "Estructuras de Datos Avanzadas",
            ...
            actividades = listOf(
                ActividadCurso(
                    id = "act-ed-1",
                    titulo = "Práctica 1: Árboles AVL y Red-Black",
                    tipo = "Tarea",
                    fechaEntrega = "2026-10-25",
                    completada = true
                ),
                ...
```

Cuatro cursos cubren a propósito los cuatro estados posibles de `EstadoCurso` (`EN_CURSO`, `FINALIZADO`, `POR_INICIAR`) con progresos distintos (72%, 45%, 100%, 0%), para que al ver el Dashboard con mocks se puedan revisar visualmente todos los casos de la UI (barra de progreso llena, vacía, a la mitad) sin necesitar un backend real con datos variados.

```kotlin
    fun buildMockAuthResponse(
        correo: String,
        nombre: String = mockUsuarioEstudiante.nombre
    ): AuthResponse {
        val usuario = Usuario(
            id = mockUsuarioEstudiante.id,
            nombre = nombre,
            correo = correo,
            rol = Rol.ESTUDIANTE
        )
        return AuthResponse(
            token = "mock-jwt-iinicia-bff",
            usuario = usuario
        )
    }
```

Esta función simula la respuesta que el backend real daría en `POST /auth/login/verificar`. Usa el correo que el usuario realmente escribió en el formulario (para que la pantalla de bienvenida se vea coherente con lo que tecleó), pero todo lo demás es inventado. El token `"mock-jwt-iinicia-bff"` es obviamente falso — nunca podría pasar una verificación JWT real contra el backend.

```kotlin
    fun buildMockDashboard(usuario: Usuario = mockUsuarioEstudiante): DashboardEstudiante {
        return DashboardEstudiante(
            usuario = usuario,
            cuatrimestre = "3er cuatrimestre",
            creditosObtenidos = 148,
            creditosTotales = 300,
            progresoCurricular = 49,
            cursos = mockCursos,
            avisos = mockAvisos
        )
    }
```

Ensambla el dashboard completo mock, por si algún lugar necesita el objeto completo en vez de piezas sueltas (actualmente no se usa en producción: ver abajo).

## Conexión con el resto del sistema

- `IiniciaRepositoryImpl.verificar2FA` usa `MockDataSource.buildMockAuthResponse(...)` **solo** cuando `isConnectToRemoteEnabled = false` (modo de pruebas unitarias locales, no el modo normal de la app).
- `IiniciaRepositoryImpl.getDetalleCurso` usa `MockDataSource.mockCursos` por el mismo motivo: respaldo cuando no hay conexión real habilitada.
- En la app tal como se ejecuta normalmente (`isConnectToRemoteEnabled = true` por defecto en `IiniciaRepositoryImpl`), **ningún dato de este archivo llega a la pantalla**: todo viene de `IiniciaApiService` contra el backend real.

## Cosas que no son obvias a primera vista

- Pese al nombre y a estar en `data/local`, esto no es un "modo offline" para el usuario final: es exclusivamente para cuando `isConnectToRemoteEnabled = false`, que hoy solo se usa en pruebas unitarias. Un usuario real de la app siempre pasa por el backend.
- Los datos están deliberadamente alineados con el mock del portal web (`frontend/lib/mock-data.ts`) para que QA o un profesor viendo ambas plataformas en modo demo vean información consistente entre la web y la app.
- Si `GET /estudiante/cursos` llega a fallar en producción, la app **no** cae de vuelta a estos mocks: `IiniciaRepositoryImpl.getDashboardEstudiante` deja `errorCursos` explícito en vez de mostrar datos falsos como si fueran reales (ver `DashboardScreen`, que muestra el error con botón "Reintentar").
