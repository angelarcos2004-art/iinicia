import type {
  AvisoInstitucional,
  CursoEstudiante,
  DashboardEstudiante,
  GrupoProfesor,
  Programa,
  ResumenAdmin,
  ResumenCoordinacion,
  SolicitudAspirante,
} from "./types";

/**
 * Catálogo de oferta académica de respaldo: solo se usa si el backend (GET /programas) no
 * responde, para que el home y el registro de aspirantes sigan funcionando sin conexión.
 */
export const MOCK_PROGRAMAS: Programa[] = [
  {
    id: "lic-software-ia",
    tipo: "licenciatura",
    nombre: "Ingeniería de Software e Inteligencia Artificial",
    descripcion:
      "Forma parte de la próxima generación de ingenieros especializados en IA aplicada.",
    duracion: "12 cuatrimestres",
    modalidad: "en_linea",
    moodleCourseShortname: null,
  },
  {
    id: "lic-admon-negocios",
    tipo: "licenciatura",
    nombre: "Administración de Negocios Digitales",
    descripcion:
      "Desarrolla modelos de negocio y estrategias digitales para empresas en crecimiento.",
    duracion: "12 cuatrimestres",
    modalidad: "en_linea",
    moodleCourseShortname: null,
  },
  {
    id: "dip-cloud-kubernetes",
    tipo: "diplomado",
    nombre: "Cloud Architecture & Kubernetes",
    descripcion:
      "Diseña e implementa arquitecturas en la nube listas para producción.",
    duracion: "4 meses",
    modalidad: "en_linea",
    moodleCourseShortname: null,
  },
  {
    id: "dip-gestion-proyectos",
    tipo: "diplomado",
    nombre: "Gestión de Proyectos Digitales",
    descripcion:
      "Planifica y da seguimiento a proyectos tecnológicos con metodologías ágiles.",
    duracion: "3 meses",
    modalidad: "hibrida",
    moodleCourseShortname: null,
  },
  {
    id: "cert-ciberseguridad-soc",
    tipo: "certificacion",
    nombre: "Ciberseguridad Defensiva y SOC",
    descripcion:
      "Capacítate en detección y respuesta a incidentes de seguridad informática.",
    duracion: "6 semanas",
    modalidad: "en_linea",
    moodleCourseShortname: null,
  },
  {
    id: "lic-ciencia-datos",
    tipo: "licenciatura",
    nombre: "Licenciatura en Ciencia de Datos",
    descripcion:
      "Domina estadística aplicada, machine learning y visualización de datos para la toma de decisiones.",
    duracion: "12 cuatrimestres",
    modalidad: "en_linea",
    moodleCourseShortname: null,
  },
  {
    id: "dip-ux-ui",
    tipo: "diplomado",
    nombre: "Diplomado en UX/UI y Diseño de Producto",
    descripcion:
      "Investigación de usuarios, prototipado y sistemas de diseño para productos digitales.",
    duracion: "3 meses",
    modalidad: "hibrida",
    moodleCourseShortname: null,
  },
  {
    id: "cert-devops-cicd",
    tipo: "certificacion",
    nombre: "Certificación en DevOps y CI/CD",
    descripcion:
      "Automatiza integración, pruebas y despliegue continuo con herramientas usadas en la industria.",
    duracion: "6 semanas",
    modalidad: "en_linea",
    moodleCourseShortname: null,
  },
];

const MOCK_CURSOS: CursoEstudiante[] = [
  {
    id: "curso-estructuras-datos",
    nombre: "Estructuras de Datos Avanzadas",
    periodo: "3er cuatrimestre",
    progreso: 72,
    estado: "en_curso",
  },
  {
    id: "curso-ia-aplicada",
    nombre: "Inteligencia Artificial Aplicada",
    periodo: "3er cuatrimestre",
    progreso: 45,
    estado: "en_curso",
  },
  {
    id: "curso-bases-datos",
    nombre: "Bases de Datos Relacionales",
    periodo: "3er cuatrimestre",
    progreso: 100,
    estado: "finalizado",
  },
  {
    id: "curso-ingles-tecnico-4",
    nombre: "Inglés Técnico IV",
    periodo: "3er cuatrimestre",
    progreso: 0,
    estado: "por_iniciar",
  },
];

