using System;
using System.Collections.ObjectModel;
using System.Windows.Input;
using TuPos.App.Models;
using TuPos.App.Services;

namespace TuPos.App.ViewModels
{
    public class InventoryViewModel : ViewModelBase
    {
        private readonly DatabaseService _dbService;
        private Product? _selectedProduct;

        public ObservableCollection<Product> Products { get; } = new();

        public InventoryViewModel(DatabaseService dbService)
        {
            _dbService = dbService;
            LoadProductsCommand = new RelayCommand(LoadProducts);
            LoadProducts();
        }

        public Product? SelectedProduct
        {
            get => _selectedProduct;
            set => SetProperty(ref _selectedProduct, value);
        }

        public ICommand LoadProductsCommand { get; }

        public void LoadProducts()
        {
            Products.Clear();
            try
            {
                using (var conn = _dbService.GetConnection())
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT * FROM products WHERE active = 1 ORDER BY name";
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            Products.Add(new Product
                            {
                                Id = Convert.ToInt32(reader["id"]),
                                Code = Convert.ToString(reader["code"]) ?? string.Empty,
                                Name = Convert.ToString(reader["name"]) ?? string.Empty,
                                Description = Convert.ToString(reader["description"]) ?? string.Empty,
                                Category = Convert.ToString(reader["category"]) ?? "General",
                                Stock = Convert.ToDouble(reader["stock"]),
                                MinStock = Convert.ToDouble(reader["min_stock"]),
                                MaxStock = Convert.ToDouble(reader["max_stock"]),
                                PurchaseCost = Convert.ToDecimal(reader["purchase_cost"]),
                                PublicPrice = Convert.ToDecimal(reader["public_price"]),
                                Unit = Convert.ToString(reader["unit"]) ?? "pieza"
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to load products: {ex.Message}");
            }
        }
    }
}
