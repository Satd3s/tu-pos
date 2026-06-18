using System;
using System.Windows.Input;
using TuPos.App.Models;
using TuPos.App.Services;

namespace TuPos.App.ViewModels
{
    public class LoginViewModel : ViewModelBase
    {
        private readonly DatabaseService _dbService;
        private string _username = string.Empty;
        private string _password = string.Empty;
        private string _pin = string.Empty;
        private string _errorMessage = string.Empty;

        public event Action<User>? LoginSuccessful;

        public LoginViewModel(DatabaseService dbService)
        {
            _dbService = dbService;
            LoginCommand = new RelayCommand(ExecuteLogin, CanExecuteLogin);
            LoginByPinCommand = new RelayCommand(ExecuteLoginByPin, CanExecuteLoginByPin);
        }

        public string Username
        {
            get => _username;
            set
            {
                if (SetProperty(ref _username, value))
                {
                    ErrorMessage = string.Empty;
                }
            }
        }

        public string Password
        {
            get => _password;
            set
            {
                if (SetProperty(ref _password, value))
                {
                    ErrorMessage = string.Empty;
                }
            }
        }

        public string Pin
        {
            get => _pin;
            set
            {
                if (SetProperty(ref _pin, value))
                {
                    ErrorMessage = string.Empty;
                    // Auto-login when PIN is exactly 4 digits
                    if (_pin.Length == 4)
                    {
                        ExecuteLoginByPin();
                    }
                }
            }
        }

        public string ErrorMessage
        {
            get => _errorMessage;
            set => SetProperty(ref _errorMessage, value);
        }

        public ICommand LoginCommand { get; }
        public ICommand LoginByPinCommand { get; }

        private bool CanExecuteLogin()
        {
            return !string.IsNullOrEmpty(Username) && !string.IsNullOrEmpty(Password);
        }

        private void ExecuteLogin()
        {
            try
            {
                var user = _dbService.Authenticate(Username, Password);
                if (user != null)
                {
                    LoginSuccessful?.Invoke(user);
                }
                else
                {
                    ErrorMessage = "Credenciales incorrectas.";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error de base de datos: {ex.Message}";
            }
        }

        private bool CanExecuteLoginByPin()
        {
            return !string.IsNullOrEmpty(Pin) && Pin.Length == 4;
        }

        private void ExecuteLoginByPin()
        {
            try
            {
                var user = _dbService.AuthenticateByPin(Pin);
                if (user != null)
                {
                    LoginSuccessful?.Invoke(user);
                }
                else
                {
                    ErrorMessage = "PIN incorrecto.";
                    Pin = string.Empty; // Clear PIN on error
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error: {ex.Message}";
            }
        }
    }
}
