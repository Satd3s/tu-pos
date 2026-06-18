using System;
using TuPos.App.Services;

namespace TuPos.App.ViewModels
{
    public class ReportsViewModel : ViewModelBase
    {
        private readonly DatabaseService _dbService;
        private int _totalProducts;
        private decimal _inventoryValue;
        private int _lowStockProducts;
        private decimal _dailySalesTotal;

        public ReportsViewModel(DatabaseService dbService)
        {
            _dbService = dbService;
            LoadStats();
        }

        public int TotalProducts
        {
            get => _totalProducts;
            set => SetProperty(ref _totalProducts, value);
        }

        public decimal InventoryValue
        {
            get => _inventoryValue;
            set => SetProperty(ref _inventoryValue, value);
        }

        public int LowStockProducts
        {
            get => _lowStockProducts;
            set => SetProperty(ref _lowStockProducts, value);
        }

        public decimal DailySalesTotal
        {
            get => _dailySalesTotal;
            set => SetProperty(ref _dailySalesTotal, value);
        }

        public void LoadStats()
        {
            try
            {
                using (var conn = _dbService.GetConnection())
                {
                    // 1. Total Products
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT COUNT(*) FROM products WHERE active = 1";
                        TotalProducts = Convert.ToInt32(cmd.ExecuteScalar());
                    }

                    // 2. Inventory Value
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT SUM(stock * purchase_cost) FROM products WHERE active = 1";
                        var val = cmd.ExecuteScalar();
                        InventoryValue = val != DBNull.Value && val != null ? Convert.ToDecimal(val) : 0;
                    }

                    // 3. Low stock count
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT COUNT(*) FROM products WHERE active = 1 AND stock <= min_stock";
                        LowStockProducts = Convert.ToInt32(cmd.ExecuteScalar());
                    }

                    // 4. Daily Sales
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT SUM(total) FROM sales WHERE DATE(created_at) = DATE('now', 'localtime') AND status = 'completed'";
                        var val = cmd.ExecuteScalar();
                        DailySalesTotal = val != DBNull.Value && val != null ? Convert.ToDecimal(val) : 0;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to load report stats: {ex.Message}");
            }
        }
    }
}
