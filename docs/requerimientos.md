IINICIA |Arquitectura de Plataforma Diqital
PROYECTO DE MIGRACIÓN Y REDISEÑO
Plataforma Digital Universitaria IINICIA
React + Moodle + Aplicación Android
Documento de alcance técnico, arquitectura y lineamientos de
desarrollo
Versión 1.0
Octubre de 2026
Objetivo central
Migrar el portal actual basado en WordPress hacia una nueva plataforma
desarrollada en React, integrada con Moodle como LMS y
complementada con una aplicación Android para estudiantes.
Preparado para el equipo de desarrollo web, backend, UX/UI, infraestructura y aplicación móvil.
Documento de alcance técnico • Octubre 2026 • Página 1

IINICIA |Arquitectura de Plataforma Digital
Contenido
1. Resumen ejecutivo
2. Contexto y alcance
3. Principios de arquitectura
4. Arquitectura objetivo
5. Stack tecnológico
6. Portal React / Next.js
7. Backend IINICIA
8. Moodle como LMS
9. Aplicación Android
10. Modelo de identidad, autenticación y SSO
11. Roles y permisos
12. Registro, admisión e inscripción
13. Integración con Moodle
14. Gestión de contenidos
15. Diseño UX/UI y tema Moodle
16. Seguridad, privacidad y auditoría
17. Accesibilidad y rendimiento
18. Datos y migración desde WordPress
19. Infraestructura, DevOps y ambientes
20. Repositorios y calidad de código
21. Prueba de concepto obligatoria
22. Fases de implementación
23. Criterios de aceptación
24. Entregables
25. Riesgos y decisiones técnicas
26. Visión final
Documento de alcance técnico• Octubre 2026• Página 2

IINICIA Arguitectura de Plataforma Digital
1. Resumen ejecutivo
IINiCIA debe evolucionar de un portal actualmente construido en WordPress hacia una plataforma digital
universitaria moderna. El rediseño no consiste en cambiar la plantilla de WordPress ni en mantener
WordPress como CMS oculto. La nueva solución se desarrollará con React, preferentemente mediante
Next.js, y utilizará Moodle como núcleo académico y LMS. La plataforma deberá permitir registro de
usuarios, autorización por programa, creación y sincronización de cuentas Moodle, inscripción en cursos,
Single Sign-On, administración por roles y acceso desde una aplicación Android propia.
Decisión arquitectónica principal
WordPress se utilizará únicamente como fuente temporal de contenidos durante la migración. Después de
la puesta en producción de la nueva plataforma deberá poder retirarse sin afectar la operación del portal, el
LMS ni la aplicación móvil.
El estudiante deberá percibir una sola experiencia digital, aunque detrás existan diversos componentes
tecnológicos. La plataforma web, Moodle y la aplicación Android compartirán identidad, permisos y
navegación coherente.
2. Contexto y alcance
El portal actual de IINiCIA funciona sobre WordPress. El proyecto implica una migración tecnológica y un
rediseño funcional completo. Se conservarán únicamente los contenidos institucionales, recursos y datos
que sean válidos, actualizados y legalmente utilizables
Desarrollar un nuevo portal institucional en React/Next.js.
Implementar Moodle como LMS institucional.
Desarrollar un backend propio para lógica de negocio e integración.
Implementar registro, autenticación, roles y permisos.
Automatizar creación de usuarios e inscripción en Moodle.
Implementar Single Sign-On entre portal, LMS y aplicación móvil.
Crear una aplicación Android propia para estudiantes
Migrar contenidos y URLs relevantes desde WordPress.
Diseñar una identidad visual coherente entre portal web, Moodle y Android.
3. Principios de arquitectura
Principio Aplicación en el proyecto
Separación de React presenta la experiencia digital; el backend aplica reglas de negocio; Moodle gestiona la
responsabilidades actividad académica; la aplicación Android consume servicios seguros.
Una sola identidad El usuario no deberá administrar credenciales independientes para cada componente. Se
implementará SSO.
Moodle como fuente Cursos, actividades, evaluaciones, calificaciones, proqreso y finalización pertenecen a
académica Moodle.
No acceso directo a bases React, Android y servicios externos no escribirán directamente en la base de datos de
de datos Moodle.
Documento de alcance técnico • Octubre 2026 • Página 3

