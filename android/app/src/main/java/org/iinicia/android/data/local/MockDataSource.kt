package org.iinicia.android.data.local

import org.iinicia.android.data.model.ActividadCurso
import org.iinicia.android.data.model.AuthResponse
import org.iinicia.android.data.model.AvisoInstitucional
import org.iinicia.android.data.model.CursoEstudiante
import org.iinicia.android.data.model.DashboardEstudiante
import org.iinicia.android.data.model.EstadoCurso
import org.iinicia.android.data.model.Rol
import org.iinicia.android.data.model.Usuario

/**
 * Fuente de datos simulada (alineada con `frontend/lib/mock-data.ts`)
 * para operar la aplicación mientras el backend NestJS se encuentra en desarrollo.
 */
object MockDataSource {

    val mockUsuarioEstudiante = Usuario(
        id = "mock-estudiante-001",
        nombre = "Rodrigo Hernández",
        correo = "rodrigo.hernandez@iinicia.edu.mx",
        rol = Rol.ESTUDIANTE
    )

    val mockCursos: List<CursoEstudiante> = listOf(
        CursoEstudiante(
            id = "curso-estructuras-datos",
            nombre = "Estructuras de Datos Avanzadas",
            periodo = "3er cuatrimestre",
            progreso = 72,
            estado = EstadoCurso.EN_CURSO,
            docente = "Dr. Alejandro Vega",
            descripcion = "Árboles balanceados, grafos, tablas hash y análisis amortizado de algoritmos.",
            actividades = listOf(
                ActividadCurso(
                    id = "act-ed-1",
                    titulo = "Práctica 1: Árboles AVL y Red-Black",
                    tipo = "Tarea",
                    fechaEntrega = "2026-10-25",
                    completada = true
                ),
                ActividadCurso(
                    id = "act-ed-2",
                    titulo = "Cuestionario: Recorridos en Grafos (BFS/DFS)",
                    tipo = "Cuestionario",
                    fechaEntrega = "2026-10-30",
                    completada = false
                )
            )
        ),
        CursoEstudiante(
            id = "curso-ia-aplicada",
            nombre = "Inteligencia Artificial Aplicada",
            periodo = "3er cuatrimestre",
            progreso = 45,
            estado = EstadoCurso.EN_CURSO,
            docente = "Dra. Sofía Morales",
            descripcion = "Modelos de aprendizaje supervisado, redes neuronales y despliegue ético de soluciones IA.",
            actividades = listOf(
                ActividadCurso(
                    id = "act-ia-1",
                    titulo = "Laboratorio: Clasificación con Redes Neuronales",
                    tipo = "Laboratorio",
                    fechaEntrega = "2026-11-02",
                    completada = false
                )
            )
        ),
        CursoEstudiante(
            id = "curso-bases-datos",
            nombre = "Bases de Datos Relacionales",
            periodo = "3er cuatrimestre",
            progreso = 100,
            estado = EstadoCurso.FINALIZADO,
            docente = "Mtro. Carlos Méndez",
            descripcion = "Modelado entidad-relación, normalización, SQL avanzado y transacciones ACID."
        ),
        CursoEstudiante(
            id = "curso-ingles-tecnico-4",
            nombre = "Inglés Técnico IV",
            periodo = "3er cuatrimestre",
            progreso = 0,
            estado = EstadoCurso.POR_INICIAR,
            docente = "Lic. Laura Gómez",
            descripcion = "Redacción de documentación técnica y presentaciones ejecutivas en inglés."
        )
    )

    val mockAvisos: List<AvisoInstitucional> = listOf(
        AvisoInstitucional(
            id = "aviso-conferencia-ia",
            titulo = "Conferencia magistral: el impacto de la IA en la educación superior",
            fecha = "2026-10-15",
            resumen = "Especialistas debatieron sobre el futuro del aprendizaje adaptativo y la ética en la formación profesional."
        ),
        AvisoInstitucional(
            id = "aviso-periodo-examenes",
            titulo = "Periodo de exámenes del 3er cuatrimestre",
            fecha = "2026-11-10",
            resumen = "Consulta las fechas y modalidades de evaluación en Mi IINICIA."
        )
    )

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
}
