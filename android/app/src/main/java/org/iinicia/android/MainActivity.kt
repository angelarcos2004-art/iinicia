package org.iinicia.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import org.iinicia.android.ui.navigation.IiniciaNavGraph
import org.iinicia.android.ui.theme.IiniciaTheme
import org.iinicia.android.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            IiniciaTheme {
                val mainViewModel: MainViewModel = viewModel(
                    factory = MainViewModel.provideFactory(applicationContext)
                )
                IiniciaNavGraph(
                    viewModel = mainViewModel,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}
