using System.Windows.Input;
using TuPos.App.Services;

namespace TuPos.App.ViewModels
{
    public class SettingsViewModel : ViewModelBase
    {
        private readonly MobileScannerService _scannerService;
        private string _scannerUrl = string.Empty;
        private string _scannerStatus = string.Empty;
        private bool _isScannerRunning;

        public SettingsViewModel(MobileScannerService scannerService)
        {
            _scannerService = scannerService;
            
            ToggleScannerCommand = new RelayCommand(ExecuteToggleScanner);
            
            UpdateScannerState();
        }

        public string ScannerUrl
        {
            get => _scannerUrl;
            set => SetProperty(ref _scannerUrl, value);
        }

        public string ScannerStatus
        {
            get => _scannerStatus;
            set => SetProperty(ref _scannerStatus, value);
        }

        public bool IsScannerRunning
        {
            get => _isScannerRunning;
            set => SetProperty(ref _isScannerRunning, value);
        }

        public ICommand ToggleScannerCommand { get; }

        private void ExecuteToggleScanner()
        {
            if (_scannerService.IsRunning)
            {
                _scannerService.Stop();
            }
            else
            {
                _scannerService.Start();
            }
            UpdateScannerState();
        }

        private void UpdateScannerState()
        {
            IsScannerRunning = _scannerService.IsRunning;
            if (IsScannerRunning)
            {
                ScannerUrl = _scannerService.GetUrl();
                ScannerStatus = "Servidor Activo • Conéctate escaneando el código o ingresando a la URL.";
            }
            else
            {
                ScannerUrl = "Servidor detenido.";
                ScannerStatus = "Servidor inactivo. Haz clic en 'Activar' para arrancar.";
            }
        }
    }
}
