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