IINICIA Arguitectura de Plataforma Digital
Principio Aplicación en el proyecto
Seguridad por diseño Tokens, secretos y credenciales administrativas nunca deberán exponerse al navegador ni a
la aplicación.
API-first Las capacidades reutilizables deberán exponerse mediante APls versionadas y
documentadas.
Escalabilidad La solución deberá permitir añadir programas, generaciones, cursos y usuarios sin rediseños
estructurales.
Mobile first El portal deberá ser plenamente funcional desde dispositivos móviles y complementarse con
una app Android propia.
4. Arquitectura obietivo
La arquitectura propuesta desacopla el portal institucional, la lógica de negocio y el LMS. El portal web y la
aplicación móvil deberán consumir servicios controlados por el backend. Moodle será integrado mediante
sus servicios web y mecanismos de autenticación compatibles.
Arguitectura objetivo IINICIA
Portal web Aplicación Android
Usuario

|  |  | React + Next.js + TypeScript |  | Kotlin + Jetpack Compose |
| --- | --- | --- | --- | --- |
| Aspirante | HTTPS | Sitio institucional | HTTPS | Acceso al LMS |
| Estudiante |  | Mi IINICIA |  | Cursos y actividades |
| Profesor |  | Registro y autenticación |  | Notificaciones |

Coordinador
Administrador
API API

|  |  | Backend IINICIA |  | Moodle LMS |
| --- | --- | --- | --- | --- |
| Identidad |  | Node.js + Nest\|S |  | Cursos |
|  |  | API/BFF |  | Actividades |
| OIDC / OAuth 2.0 | OIDC | Reglas de negocio | REST |  |
| SSO |  |  |  | Evaluaciones |
|  |  | Roles y permisos |  | Calificaciones |
| Keycloak a evaluar |  | Auditoría y seguridad |  |  |

Cohortes y progreso
Principio: React y Android nunca acceden directamente a la base de datos de Moodle; toda lógica sensible pasa por servicios seguros.
Figura 1. Arquitectura objetivo de la plataforma digital IINiCIA.
5. Stack tecnológico
Componente Tecnología propuesta Responsabilidad
Portal web React + Next.js + TypeScript Experiencia institucional, SEO, dashboard y rutas protegidas.
Documento de alcance técnico • Octubre 2026 • Página 4

IINICIA |Arquitectura de Plataforma Digital
Componente Tecnología propuesta Responsabilidad
Estilos/UI Tailwind CSS + design system Componentes consistentes y responsive.
Backend Node.js + NestJS APl, reglas de negocio, integración, seguridad y auditoría.
Base de datos portal PostgreSQL Usuarios, perfiles, programas, solicitudes, relaciones y
auditoría.
LMS Moodle Cursos, actividades, evaluaciones, progreso y calificaciones.
Integración LMS Moodle Web Services / REST Creación de usuarios, matrículas, cohortes y consultas
académicas.
Identidad OpenID Connect / OAuth 2.0 SSO y autenticación centralizada.
Proveedor de identidad Keycloak a evaluar Gestión central de cuentas, sesiones, roles y MFA.
Android Kotlin + Jetpack Compose Aplicación nativa IINICIA para estudiantes.
Diseño Figma Sistema visual y prototipos.
Contenedores Docker Desarrollo, pruebas y despliegue reproducible.
Proxy Nginx o equivalente TLS, routing y reverse proxy.
Versionamiento Git Control de versiones y revisión por Pull Request.
6. Portal React / Next.js
El portal público será desarrollado en React mediante Next.js. No se conservará WordPress como
dependencia operativa. Next.js permitirá páginas indexables, renderizado del lado del servidor o estático
cuando convenga, optimización de recursos y una zona autenticada para Mi IINIClA.
Inicio institucional y páginas informativas.
Universidad: quiénes somos, misión, visión, modelo educativo, autoridades y docentes.
Oferta académica: licenciaturas, diplomados, certificaciones y cursos.
Admisiones y solicitud de información
Registro, inicio de sesión y recuperación de acceso.
Mi IINIClA: perfil, programa, cursos autorizados, avisos y accesos.
Noticias y contenidos institucionales.
Contacto, prequntas frecuentes, avisos de privacidad y términos.
6.1 Navegación propuesta
Menú principal Subsecciones sugeridas
Inicio Presentación, oferta, beneficios, indicadores, noticias y llamados a la acción.
Universidad Quiénes somos, misión y visión, modelo educativo, autoridades, docentes
Oferta académica Licenciaturas, diplomados, certificaciones, cursos.
Admisiones Proceso, requisitos, preguntas frecuentes, registro.
Noticias Publicaciones institucionales.
Documento de alcance técnico • Octubre 2026• Página 5