const MOCK_AVISOS: AvisoInstitucional[] = [
  {
    id: "aviso-conferencia-ia",
    titulo: "Conferencia magistral: el impacto de la IA en la educación superior",
    fecha: "2026-10-15",
    resumen:
      "Especialistas debatieron sobre el futuro del aprendizaje adaptativo y la ética en la formación profesional.",
    imagen: "/images/aviso-conferencia-ia.jpg",
  },
  {
    id: "aviso-periodo-examenes",
    titulo: "Periodo de exámenes del 3er cuatrimestre",
    fecha: "2026-11-10",
    resumen: "Consulta las fechas y modalidades de evaluación en Mi IINICIA.",
    imagen: "/images/aviso-periodo-examenes.jpg",
  },
];

/** Respuesta simulada de autenticación mientras no existe backend real. */
export const MOCK_DASHBOARD_ESTUDIANTE: DashboardEstudiante = {
  usuario: {
    id: "mock-estudiante-001",
    nombre: "Rodrigo Hernández",
    correo: "rodrigo.hernandez@iinicia.edu.mx",
    rol: "estudiante",
  },
  cuatrimestre: "3er cuatrimestre",
  creditosObtenidos: 148,
  creditosTotales: 300,
  progresoCurricular: 49,
  cursos: MOCK_CURSOS,
  avisos: MOCK_AVISOS,
};

/** Dashboard del profesor: el backend no expone todavía un reporte propio de grupos/entregas. */
export const MOCK_DASHBOARD_PROFESOR: { grupos: GrupoProfesor[] } = {
  grupos: [
    {
      id: "grp-ia-3a",
      curso: "Inteligencia Artificial Aplicada",
      periodo: "3er cuatrimestre · Grupo A",
      estudiantes: 28,
      entregasPendientes: 6,
    },
    {
      id: "grp-bd-3a",
      curso: "Bases de Datos Relacionales",
      periodo: "3er cuatrimestre · Grupo A",
      estudiantes: 31,
      entregasPendientes: 2,
    },
    {
      id: "grp-ia-3b",
      curso: "Inteligencia Artificial Aplicada",
      periodo: "3er cuatrimestre · Grupo B",
      estudiantes: 25,
      entregasPendientes: 9,
    },
  ],
};

/** Estado de solicitud del aspirante: la plataforma aún no expone un endpoint de seguimiento. */
export const MOCK_DASHBOARD_ASPIRANTE: SolicitudAspirante = {
  programaNombre: "Ingeniería de Software e Inteligencia Artificial",
  estado: "en_revision",
  pasos: [
    { label: "Cuenta creada", completado: true },
    { label: "Perfil y programa seleccionados", completado: true },
    { label: "Documentos cargados", completado: false },
    { label: "Dictamen del comité", completado: false },
  ],
};

/** Resumen del coordinador: cifras agregadas de su programa, aún sin reporte real del backend. */
export const MOCK_DASHBOARD_COORDINADOR: ResumenCoordinacion = {
  programa: "Ingeniería de Software e Inteligencia Artificial",
  estudiantesActivos: 164,
  profesores: 12,
  avancePromedio: 58,
  alertas: [
    { id: "al-1", mensaje: "9 estudiantes del Grupo B de IA Aplicada llevan 2 o más entregas atrasadas." },
    { id: "al-2", mensaje: "3 solicitudes de aspirantes esperan dictamen desde hace más de 72 horas." },
  ],
};

/** Resumen para admin académico / superadmin: cifras institucionales de ejemplo. */
export const MOCK_DASHBOARD_ADMIN: ResumenAdmin = {
  usuariosPorRol: [
    { rol: "estudiante", total: 842 },
    { rol: "aspirante", total: 97 },
    { rol: "profesor", total: 54 },
    { rol: "coordinador", total: 8 },
    { rol: "admin_academico", total: 3 },
    { rol: "superadmin", total: 2 },
  ],
  solicitudesPendientes: 12,
  cuentasMoodleVinculadas: 779,
};
