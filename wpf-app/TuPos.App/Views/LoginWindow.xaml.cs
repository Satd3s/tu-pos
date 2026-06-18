using System;
using System.Windows;
using System.Windows.Controls;
using TuPos.App.Models;
using TuPos.App.Services;
using TuPos.App.ViewModels;

namespace TuPos.App.Views
{
    public partial class LoginWindow : Window
    {
        private readonly LoginViewModel _viewModel;

        public LoginWindow()
        {
            InitializeComponent();
            
            // Wire database and viewmodel
            var dbService = new DatabaseService();
            _viewModel = new LoginViewModel(dbService);
            _viewModel.LoginSuccessful += OnLoginSuccessful;
            
            // Set bindings
            DataContext = _viewModel;
            TxtUsername.Focus();
        }

        private void OnLoginSuccessful(User user)
        {
            // Open MainWindow
            var mainWindow = new MainWindow(user);
            mainWindow.Show();
            
            // Close login window
            this.Close();
        }

        private void Tab_Click(object sender, RoutedEventArgs e)
        {
            if (TabPasswordBtn.IsChecked == true)
            {
                PasswordForm.Visibility = Visibility.Visible;
                PinForm.Visibility = Visibility.Collapsed;
                TxtUsername.Focus();
            }
            else if (TabPinBtn.IsChecked == true)
            {
                PasswordForm.Visibility = Visibility.Collapsed;
                PinForm.Visibility = Visibility.Visible;
                _viewModel.Pin = string.Empty;
                TxtPin.Password = string.Empty;
            }
        }

        private void TxtPassword_PasswordChanged(object sender, RoutedEventArgs e)
        {
            if (sender is PasswordBox passwordBox)
            {
                _viewModel.Password = passwordBox.Password;
            }
        }

        private void TxtPin_PasswordChanged(object sender, RoutedEventArgs e)
        {
            if (sender is PasswordBox passwordBox)
            {
                _viewModel.Pin = passwordBox.Password;
            }
        }

        private void BtnLogin_Click(object sender, RoutedEventArgs e)
        {
            _viewModel.Username = TxtUsername.Text;
            if (_viewModel.LoginCommand.CanExecute(null))
            {
                _viewModel.LoginCommand.Execute(null);
            }
            UpdateErrorMessage();
        }

        private void PinPad_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && TxtPin.Password.Length < 4)
            {
                TxtPin.Password += btn.Content.ToString();
            }
            UpdateErrorMessage();
        }

        private void PinPadClear_Click(object sender, RoutedEventArgs e)
        {
            TxtPin.Password = string.Empty;
            _viewModel.Pin = string.Empty;
            UpdateErrorMessage();
        }

        private void PinPadBackspace_Click(object sender, RoutedEventArgs e)
        {
            if (TxtPin.Password.Length > 0)
            {
                TxtPin.Password = TxtPin.Password.Substring(0, TxtPin.Password.Length - 1);
            }
            UpdateErrorMessage();
        }

        private void UpdateErrorMessage()
        {
            TxtError.Text = _viewModel.ErrorMessage;
        }
    }
}
