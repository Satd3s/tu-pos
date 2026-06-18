using System.Windows.Input;
using TuPos.App.Models;
using TuPos.App.Services;

namespace TuPos.App.ViewModels
{
    public class MainViewModel : ViewModelBase
    {
        private readonly User _currentUser;
        private readonly DatabaseService _dbService;
        private readonly MobileScannerService _scannerService;
        
        private object _currentView;

        // ViewModels
        public POSViewModel POSVM { get; }
        public InventoryViewModel InventoryVM { get; }
        public CustomersViewModel CustomersVM { get; }
        public SuppliersViewModel SuppliersVM { get; }
        public ReportsViewModel ReportsVM { get; }
        public SettingsViewModel SettingsVM { get; }

        public MainViewModel(User currentUser)
        {
            _currentUser = currentUser;
            
            // Core Services
            _dbService = new DatabaseService();
            _scannerService = new MobileScannerService(_dbService);
            
            // Start scanner service automatically
            _scannerService.Start();

            // Instantiate child ViewModels
            POSVM = new POSViewModel(_dbService, _scannerService);
            InventoryVM = new InventoryViewModel(_dbService);
            CustomersVM = new CustomersViewModel(_dbService);
            SuppliersVM = new SuppliersViewModel(_dbService);
            ReportsVM = new ReportsViewModel(_dbService);
            SettingsVM = new SettingsViewModel(_scannerService);

            // Default active view is POS (Ventas)
            _currentView = POSVM;

            // Navigation Commands
            ShowPosCommand = new RelayCommand(() => CurrentView = POSVM);
            ShowInventoryCommand = new RelayCommand(() => { InventoryVM.LoadProducts(); CurrentView = InventoryVM; });
            ShowCustomersCommand = new RelayCommand(() => { CustomersVM.LoadCustomers(); CurrentView = CustomersVM; });
            ShowSuppliersCommand = new RelayCommand(() => { SuppliersVM.LoadSuppliers(); CurrentView = SuppliersVM; });
            ShowReportsCommand = new RelayCommand(() => { ReportsVM.LoadStats(); CurrentView = ReportsVM; });
            ShowSettingsCommand = new RelayCommand(() => CurrentView = SettingsVM);
        }

        public string CashierName => _currentUser.FullName;
        public string CashierRole => _currentUser.Role == "admin" ? "Administrador" : "Cajero";
        public bool IsAdmin => _currentUser.Role == "admin";

        public object CurrentView
        {
            get => _currentView;
            set => SetProperty(ref _currentView, value);
        }

        public ICommand ShowPosCommand { get; }
        public ICommand ShowInventoryCommand { get; }
        public ICommand ShowCustomersCommand { get; }
        public ICommand ShowSuppliersCommand { get; }
        public ICommand ShowReportsCommand { get; }
        public ICommand ShowSettingsCommand { get; }

        public void Shutdown()
        {
            // Stop background services gracefully
            _scannerService.Stop();
            // Perform final WAL checkpoint & backup database
            _dbService.BackupDatabase();
        }
    }
}
