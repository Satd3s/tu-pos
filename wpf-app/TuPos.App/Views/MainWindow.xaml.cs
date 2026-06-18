using System;
using System.ComponentModel;
using System.Windows;
using TuPos.App.Models;
using TuPos.App.ViewModels;

namespace TuPos.App.Views
{
    public partial class MainWindow : Window
    {
        private readonly MainViewModel _viewModel;
        private bool _isLoggingOut;

        public MainWindow(User currentUser)
        {
            InitializeComponent();
            _viewModel = new MainViewModel(currentUser);
            DataContext = _viewModel;
        }

        private void BtnLogout_Click(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show(
                "¿Seguro que deseas cerrar la sesión actual?", 
                "Cerrar Sesión", 
                MessageBoxButton.YesNo, 
                MessageBoxImage.Question
            );

            if (result == MessageBoxResult.Yes)
            {
                _isLoggingOut = true;
                
                // Show LoginWindow
                var loginWindow = new LoginWindow();
                loginWindow.Show();

                // Gracefully shutdown services
                _viewModel.Shutdown();

                // Close this main window
                this.Close();
            }
        }

        private void Window_Closing(object sender, CancelEventArgs e)
        {
            if (!_isLoggingOut)
            {
                var result = MessageBox.Show(
                    "¿Seguro que deseas salir del sistema? Se realizará un respaldo automático del inventario.",
                    "Salir de Tu POS",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question
                );

                if (result == MessageBoxResult.No)
                {
                    e.Cancel = true;
                }
                else
                {
                    // Gracefully shutdown background listener and perform SQLite backup
                    _viewModel.Shutdown();
                }
            }
        }
    }
}