IINICIA |Arquitectura de Plataforma Digital
Menú principal Subsecciones sugeridas
Contacto Canales oficiales y soporte.
Registrarme Creación de cuenta y solicitud.
Mi Campus Acceso autenticado al ecosistema académico.
7. Backend IINICIA
El backend será la capa de control entre las interfaces de usuario y los servicios académicos. Se propone
Node.js con NestJS para separar módulos, aplicar validación, seguridad, autorización y documentación de
APIs.
Registro y gestión de cuentas.
Perfiles, programas académicos, admisiones y estados del usuario.
Autorización basada en roles y permisos.
Comunicación con Moodle mediante APls oficiales.
Asignación de cohortes y matrículas.
Orquestación del SSO y tokens de acceso.
Notificaciones transaccionales.
Auditoría de acciones sensibles.
Exposición de endpoints para el portal y la app Android.
Regla de seguridad
React y Android nunca deben contener tokens administrativos de Moodle. Los secretos permanecen en
servidor y se administran mediante variables de entorno o un gestor de secretos.
8. Moodle como LMS
Moodle será el sistema académico central y deberá concentrar las capacidades propias de un LMS. No se
replicarán innecesariamente en React funcionalidades que Moodle ya resuelve de forma robusta.
Moodle administrará Ejemplos
Cursos y categorías Programas, periodos, asignaturas y organización académica.
Matrículas Usuarios autorizados, cohortes, grupos y vigencias
Actividades Tareas. foros. cuestionarios. recursos. lecciones y otras actividades.
Evaluación Calificaciones, retroalimentación, rúbricas y reportes.
Seguimiento Progreso, finalización, competencias y participación
Credenciales Insignias y certificados cuando se implementen.
Dominio sugerido: aula.iinicia.org o campus.iinicia.org.
Documento de alcance técnico • Octubre 2026• Página 6

IINICIA Arguitectura de Plataforma Digital
9. Aplicación Android
Entregable obligatorio
El proyecto deberá incluir una aplicación Android propia de IINIClA para que los estudiantes accedan al
LMS de Moodle, consulten sus cursos y reciban información académica desde el teléfono.
La aplicación deberá desarrollarse preferentemente en Kotlin con Jetpack Compose. No debe limitarse a
ser una WebView del portal o de Moodle. Debe ofrecer una experiencia móvil real, sequra y coherente con
la identidad institucional.
9.1 Alcance funcional mínimo
Inicio de sesión con la misma identidad utilizada en el portal web.
Dashboard del estudiante.
Listado de cursos activos y autorizados.
Detalle básico de cada curso.
Acceso a contenidos y actividades Moodle compatibles.
Consulta de próximas actividades y fechas importantes.
Notificaciones push para avisos académicos y eventos relevantes.
Acceso al perfil del estudiante.
Cierre de sesión y gestión sequra de sesión.
Deep links hacia contenidos o actividades específicas.
Acceso a Moodle con SSO cuando una actividad deba abrirse en la interfaz web del LMS
9.2 Arquitectura móvil
La aplicación Android consumirá preferentemente el backend IINIClA, que funcionará como Backend for
Frontend para centralizar autorización, simplificar respuestas y evitar exposición de tokens de Moodle.
Para funciones académicas específicas podrá utilizar los servicios móviles de Moodle de manera
controlada.
Capa Android Responsabilidad
UI - Jetpack Compose Pantallas, navegación, estados y accesibilidad.
ViewModel / dominio Estado de interfaz y reglas de presentación.
Repositorio de datos Consumo de API IINICIA y caché local.
Almacenamiento seguro Tokens de sesión mediante mecanismos sequros de Android.
Notificaciones Firebase Cloud Messaging o mecanismo equivalente.
Integración LMS Consulta de cursos, actividades y enlaces Moodle autorizados
9.3 Requisitos no funcionales de Android
Compatibilidad con versiones Android definidas por el equipo seqún cobertura de usuarios.
Autenticación segura y renovación controlada de tokens.
No almacenar contraseñas en texto plano.
Documento de alcance técnico • Octubre 2026 • Página 7

