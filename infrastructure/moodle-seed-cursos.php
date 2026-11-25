<?php
/**
 * Catálogo de cursos de prueba realistas para IINICIA (no forma parte del core de Moodle: es
 * un script de administración, se ejecuta una sola vez por instalación).
 *
 * Crea 3 cursos con contenido real (páginas, tareas con fecha límite, un cuestionario con
 * preguntas, y un foro con una discusión) para poder probar de verdad el selector de curso del
 * botón "Matricular" del panel admin (POST /usuarios/:id/matricula) con más de una opción.
 *
 * A propósito NO se vinculan a los programas académicos (PROGRAMAS_SEMILLA en
 * backend/src/seed.ts): el acceso a estos cursos solo lo debe conceder un administrador de
 * forma explícita, nunca el autorregistro (ver docs/requerimientos.md §12 y
 * backend/src/auth/auth.service.ts).
 *
 * Uso (desde infrastructure/, con Docker arriba):
 *   MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < moodle-seed-cursos.php
 *
 * Idempotente a nivel de curso: si el shortname ya existe, se omite por completo (no actualiza
 * contenido). Para rehacer un curso, bórralo primero desde Moodle.
 */

define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/lib/phpunit/classes/util.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/lib/enrollib.php');
require_once($CFG->dirroot . '/lib/questionlib.php');
require_once($CFG->dirroot . '/question/engine/bank.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

\core\session\manager::set_user(get_admin());

/**
 * Crea una pregunta (truefalse o shortanswer) llamando al mismo método que usa el formulario
 * real de edición de preguntas (question_type::save_question()). No se usa
 * core_question_generator (admin/.../tests/generator) porque internamente requiere
 * lib/phpunit/lib.php, que exige PHPUnit instalado - no disponible en este contenedor de
 * runtime (solo en un entorno de pruebas con `vendor/` de Composer).
 */
function iinicia_crear_pregunta(array $pregunta, int $catid, int $contextid): stdClass {
    $qtypeobj = question_bank::get_qtype($pregunta['tipo']);

    $question = new stdClass();
    $question->qtype = $pregunta['tipo'];

    $form = new stdClass();
    $form->category = $catid . ',' . $contextid;
    $form->name = $pregunta['nombre'];
    $form->questiontext = ['text' => $pregunta['texto'], 'format' => FORMAT_HTML];
    $form->generalfeedback = ['text' => '', 'format' => FORMAT_HTML];
    $form->defaultmark = 1;
    $form->penalty = 0;

    if ($pregunta['tipo'] === 'truefalse') {
        $form->correctanswer = $pregunta['correcta'] ? 1 : 0;
        $form->feedbacktrue = ['text' => '', 'format' => FORMAT_HTML];
        $form->feedbackfalse = ['text' => '', 'format' => FORMAT_HTML];
    } else {
        $form->usecase = 0;
        $form->answer = $pregunta['respuestas'];
        $form->fraction = $pregunta['fracciones'];
        $form->feedback = array_fill(0, count($pregunta['respuestas']), ['text' => '', 'format' => FORMAT_HTML]);
    }

    return $qtypeobj->save_question($question, $form);
}

$CURSOS = [
    [
        'shortname' => 'IINICIA-SOFT1',
        'fullname' => 'Fundamentos de Ingeniería de Software e IA',
        'summary' => 'Introducción a la lógica de programación y a los conceptos básicos de '
            . 'inteligencia artificial, como base para el resto de la licenciatura.',
        'secciones' => [
            1 => [
                'nombre' => 'Tema 1: Fundamentos de programación',
                'pagina' => [
                    'nombre' => 'Introducción a la lógica de programación',
                    'contenido' => '<p>Un algoritmo es una secuencia finita de pasos que resuelve un '
                        . 'problema. En esta unidad revisamos variables, condicionales y ciclos, y '
                        . 'los representamos primero con pseudocódigo antes de escribir código real.</p>',
                ],
                'tarea' => [
                    'nombre' => 'Tarea 1: Algoritmo de ordenamiento',
                    'intro' => '<p>Implementa el algoritmo de ordenamiento burbuja (bubble sort) en el '
                        . 'lenguaje que prefieras y documenta su complejidad en tiempo. Sube tu código '
                        . 'y un reporte breve (máximo 1 página).</p>',
                ],
            ],
            2 => [
                'nombre' => 'Tema 2: Introducción a la Inteligencia Artificial',
                'pagina' => [
                    'nombre' => '¿Qué es el aprendizaje automático?',
                    'contenido' => '<p>El aprendizaje automático (machine learning) es la rama de la IA '
                        . 'donde un modelo aprende patrones a partir de datos, en vez de seguir reglas '
                        . 'programadas explícitamente. Distinguimos aprendizaje supervisado, no '
                        . 'supervisado y por refuerzo.</p>',
                ],
                'cuestionario' => [
                    'nombre' => 'Cuestionario 1: Conceptos de IA',
                    'intro' => '<p>Dos preguntas cortas para repasar los conceptos de esta unidad.</p>',
                    'preguntas' => [
                        [
                            'tipo' => 'truefalse',
                            'nombre' => 'IA-P1 Aprendizaje supervisado',
                            'texto' => 'En el aprendizaje supervisado, el modelo se entrena con datos '
                                . 'que ya incluyen la respuesta correcta (etiquetas).',
                            'correcta' => true,
                        ],
                        [
                            'tipo' => 'shortanswer',
                            'nombre' => 'IA-P2 Tipo de aprendizaje sin etiquetas',
                            'texto' => '¿Cómo se llama el tipo de aprendizaje automático que encuentra '
                                . 'patrones en datos que NO tienen etiquetas? (una palabra)',
                            'respuestas' => ['no supervisado', 'unsupervised', '*'],
                            'fracciones' => ['1.0', '1.0', '0.0'],
                        ],
                    ],
                ],
            ],
        ],
        'foro' => [
            'nombre' => 'Foro de dudas del curso',
            'intro' => '<p>Usa este espacio para preguntas sobre las tareas o el contenido del curso.</p>',
            'discusion' => [
                'titulo' => 'Bienvenida y dudas generales',
                'mensaje' => '<p>Bienvenidos al curso. Publiquen aquí cualquier duda sobre la Tarea 1 '
                    . 'o el Cuestionario 1.</p>',
            ],
        ],
    ],
    [
        'shortname' => 'IINICIA-CIBER1',
        'fullname' => 'Ciberseguridad Defensiva y SOC',
        'summary' => 'Fundamentos de ciberseguridad defensiva y operación de un centro de '
            . 'operaciones de seguridad (SOC): detección, análisis y respuesta a incidentes.',
        'secciones' => [
            1 => [
                'nombre' => 'Tema 1: Fundamentos de ciberseguridad',
                'pagina' => [
                    'nombre' => 'La tríada CIA: confidencialidad, integridad y disponibilidad',
                    'contenido' => '<p>Todo control de seguridad busca proteger uno o más de estos '
                        . 'tres pilares. Identificar cuál está en riesgo ante un incidente es el '
                        . 'primer paso para decidir cómo responder.</p>',
                ],
                'tarea' => [
                    'nombre' => 'Tarea 1: Análisis de una bitácora de firewall',
                    'intro' => '<p>Se te proporcionará un extracto de logs de firewall con tráfico '
                        . 'sospechoso. Identifica el patrón del ataque (p. ej. escaneo de puertos o '
                        . 'fuerza bruta) y documenta tu análisis.</p>',
                ],
            ],
            2 => [
                'nombre' => 'Tema 2: Detección y respuesta a incidentes (SOC)',
                'pagina' => [
                    'nombre' => 'El ciclo de vida de un incidente de seguridad',
                    'contenido' => '<p>Un SOC sigue, en términos generales, las fases de: detección, '
                        . 'análisis, contención, erradicación, recuperación y lecciones aprendidas '
                        . '(post-mortem).</p>',
                ],
                'cuestionario' => [
                    'nombre' => 'Cuestionario 1: Respuesta a incidentes',
                    'intro' => '<p>Dos preguntas cortas sobre el ciclo de respuesta a incidentes.</p>',
                    'preguntas' => [
                        [
                            'tipo' => 'truefalse',
                            'nombre' => 'CIBER-P1 Fase de contención',
                            'texto' => 'La fase de "contención" busca limitar el alcance del incidente '
                                . 'antes de eliminar la causa raíz.',
                            'correcta' => true,
                        ],
                        [
                            'tipo' => 'shortanswer',
                            'nombre' => 'CIBER-P2 Sigla SOC',
                            'texto' => '¿Qué significa la sigla "SOC" en el contexto de ciberseguridad? '
                                . '(en español)',
                            'respuestas' => ['centro de operaciones de seguridad', '*'],
                            'fracciones' => ['1.0', '0.0'],
                        ],
                    ],
                ],
            ],
        ],
        'foro' => [
            'nombre' => 'Foro de ciberseguridad',
            'intro' => '<p>Comparte hallazgos o dudas sobre el análisis de bitácoras.</p>',
            'discusion' => [
                'titulo' => 'Herramientas recomendadas para análisis de logs',
                'mensaje' => '<p>¿Qué herramientas usan para revisar logs de firewall? Compartan sus '
                    . 'recomendaciones.</p>',
            ],
        ],
    ],
    [
        'shortname' => 'IINICIA-NEG1',
        'fullname' => 'Administración de Negocios Digitales',
        'summary' => 'Modelos de negocio digitales, estrategias de marketing y métricas clave '
            . 'para evaluar el desempeño de una empresa en línea.',
        'secciones' => [
            1 => [
                'nombre' => 'Tema 1: Modelos de negocio digitales',
                'pagina' => [
                    'nombre' => 'El lienzo de modelo de negocio (Business Model Canvas)',
                    'contenido' => '<p>El Business Model Canvas resume en un solo lienzo los '
                        . 'elementos clave de un negocio: propuesta de valor, segmentos de clientes, '
                        . 'canales, fuentes de ingreso y estructura de costos.</p>',
                ],
                'tarea' => [
                    'nombre' => 'Tarea 1: Lienzo de un negocio digital',
                    'intro' => '<p>Elige una empresa digital real (o una idea propia) y completa un '
                        . 'Business Model Canvas, justificando cada bloque en un párrafo breve.</p>',
                ],
            ],
            2 => [
                'nombre' => 'Tema 2: Marketing digital y métricas',
                'pagina' => [
                    'nombre' => 'Métricas clave: CAC y LTV',
                    'contenido' => '<p>El costo de adquisición de cliente (CAC) y el valor de vida '
                        . 'del cliente (LTV) permiten evaluar si un canal de marketing es rentable: '
                        . 'un negocio sano suele buscar que LTV sea varias veces mayor que el CAC.</p>',
                ],
                'cuestionario' => [
                    'nombre' => 'Cuestionario 1: Métricas digitales',
                    'intro' => '<p>Dos preguntas cortas sobre métricas de negocio digital.</p>',
                    'preguntas' => [
                        [
                            'tipo' => 'truefalse',
                            'nombre' => 'NEG-P1 Relación CAC/LTV',
                            'texto' => 'En general, un negocio digital saludable busca que el LTV sea '
                                . 'mayor que el CAC.',
                            'correcta' => true,
                        ],
                        [
                            'tipo' => 'shortanswer',
                            'nombre' => 'NEG-P2 Sigla CAC',
                            'texto' => '¿Qué significa la sigla "CAC" en marketing digital? (en '
                                . 'español, sin acentos)',
                            'respuestas' => ['costo de adquisicion de cliente', '*'],
                            'fracciones' => ['1.0', '0.0'],
                        ],
                    ],
                ],
            ],
        ],
        'foro' => [
            'nombre' => 'Foro de negocios digitales',
            'intro' => '<p>Comenta aquí sobre la Tarea 1 o comparte ejemplos de negocios digitales.</p>',
            'discusion' => [
                'titulo' => 'Ejemplos de modelos de negocio digitales',
                'mensaje' => '<p>¿Qué empresa digital les parece un buen ejemplo de modelo de negocio '
                    . 'innovador? Compartan el nombre y por qué.</p>',
            ],
        ],
    ],
    [
        'shortname' => 'IINICIA-CLOUD1',
        'fullname' => 'Cloud Architecture & Kubernetes: Fundamentos',
        'summary' => 'Contenedores, orquestación y arquitecturas en la nube listas para producción.',
        'secciones' => [
            1 => [
                'nombre' => 'Tema 1: Contenedores y Docker',
                'pagina' => [
                    'nombre' => '¿Qué es un contenedor?',
                    'contenido' => '<p>Un contenedor empaqueta una aplicación junto con todas sus '
                        . 'dependencias en una unidad aislada y portable, a diferencia de una máquina '
                        . 'virtual, que virtualiza el hardware completo.</p>',
                ],
                'tarea' => [
                    'nombre' => 'Tarea 1: Dockeriza una aplicación simple',
                    'intro' => '<p>Escribe un Dockerfile para una aplicación sencilla (a tu elección) y '
                        . 'documenta los comandos para construir y correr la imagen.</p>',
                ],
            ],
            2 => [
                'nombre' => 'Tema 2: Orquestación con Kubernetes',
                'pagina' => [
                    'nombre' => 'Pods, Deployments y Services',
                    'contenido' => '<p>Un Pod es la unidad mínima desplegable en Kubernetes. Un '
                        . 'Deployment gestiona réplicas de Pods, y un Service les da una dirección de '
                        . 'red estable aunque los Pods cambien.</p>',
                ],
                'cuestionario' => [
                    'nombre' => 'Cuestionario 1: Conceptos de Kubernetes',
                    'intro' => '<p>Dos preguntas cortas sobre los objetos básicos de Kubernetes.</p>',
                    'preguntas' => [
                        [
                            'tipo' => 'truefalse',
                            'nombre' => 'CLOUD-P1 Escalado de réplicas',
                            'texto' => 'Un Deployment puede escalar el número de réplicas de un Pod sin '
                                . 'tiempo de inactividad.',
                            'correcta' => true,
                        ],
                        [
                            'tipo' => 'shortanswer',
                            'nombre' => 'CLOUD-P2 Objeto de red',
                            'texto' => '¿Qué objeto de Kubernetes da una dirección de red estable a un '
                                . 'grupo de Pods? (una palabra, en inglés)',
                            'respuestas' => ['service', '*'],
                            'fracciones' => ['1.0', '0.0'],
                        ],
                    ],
                ],
            ],
        ],
        'foro' => [
            'nombre' => 'Foro de Cloud y Kubernetes',
            'intro' => '<p>Comparte dudas o hallazgos sobre Docker y Kubernetes.</p>',
            'discusion' => [
                'titulo' => 'Proveedores de Kubernetes administrado',
                'mensaje' => '<p>¿Qué proveedor de Kubernetes administrado (EKS, GKE, AKS...) conocen '
                    . 'o han usado? Compartan su experiencia.</p>',
            ],
        ],
    ],
    [
        'shortname' => 'IINICIA-PM1',
        'fullname' => 'Gestión de Proyectos Digitales: Fundamentos',
        'summary' => 'Metodologías ágiles y seguimiento de proyectos tecnológicos.',
        'secciones' => [
            1 => [
                'nombre' => 'Tema 1: Metodologías ágiles',
                'pagina' => [
                    'nombre' => 'Scrum y Kanban',
                    'contenido' => '<p>Scrum organiza el trabajo en sprints de duración fija con roles '
                        . 'definidos (Product Owner, Scrum Master, equipo). Kanban, en cambio, usa un '
                        . 'flujo continuo visualizado en un tablero, sin sprints fijos.</p>',
                ],
                'tarea' => [
                    'nombre' => 'Tarea 1: Backlog de producto',
                    'intro' => '<p>Elabora un backlog de producto con al menos 8 historias de usuario '
                        . 'para un proyecto digital de tu elección, priorizadas.</p>',
                ],
            ],
            2 => [
                'nombre' => 'Tema 2: Seguimiento y métricas de proyecto',
                'pagina' => [
                    'nombre' => 'Velocity y burndown chart',
                    'contenido' => '<p>La velocity mide cuánto trabajo completa un equipo por sprint. '
                        . 'Un burndown chart grafica el trabajo restante contra el tiempo, para '
                        . 'detectar a tiempo si un sprint va atrasado.</p>',
                ],
                'cuestionario' => [
                    'nombre' => 'Cuestionario 1: Métricas ágiles',
                    'intro' => '<p>Dos preguntas cortas sobre seguimiento de proyectos ágiles.</p>',
                    'preguntas' => [
                        [
                            'tipo' => 'truefalse',
                            'nombre' => 'PM-P1 Burndown ideal',
                            'texto' => 'En un burndown chart, la línea ideal desciende de forma '
                                . 'constante hasta llegar a cero al final del sprint.',
                            'correcta' => true,
                        ],
                        [
                            'tipo' => 'shortanswer',
                            'nombre' => 'PM-P2 Unidad de velocity',
                            'texto' => '¿Con qué unidad se suele medir la velocity de un equipo Scrum? '
                                . '(dos palabras, en español)',
                            'respuestas' => ['puntos de historia', 'puntos historia', '*'],
                            'fracciones' => ['1.0', '1.0', '0.0'],
                        ],
                    ],
                ],
            ],
        ],
        'foro' => [
            'nombre' => 'Foro de gestión de proyectos',
            'intro' => '<p>Comparte dudas sobre el backlog o las métricas ágiles.</p>',
            'discusion' => [
                'titulo' => 'Herramientas de gestión ágil',
                'mensaje' => '<p>¿Qué herramienta usan para llevar su tablero (Jira, Trello, '
                    . 'Azure Boards...)? Compartan ventajas y desventajas.</p>',
            ],
        ],
    ],
    [
        'shortname' => 'IINICIA-DATOS1',
        'fullname' => 'Fundamentos de Ciencia de Datos',
        'summary' => 'Estadística aplicada y primeros pasos en machine learning para la toma de decisiones.',
        'secciones' => [
            1 => [
                'nombre' => 'Tema 1: Estadística descriptiva',
                'pagina' => [
                    'nombre' => 'Medidas de tendencia central y dispersión',
                    'contenido' => '<p>Media, mediana y moda resumen un conjunto de datos en un solo '
                        . 'valor; la varianza y la desviación estándar describen qué tan dispersos '
                        . 'están los datos respecto a ese valor central.</p>',
                ],
                'tarea' => [
                    'nombre' => 'Tarea 1: Análisis descriptivo de un dataset',
                    'intro' => '<p>Elige un dataset público pequeño y calcula sus medidas de tendencia '
                        . 'central y dispersión, con una interpretación breve de los resultados.</p>',
                ],
            ],
            2 => [
                'nombre' => 'Tema 2: Introducción al machine learning aplicado',
                'pagina' => [
                    'nombre' => 'Entrenamiento, validación y prueba',
                    'contenido' => '<p>Un dataset se divide típicamente en entrenamiento, validación y '
                        . 'prueba, para medir qué tan bien generaliza un modelo a datos que nunca vio, '
                        . 'en vez de solo memorizarlos.</p>',
                ],
                'cuestionario' => [
                    'nombre' => 'Cuestionario 1: Fundamentos de ML',
                    'intro' => '<p>Dos preguntas cortas sobre evaluación de modelos.</p>',
                    'preguntas' => [
                        [
                            'tipo' => 'truefalse',
                            'nombre' => 'DATOS-P1 Conjunto de prueba',
                            'texto' => 'El conjunto de prueba (test set) nunca debe usarse para ajustar '
                                . 'los hiperparámetros del modelo.',
                            'correcta' => true,
                        ],
                        [
                            'tipo' => 'shortanswer',
                            'nombre' => 'DATOS-P2 Medida de tendencia central',
                            'texto' => '¿Qué medida de tendencia central es más robusta ante valores '
                                . 'extremos (outliers): la media o la mediana?',
                            'respuestas' => ['mediana', '*'],
                            'fracciones' => ['1.0', '0.0'],
                        ],
                    ],
                ],
            ],
        ],
        'foro' => [
            'nombre' => 'Foro de ciencia de datos',
            'intro' => '<p>Comparte dudas sobre el análisis descriptivo o el flujo de ML.</p>',
            'discusion' => [
                'titulo' => 'Datasets públicos recomendados',
                'mensaje' => '<p>¿Qué dataset público usaron para la Tarea 1? Compartan el enlace y de '
                    . 'qué trata.</p>',
            ],
        ],
    ],
    [
        'shortname' => 'IINICIA-UX1',
        'fullname' => 'UX/UI y Diseño de Producto: Fundamentos',
        'summary' => 'Investigación de usuarios, prototipado y sistemas de diseño para productos digitales.',
        'secciones' => [
            1 => [
                'nombre' => 'Tema 1: Investigación de usuarios',
                'pagina' => [
                    'nombre' => 'Entrevistas y mapas de empatía',
                    'contenido' => '<p>Una entrevista de usuario busca entender necesidades reales, no '
                        . 'validar ideas propias. Un mapa de empatía organiza lo que el usuario dice, '
                        . 'piensa, hace y siente para encontrar patrones.</p>',
                ],
                'tarea' => [
                    'nombre' => 'Tarea 1: Entrevistas de usuario',
                    'intro' => '<p>Realiza 3 entrevistas cortas a usuarios potenciales de un producto '
                        . 'digital y documenta los hallazgos principales en un mapa de empatía.</p>',
                ],
            ],
            2 => [
                'nombre' => 'Tema 2: Prototipado y sistemas de diseño',
                'pagina' => [
                    'nombre' => 'Fidelidad de prototipos',
                    'contenido' => '<p>Un prototipo de baja fidelidad (wireframe en papel) permite '
                        . 'probar ideas rápido y barato; uno de alta fidelidad simula la apariencia y '
                        . 'parte de la interacción real del producto final.</p>',
                ],
                'cuestionario' => [
                    'nombre' => 'Cuestionario 1: Prototipado',
                    'intro' => '<p>Dos preguntas cortas sobre fidelidad de prototipos.</p>',
                    'preguntas' => [
                        [
                            'tipo' => 'truefalse',
                            'nombre' => 'UX-P1 Prototipos de baja fidelidad',
                            'texto' => 'Los prototipos de baja fidelidad son más rápidos y baratos de '
                                . 'producir que los de alta fidelidad.',
                            'correcta' => true,
                        ],
                        [
                            'tipo' => 'shortanswer',
                            'nombre' => 'UX-P2 Herramienta de mapa de usuario',
                            'texto' => '¿Cómo se llama la herramienta de investigación que organiza lo '
                                . 'que el usuario dice, piensa, hace y siente? (dos palabras, en '
                                . 'español)',
                            'respuestas' => ['mapa de empatia', 'mapa empatia', '*'],
                            'fracciones' => ['1.0', '1.0', '0.0'],
                        ],
                    ],
                ],
            ],
        ],
        'foro' => [
            'nombre' => 'Foro de UX/UI',
            'intro' => '<p>Comparte dudas sobre las entrevistas de usuario o el prototipado.</p>',
            'discusion' => [
                'titulo' => 'Herramientas de prototipado',
                'mensaje' => '<p>¿Qué herramienta usan para prototipar (Figma, Adobe XD...)? Compartan '
                    . 'su flujo de trabajo.</p>',
            ],
        ],
    ],
    [
        'shortname' => 'IINICIA-DEVOPS1',
        'fullname' => 'DevOps y CI/CD: Fundamentos',
        'summary' => 'Integración continua, despliegue continuo y monitoreo de aplicaciones.',
        'secciones' => [
            1 => [
                'nombre' => 'Tema 1: Integración continua',
                'pagina' => [
                    'nombre' => '¿Qué es la integración continua (CI)?',
                    'contenido' => '<p>La integración continua automatiza la compilación y las pruebas '
                        . 'de cada cambio de código, para detectar errores de integración apenas '
                        . 'ocurren en vez de acumularlos hasta el final del proyecto.</p>',
                ],
                'tarea' => [
                    'nombre' => 'Tarea 1: Pipeline de CI básico',
                    'intro' => '<p>Configura un pipeline de integración continua (GitHub Actions, '
                        . 'GitLab CI o similar) que corra las pruebas automatizadas de un proyecto '
                        . 'propio en cada push.</p>',
                ],
            ],
            2 => [
                'nombre' => 'Tema 2: Despliegue continuo y monitoreo',
                'pagina' => [
                    'nombre' => 'Despliegue continuo vs. entrega continua',
                    'contenido' => '<p>En la entrega continua, cada cambio queda listo para desplegarse '
                        . 'pero requiere una aprobación manual; en el despliegue continuo, ese paso '
                        . 'también se automatiza y el cambio llega a producción sin intervención '
                        . 'humana.</p>',
                ],
                'cuestionario' => [
                    'nombre' => 'Cuestionario 1: CI/CD',
                    'intro' => '<p>Dos preguntas cortas sobre integración y despliegue continuo.</p>',
                    'preguntas' => [
                        [
                            'tipo' => 'truefalse',
                            'nombre' => 'DEVOPS-P1 Despliegue continuo',
                            'texto' => 'En el despliegue continuo, un cambio puede llegar a producción '
                                . 'sin aprobación manual si pasa todas las pruebas automatizadas.',
                            'correcta' => true,
                        ],
                        [
                            'tipo' => 'shortanswer',
                            'nombre' => 'DEVOPS-P2 Sigla CI',
                            'texto' => '¿Qué significan las siglas "CI" en el contexto de DevOps? (dos '
                                . 'palabras, en español, sin acentos)',
                            'respuestas' => ['integracion continua', '*'],
                            'fracciones' => ['1.0', '0.0'],
                        ],
                    ],
                ],
            ],
        ],
        'foro' => [
            'nombre' => 'Foro de DevOps',
            'intro' => '<p>Comparte dudas sobre el pipeline de CI o el despliegue continuo.</p>',
            'discusion' => [
                'titulo' => 'Herramientas de CI/CD',
                'mensaje' => '<p>¿Qué herramienta de CI/CD usan (GitHub Actions, GitLab CI, Jenkins...)? '
                    . 'Compartan su experiencia.</p>',
            ],
        ],
    ],
];

$generator = phpunit_util::get_data_generator();
$adminid = (int) get_admin()->id;
$teacherid = $DB->get_field('user', 'id', ['username' => 'profesor.prueba', 'deleted' => 0]);

foreach ($CURSOS as $def) {
    if ($DB->record_exists('course', ['shortname' => $def['shortname']])) {
        echo "Ya existe {$def['shortname']}, se omite.\n";
        continue;
    }

    $numsections = count($def['secciones']);
    $course = $generator->create_course(
        [
            'shortname' => $def['shortname'],
            'fullname' => $def['fullname'],
            'summary' => $def['summary'],
            'summary_format' => FORMAT_HTML,
            'numsections' => $numsections,
            'startdate' => usergetmidnight(time()),
        ],
        ['createsections' => true],
    );
    echo "Creado curso {$def['shortname']} (id {$course->id}).\n";

    foreach ($def['secciones'] as $num => $seccion) {
        $sectionrecord = $DB->get_record('course_sections', ['course' => $course->id, 'section' => $num], '*', MUST_EXIST);
        course_update_section($course, $sectionrecord, ['name' => $seccion['nombre']]);

        if (!empty($seccion['pagina'])) {
            $generator->get_plugin_generator('mod_page')->create_instance(
                [
                    'course' => $course,
                    'name' => $seccion['pagina']['nombre'],
                    'content' => $seccion['pagina']['contenido'],
                    'contentformat' => FORMAT_HTML,
                ],
                ['section' => $num],
            );
        }

        if (!empty($seccion['tarea'])) {
            $generator->get_plugin_generator('mod_assign')->create_instance(
                [
                    'course' => $course,
                    'name' => $seccion['tarea']['nombre'],
                    'intro' => $seccion['tarea']['intro'],
                    'duedate' => time() + 7 * DAYSECS,
                ],
                ['section' => $num],
            );
        }

        if (!empty($seccion['cuestionario'])) {
            $cfg = $seccion['cuestionario'];
            $quiz = $generator->get_plugin_generator('mod_quiz')->create_instance(
                [
                    'course' => $course,
                    'name' => $cfg['nombre'],
                    'intro' => $cfg['intro'],
                    'timeclose' => time() + 14 * DAYSECS,
                ],
                ['section' => $num],
            );

            $questiongen = $generator->get_plugin_generator('core_question');
            $contextid = context_course::instance($course->id)->id;
            $catid = $questiongen->create_question_category(['contextid' => $contextid])->id;

            $page = 1;
            foreach ($cfg['preguntas'] as $pregunta) {
                $q = iinicia_crear_pregunta($pregunta, $catid, $contextid);
                quiz_add_quiz_question($q->id, $quiz, $page);
                $page++;
            }
        }
    }

    if (!empty($def['foro'])) {
        $forumgen = $generator->get_plugin_generator('mod_forum');
        $forum = $forumgen->create_instance(
            [
                'course' => $course,
                'name' => $def['foro']['nombre'],
                'intro' => $def['foro']['intro'],
                'type' => 'general',
            ],
            ['section' => 0],
        );
        $forumgen->create_discussion([
            'course' => $course->id,
            'forum' => $forum->id,
            'userid' => $adminid,
            'name' => $def['foro']['discusion']['titulo'],
            'subject' => $def['foro']['discusion']['titulo'],
            'message' => $def['foro']['discusion']['mensaje'],
        ]);
    }

    if ($teacherid) {
        $enrolplugin = enrol_get_plugin('manual');
        $instance = null;
        foreach (enrol_get_instances($course->id, true) as $i) {
            if ($i->enrol === 'manual') {
                $instance = $i;
                break;
            }
        }
        $teacherrole = $DB->get_record('role', ['shortname' => 'editingteacher'], '*', MUST_EXIST);
        $enrolplugin->enrol_user($instance, $teacherid, $teacherrole->id);
        echo "  profesor.prueba matriculado como editingteacher.\n";
    }
}

echo "Listo.\n";
