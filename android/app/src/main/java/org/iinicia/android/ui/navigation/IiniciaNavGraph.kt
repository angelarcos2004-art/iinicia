package org.iinicia.android.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import org.iinicia.android.ui.screens.DashboardScreen
import org.iinicia.android.ui.screens.LoginScreen
import org.iinicia.android.ui.viewmodel.MainViewModel

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Dashboard : Screen("dashboard")
}

@Composable
fun IiniciaNavGraph(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController()
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
                    viewModel.iniciarSesion(
                        correo = correo,
                        password = password,
                        onLoginSuccess = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    )
                }
            )
        }

        composable(route = Screen.Dashboard.route) {
            DashboardScreen(
                uiState = uiState,
                onLogout = {
                    viewModel.cerrarSesion()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            )
        }
    }
}