IINICIA Arguitectura de Plataforma Digital
Manejo de conectividad intermitente y estados offline cuando sea viable.
Notificaciones configurables por el usuario
Accesibilidad y escalado de texto.
Registro de errores sin exponer información sensible
Preparación para publicación y firma en Google Play cuando corresponda.
10. Modelo de identidad. autenticación y SSO
La solución deberá ofrecer una identidad digital única. El usuario utilizará una sola cuenta para el portal,
Moodle y la aplicación Android. Se evaluará Keycloak como proveedor de identidad central mediante
OpenID Connect/OAuth 2.0.
Escenario Comportamiento esperado
Portal React El usuario inicia sesión y recibe una sesión/tokens controlados.
Moodle Al seleccionar Mi Campus, el usuario accede sin capturar nuevamente sus credenciales.
Android La app reutiliza el mismo esguema de identidad y conserva los permisos del usuario.
Cambio de contraseña Se gestiona de forma centralizada y se refleja en todos los canales
Suspensión La cuenta pierde acceso de acuerdo con la politica institucional.
11. Roles y permisos
La plataforma debe implementar control de acceso basado en roles. Los permisos no se definirán
únicamente en la interfaz; deberán validarse también en el backend y, cuando corresponda, mapearse a
roles de Moodle.
Rol Responsabilidades principales Restricción clave
Superadministrador Control global de la plataforma, configuración crítica, gestión de Acceso total técnico y funcional. Debe
administradores, parámetros de seguridad y auditoría. asignarse a un número mínimo de
personas.
Administrador técnico Infraestructura, integraciones, configuración técnica, despliegues, No requiere modificar calificaciones ni
monitoreo, logs y soporte de sequndo nivel. decisiones académicas.
Administrador académico Programas, cohortes, periodos, usuarios académicos, matrículas y Puede autorizar o suspender accesos
estados escolares. académicos seqún politicas.
Coordinador Supervisión de programas, grupos, docentes, estudiantes y reportes Acceso limitado al programa o unidad
de su ámbito. asignada.
Profesor Acceso a sus cursos Moodle, contenidos, actividades, evaluación, No puede administrar usuarios
retroalimentación y sequimiento de sus estudiantes. qlobales ni cursos ajenos.
Estudiante Acceso a Mi IINICIA, app Android y únicamente a los cursos, No puede ver información de otros
actividades y recursos autorizados. estudiantes fuera de lo permitido por
Moodle.
Aspirante Consulta oferta, se registra, completa datos y da seguimiento a su No accede a cursos hasta ser
proceso previo a la matrícula. admitido/autorizado.
Documento de alcance técnico • Octubre 2026 • Página 8

