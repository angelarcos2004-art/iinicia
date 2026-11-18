<?php
/**
 * Habilita el seguimiento de finalización (completion tracking) en los cursos de prueba de
 * IINICIA: sin esto, Moodle nunca reporta un "progreso" distinto de null
 * (core_enrol_get_users_courses.progress), así que ni la barra de progreso de Mi IINICIA ni la
 * seriación de materias (MoodleService.obtenerCursosAprobados, que exige progreso === 100)
 * pueden funcionar de verdad, aunque el curso tenga actividades reales.
 *
 * Se usa seguimiento MANUAL (el estudiante marca cada actividad como completada con la casilla
 * que Moodle ya muestra junto a cada actividad) en vez de automático, para no tener que
 * configurar una condición distinta por tipo de módulo (ver, entregar, aprobar...) — es la
 * opción más simple y la más fácil de demostrar en vivo.
 *
 * No forma parte del core de Moodle: es un script de administración, idempotente (se puede
 * correr otra vez sin romper nada).
 *
 * Uso (desde infrastructure/, con Docker arriba):
 *   MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < moodle-habilitar-completion.php
 */

define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->libdir . '/completionlib.php');

$shortnames = ['IINICIA101', 'IINICIA-SOFT1', 'IINICIA-CIBER1', 'IINICIA-NEG1'];

foreach ($shortnames as $shortname) {
    $course = $DB->get_record('course', ['shortname' => $shortname]);
    if (!$course) {
        echo "No existe el curso {$shortname}, se omite.\n";
        continue;
    }

    $DB->set_field('course', 'enablecompletion', 1, ['id' => $course->id]);

    $cms = $DB->get_records('course_modules', ['course' => $course->id]);
    $actualizados = 0;
    foreach ($cms as $cm) {
        if ((int) $cm->completion !== COMPLETION_TRACKING_MANUAL) {
            $DB->set_field('course_modules', 'completion', COMPLETION_TRACKING_MANUAL, ['id' => $cm->id]);
            $actualizados++;
        }
    }

    rebuild_course_cache($course->id, true);
    echo "{$shortname}: completion habilitada, {$actualizados} actividad(es) marcadas con seguimiento manual.\n";
}

echo "Listo.\n";
