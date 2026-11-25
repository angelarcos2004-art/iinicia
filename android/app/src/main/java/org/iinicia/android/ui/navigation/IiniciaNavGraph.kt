package org.iinicia.android.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import org.iinicia.android.ui.screens.CampusWebViewScreen
import org.iinicia.android.ui.screens.DashboardScreen
import org.iinicia.android.ui.screens.DetalleCursoScreen
import org.iinicia.android.ui.screens.LoginScreen
import org.iinicia.android.ui.screens.PerfilScreen
import org.iinicia.android.ui.viewmodel.MainViewModel

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Dashboard : Screen("dashboard")
    data object Perfil : Screen("perfil")
    data object CampusWebView : Screen("campus")
    data object DetalleCurso : Screen("curso/{cursoId}") {
        const val ARG_CURSO_ID = "cursoId"
        fun crearRuta(cursoId: String) = "curso/$cursoId"
    }
}

@Composable
fun IiniciaNavGraph(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
    deepLinkCursoId: String? = null,
    onDeepLinkConsumido: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Si existe una sesión persistida en EncryptedSharedPreferences, inicia directamente en Dashboard
    val initialDestination = remember {
        if (uiState.usuarioAutenticado != null) {
            Screen.Dashboard.route
        } else {
            Screen.Login.route
        }
    }

    // Login en caliente ya dispara su propia carga de cursos; esto cubre el caso de sesión
    // persistida (se reabre la app ya logueado), donde nadie más la pide.
    LaunchedEffect(Unit) {
        if (uiState.usuarioAutenticado != null && uiState.dashboard == null) {
            viewModel.cargarCursos()
        }
    }

    // Cierre de sesión forzado (p. ej. JWT expirado, ver MainViewModel.cerrarSesionSiExpiro):
    // en cuanto la sesión se pierde y no estamos ya en Login, manda para allá. Cubre el caso
    // del logout manual (que ya navega por su cuenta) sin duplicar pantallas gracias a
    // launchSingleTop + la comprobación de la ruta actual.
    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    LaunchedEffect(uiState.usuarioAutenticado, currentBackStackEntry) {
        if (uiState.usuarioAutenticado == null && currentBackStackEntry?.destination?.route != Screen.Login.route) {
            navController.navigate(Screen.Login.route) {
                popUpTo(0) { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    // Deep link de una notificación push (ver MainActivity/IiniciaFirebaseMessagingService):
    // espera a que haya sesión Y los cursos ya hayan cargado (si no, DetalleCursoScreen no
    // encontraría el curso todavía) antes de navegar directo a su detalle.
    LaunchedEffect(deepLinkCursoId, uiState.usuarioAutenticado, uiState.cursos) {
        if (deepLinkCursoId != null && uiState.usuarioAutenticado != null && uiState.cursos.isNotEmpty()) {
            navController.navigate(Screen.DetalleCurso.crearRuta(deepLinkCursoId)) {
                launchSingleTop = true
            }
            onDeepLinkConsumido()
        }
    }

    NavHost(
        navController = navController,
        startDestination = initialDestination,
        modifier = modifier
    ) {
        composable(route = Screen.Login.route) {
            LoginScreen(
                uiState = uiState,
                onFieldEdited = { viewModel.limpiarErroresFormulario() },
                onSubmitLogin = { correo, password ->
                    viewModel.iniciarSesion(correo = correo, password = password)
                },
                onSubmitCodigo = { codigo ->
                    viewModel.verificarCodigo2FA(
                        codigo = codigo,
                        onLoginSuccess = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    )
                },
                onVolverAlPaso1 = { viewModel.volverAlPaso1Login() }
            )
        }

        composable(route = Screen.Dashboard.route) {
            DashboardScreen(
                uiState = uiState,
                onCursoClick = { cursoId ->
                    navController.navigate(Screen.DetalleCurso.crearRuta(cursoId))
                },
                onPerfilClick = { navController.navigate(Screen.Perfil.route) },
                onReintentarCursos = { viewModel.cargarCursos() },
                onAbrirActividad = { actividadUrl -> viewModel.obtenerUrlCampusActividad(actividadUrl) },
                onUrlObtenida = { url ->
                    viewModel.fijarUrlCampus(url)
                    navController.navigate(Screen.CampusWebView.route)
                },
                onLogout = {
                    viewModel.cerrarSesion()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            )
        }

        composable(
            route = Screen.DetalleCurso.route,
            arguments = listOf(navArgument(Screen.DetalleCurso.ARG_CURSO_ID) { type = NavType.StringType })
        ) { backStackEntry ->
            val cursoId = backStackEntry.arguments?.getString(Screen.DetalleCurso.ARG_CURSO_ID).orEmpty()
            DetalleCursoScreen(
                curso = viewModel.obtenerCursoPorId(cursoId),
                onEntrarAlCampus = { viewModel.obtenerUrlCampus(cursoId) },
                onUrlObtenida = { url ->
                    viewModel.fijarUrlCampus(url)
                    navController.navigate(Screen.CampusWebView.route)
                },
                onVolver = { navController.popBackStack() }
            )
        }

        composable(route = Screen.CampusWebView.route) {
            CampusWebViewScreen(
                url = uiState.urlCampusActual,
                onVolver = {
                    viewModel.fijarUrlCampus(null)
                    navController.popBackStack()
                }
            )
        }

        composable(route = Screen.Perfil.route) {
            PerfilScreen(
                usuario = uiState.usuarioAutenticado,
                notificacionesHabilitadas = uiState.notificacionesHabilitadas,
                onAlternarNotificaciones = { viewModel.alternarNotificaciones(it) },
                onLogout = {
                    viewModel.cerrarSesion()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                        launchSingleTop = true
                    }
                },
                onVolver = { navController.popBackStack() }
            )
        }
    }
}