IINICIA |Arquitectura de Plataforma Diqital
Rol Responsabilidades principales Restricción clave
Soporte Puede atender incidencias de cuenta y consultar información Sin acceso a calificaciones ni datos
mínima necesaria. académicos sensibles salvo
autorización explícita.
11.1 Matriz resumida de capacidades
Capacidad Superadmin Admin acad. Coordinador Profesor Estudiante Aspirante
Gestionar configuración global
Sí No No No No No
Gestionar usuarios
Sí sí Limitado No No No
Gestionar programas/cohortes
Sí sí sí No No No
Crear/administrar cursos
sí Según política Limitado Sus cursos No No
Evaluar estudiantes No necesario No necesario Supervisión sí No No
Acceder a cursos
sí Según Según ámbito Sus cursos Sus cursos No
necesidad
Usar app Android Opcional Opcional Opcional Opcional sí Opcional
12. Registro, admisión e inscripción
El reqistro deberá separar la creación de una cuenta de la autorización académica. Tener una cuenta no
debe implicar acceso automático a todos los cursos.
1. El aspirante crea su cuenta en el portal.
2. El sistema valida correo, duplicidad, contraseña, consentimiento y protección anti-bot.
3. Se crea la identidad IINICIA.
4. La persona completa su perfil y selecciona programa o proceso de interés.
5. El administrador académico o la regla correspondiente cambia su estado a admitido/activo.
6. El backend crea o vincula la cuenta Moodle.
7. El usuario se asigna a una cohorte o plan autorizado.
8. Moodle recibe las matrículas correspondientes.
9. El estudiante visualiza únicamente sus cursos autorizados en web y Android.
Documento de alcance técnico • Octubre 2026• Página 9

IINICIA Arguitectura de Plataforma Digital
Flujo principal del estudiante
Conoce IINICIA Se registra Es autorizado Recibe cursos Accede al Estudia
campus
Portal React Cuenta única Programa / cohorte Matrícula Moodle SSO Web o Android
Una sola identidad digital
El usuario conserva los mismos permisos y contexto al pasar del portal web al LMS y a la app Android.
Figura 2. Flujo principal de experiencia del estudiante.
13. Integración con Moodle
La integración se realizará mediante servicios web/APl. No se utilizará Edwiser Bridge porque la nueva
plataforma no depende de WordPress. El backend deberá ser idempotente y mantener una relación
estable entre las identidades de IINICIA y Moodle.
Operación requerida Resultado esperado
Buscar usuario Determinar si la identidad ya existe antes de crearla.
Crear usuario Generar cuenta Moodle sin duplicados.
Actualizar usuario Sincronizar cambios permitidos de perfil y estado.
Suspender usuario Impedir acceso cuando corresponda sin perder historial.
Consultar cursos Recuperar cursos visibles para el usuario.
Matricular Asignar al curso o cohorte autorizados.
Desmatricular/suspender Aplicar baja seqún reqla académica.
matrícula
Consultar progreso Mostrar indicadores básicos en Mi lINiClA y Android cuando sea viable.
13.1 Identificadores
Cada usuario tendrá un UUlD interno y una relación persistente con el identificador de Moodle. El correo
electrónico validado será un atributo importante, pero no deberá ser el único identificador técnico de la
persona.
Documento de alcance técnico• Octubre 2026• Página 10

IINICIA |Arquitectura de Plataforma Digital
Idempotencia
Si una solicitud de alta se ejecuta dos veces, el sistema debe reconocer al mismo usuario y
actualizar/vincular la cuenta existente en lugar de crear duplicados
14. Gestión de contenidos
Al eliminar WordPress, la institución necesita conservar una forma sencilla de actualizar contenido sin
editar código. El equipo deberá implementar un CMS Headless o un módulo administrativo propio.
Noticias y comunicados.
Páginas institucionales.
Oferta académica.
Docentes y perfiles públicos.
Prequntas frecuentes.
Datos de contacto.
Imágenes y recursos autorizados.
Restricción
No se utilizará WordPress como CMS oculto. La meta del proyecto es retirar WordPress de la arquitectura
operativa.
15. Diseño UX/UI y tema Moodle
El rediseño no deberá copiar la apariencia actual del sitio. Se creará un design system propio para IlNiCIA
y se aplicará de forma consistente en web, Moodle y Android.
Elemento Criterio
Identidad Logotipo, paleta, tipografía, iconografía y lenguaje visual coherentes.
Componentes Botones, formularios, tarjetas, tablas, alertas y navegación reutilizables.
Responsive Diseño Mobile First y pruebas desde 360 px hasta escritorio amplio.
Moodle Personalización visual mediante tema compatible con la versión seleccionada.
Android Componentes nativos que respeten la identidad institucional y patrones Android.
Como primera alternativa para Moodle deberá evaluarse Edwiser RemUl exclusivamente como tema.
También deberán compararse Boost Union, Moove, Maker o un tema propio basado en Boost. La
selección final dependerá de compatibilidad, accesibilidad, mantenimiento y costo.
15.1 Prototipos Figma obligatorios
Home
Universidad
Oferta académica
Detalle de licenciatura
Documento de alcance técnico • Octubre 2026• Página 11

IINICIA |Arquitectura de Plataforma Digital
Detalle de curso
Admisiones
Registro
Login
Recuperación de contraseña
Mi IINICIA
Dashboard del estudiante
Perfil
Dashboard Moodle
Curso Moodle
Pantallas Android: login, inicio, cursos, curso, actividad, notificaciones y perfil
16. Seguridad, privacidad y auditoría
Área Requisito
Transporte HTTPS/TLS obligatorio en todos los componentes.
Autenticación OIDC/OAuth 2.0; MFA para roles privilegiados.
Autorización RBAC validado en frontend, backend y LMS según corresponda.
Sesiones Tokens de corta duración. renovación controlada y revocación.
Secretos Variables de entorno seguras o gestor de secretos; nunca en repositorio.
Protecciones web CSP, CORS restringido, protección XSS/CSRF, validación de entrada y rate limiting.
Auditoría Registro de altas, cambios de rol, matrículas, suspensiones y operaciones críticas.
Backups Respaldos automáticos, retención definida y pruebas de restauración.
Privacidad Minimización de datos, avisos de privacidad y acceso por necesidad.
Android Almacenamiento seguro de tokens y bloqueo de información sensible en logs.
17. Accesibilidad y rendimiento
El objetivo de accesibilidad será WCAG 2.2 AA para el portal web y criterios equivalentes de accesibilidad
móvil en Android. La experiencia deberá ser utilizable mediante teclado, lectores de pantalla, escalado de
texto y alto contraste cuando corresponda.
Tema Lineamiento
Accesibilidad web HTML semántico, foco visible, contraste, textos alternativos y formularios etiquetados
Android TalkBack, contenido descriptivo, escalado de fuente y controles con tamaño táctil adecuado.
Imágenes WebP/AVIF en web cuando proceda; optimización y carga diferida.
Rendimiento Caché, CDN cuando se requiera, minimización de bundles y monitorización de Core Web Vitals.
Moodle Optimizar cachés, cron, almacenamiento y recursos según volumen de usuarios.
Documento de alcance técnico• Octubre 2026• Página 12

IINICIA |Arquitectura de Plataforma Digital
18. Datos y migración desde WordPress
La migración deberá comenzar con un inventario del WordPress actual. No se trasladará todo de forma
automática: cada elemento se evaluará por vigencia, calidad y utilidad.
Objeto Acción
Páginas institucionales Migrar, reescribir o eliminar.
Noticias Conservar las relevantes y migrar sus URLs/metadata.
Imágenes y archivos Depurar, comprimir y verificar derechos de uso.
Usuarios WordPress Evaluar si representan usuarios reales que deban migrarse.
Formularios Rediseñar en la nueva arquitectura.
SEO Migrar títulos, descripciones, canonical y redirecciones necesarias
URLs antiguas Aplicar redirecciones 301 hacia la nueva ruta cuando sea necesario.
Cierre de WordPress
WordPress se apagará únicamente después de validar contenidos, redirecciones, cuentas necesarias,
analítica, SEO, formularios y operación de la nueva plataforma.
19. Infraestructura, DevOps y ambientes
Ambiente Uso
DEV Desarrollo local/integración continua. Datos de prueba.
STAGING Validación funcional, UX, integración, seguridad y aceptación.
PRODUCTION Servicio público y académico real.
Ningún desarrollo deberá realizarse directamente sobre producción. Se recomienda contenerización con
Docker, reverse proxy, certificados automáticos, monitoreo, centralización de logs y pipelines Cl/CD.
19.1 Dominios sugeridos
Servicio Dominio sugerido
Portal https://iinicia.org
LMS https://aula.iinicia.org o https://campus.inicia.org
API https://api.iinicia.org
Administración Ruta o subdominio protegido según diseño final.
Documento de alcance técnico • Octubre 2026• Página 13

IINICIA Arguitectura de Plataforma Digital
20. Repositorios y calidad de código
Todo el código fuente deberá gestionarse mediante Git. Se prohíbe modificar Moodle Core. Las
personalizaciones de Moodle deberán implementarse mediante temas, plugins locales, autenticación o
matriculación compatibles con su arquitectura.
Repositorio / módulo Contenido
frontend Next.js / React / TypeScript.
backend NestJS, servicios de negocio e integración Moodle.
android Aplicación Kotlin + Jetpack Compose.
infrastructure Docker, proxy, despliegue, laC si se adopta.
documentation Diagramas, APl, decisiones, manuales y runbooks.
moodle-custom Tema y plugins propios sin modificar Core.
Flujo sugerido: feature branch → Pull Request → revisión de código → pruebas automatizadas → merge
→ desplieque a STAGING → aceptación → producción.
21. Prueba de concepto obligatoria
Antes de construir el sistema completo, el equipo deberá demostrar una POC de extremo a extremo. Esta
prueba valida las decisiones más riesgosas: identidad, creación de usuario, matrícula y acceso desde web
y Android.
1. Usuario abre el portal React.
2. Selecciona Registrarme.
3. Completa el formulario.
4. El backend crea la identidad IINICIA.
5. Se crea o vincula el usuario Moodle.
6. El usuario es asignado a una cohorte o curso de prueba.
7. Inicia sesión en el portal.
8. Visualiza el curso en Mi IINICIA.
9. Selecciona Entrar al Campus e ingresa a Moodle mediante SSO.
10. Inicia sesión en la aplicación Android con la misma identidad.
11. La app muestra el mismo curso autorizado
12. Una notificación de prueba puede dirigirse al dispositivo Android.
Puerta de decisión
La arquitectura principal se considerará validada cuando esta POC funcione sin duplicar usuarios, sin
solicitar una segunda contraseña para Moodle y sin exponer secretos en React o Android.
Documento de alcance técnico• Octubre 2026• Página 14

IINICIA |Arquitectura de Plataforma Digital
22. Fases de implementación
Fase Resultado principal
Fase 0 - Auditoría Inventario WordPress, hosting, DNS, contenidos, SEO, usuarios, plugins, formularios y Moodle
existente.
Fase 1 - UX/UI y arquitectura Figma, design system, modelo de datos, roles, APls, decisiones de identidad y plan de
migración.
Fase 2 - POC Registro, backend, usuario Moodle, matrícula, SSO y prototipo Android.
Fase 3 - Portal React Páginas institucionales, catálogo, registro, Mi IINiCIA y administración de contenidos.
Fase 4 - Moodle Instalación/actualización, tema, categorías, roles, cohortes, plugins y configuración académica.
Fase 5 - Backend e integración APls finales, reglas, sincronización, auditoría y automatización de matrículas
Fase 6 - Android Login, dashboard, cursos, actividades, notificaciones, perfil y publicación interna/pruebas.
Fase 7 - Migración Contenidos, redirecciones, datos necesarios y validación SEO
Fase 8 - QA y seguridad Pruebas funcionales, carga, accesibilidad, seguridad, recuperación y aceptación.
Fase 9 - Go Live Despliegue, monitoreo, soporte inicial y retiro controlado de WordPress.
23. Criterios de aceptación
ID Criterio
CA-01 WordPress deja de formar parte de la arquitectura operativa final.
CA-02 El portal público funciona en React/Next.js
CA-03 Una persona puede crear su cuenta desde el portal.
CA-04 La cuenta Moodle se crea o vincula automáticamente sin duplicados
CA-05 El sistema implementa roles y permisos para superadministrador, administradores, coordinadores, profesores,
estudiantes y aspirantes.
CA-06 Un administrador académico puede autorizar programas, cohortes y matrículas según su rol.
CA-07 El estudiante visualiza únicamente los cursos para los que tiene permiso.
CA-08 Existe SSO entre portal y Moodle.
CA-09 El usuario no necesita una segunda contraseña para entrar al LMS.
CA-10 React no contiene tokens administrativos de Moodle.
CA-11 La aplicación Android permite iniciar sesión con la misma identidad.
CA-12 La aplicación Android muestra los cursos autorizados del estudiante
CA-13 La app permite acceder de forma segura a actividades Moodle compatibles o abrirlas con SSO cuando se requiera.
CA-14 Las notificaciones móviles pueden enviarse a estudiantes de forma controlada.
Documento de alcance técnico• Octubre 2026• Página 15

IINICIA |Arquitectura de Plataforma Digital
ID Criterio
CA-15 Portal. Moodle y Android mantienen una identidad visual coherente.
CA-16 La información institucional puede actualizarse sin modificar código fuente.
CA-17 La plataforma cumple los criterios definidos de accesibilidad y responsive.
CA-18 Existen DEV. STAGING y PRODUCTION.
CA-19 Backups y restauración han sido probados.
CA-20 WordPress puede apagarse sin afectar la operación del ecosistema.
24. Entregables
Portal institucional React/Next.js en producción.
Backend IINICIA documentado y desplegado.
Base de datos PostqreSQL y esquema documentado
Moodle configurado, personalizado y conectado
Mecanismo SSO operativo.
Aplicación Android IINICIA funcional y paquete de distribución correspondiente.
Paneles y capacidades administrativas por rol
Sistema de gestión de contenidos.
Design system y archivo Figma.
Documentación de APIs.
Manual de despliegue y operación.
Manual de administración académica.
Plan y reporte de migración desde WordPress.
Plan de respaldo y recuperación.
Pruebas y evidencias de criterios de aceptación.
25. Riesgos y decisiones técnicas
Riesgo Mitigación
Duplicidad de identidad Diseñar UUID y tabla de mapeo IINICIA-Moodle; integración idempotente.
SSO incompatible Validar en POC antes de avanzar al desarrollo completo.
Dependencia excesiva de plugins Seleccionar plugins mantenidos y documentar alternativas.
Moodle
Migración SEO Inventariar URLs y aplicar 301 antes del apagado de WordPress.
App demasiado dependiente de Implementar capacidades nativas y usar web autenticada sólo donde sea necesario.
WebView
Exposición de tokens Usar backend/BFF y almacenamiento seguro: jamás incrustar secretos administrativos.
Permisos inconsistentes Definir una matriz RBAC central y pruebas por rol.
Escalabilidad de Moodle Pruebas de carga, caché, cron, base de datos y almacenamiento dimensionados.
Documento de alcance técnico• Octubre 2026• Página 16

IINICIA Arguitectura de Plataforma Digital
26. Visión final
El resultado esperado no es únicamente una página web nueva. El proyecto debe producir un ecosistema
digital universitario integrado, administrable y escalable, donde la tecnología permanezca transparente
para el usuario.
Plataforma Digital Universitaria IINICIA
Portal institucional React + sistema de admisiones + identidad digital + gestión de roles + backend de
inteqración + Moodle LMS + aplicación Android.
Desde la perspectiva del estudiante, la experiencia deberá ser sencilla: conoce IINICIA, selecciona un
programa, se registra, obtiene una cuenta, es autorizado, visualiza sus cursos y estudia desde el portal,
Moodle o la aplicación Android con una sola identidad.
Principio rector del proyecto
“Una sola identidad, una sola experiencia, múltiples canales de acceso.
Documento de alcance técnico• Octubre 2026• Página 17