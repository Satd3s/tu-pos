using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows.Input;
using TuPos.App.Models;
using TuPos.App.Services;

namespace TuPos.App.ViewModels
{
    public class CartItem : ViewModelBase
    {
        private double _quantity;
        private decimal _subtotal;

        public Product Product { get; set; } = null!;
        public string Code => Product.Code;
        public string Name => Product.Name;
        public decimal UnitPrice => Product.PublicPrice;
        public string Unit => Product.Unit;

        public double Quantity
        {
            get => _quantity;
            set
            {
                if (SetProperty(ref _quantity, value))
                {
                    RecalculateSubtotal();
                }
            }
        }

        public decimal Subtotal
        {
            get => _subtotal;
            private set => SetProperty(ref _subtotal, value);
        }

        public void RecalculateSubtotal()
        {
            Subtotal = UnitPrice * (decimal)Quantity;
        }
    }

    public class POSViewModel : ViewModelBase
    {
        private readonly DatabaseService _dbService;
        private readonly MobileScannerService _scannerService;
        private string _searchQuery = string.Empty;
        private decimal _total = 0;
        private string _checkoutMessage = string.Empty;

        public ObservableCollection<CartItem> Cart { get; } = new();

        public POSViewModel(DatabaseService dbService, MobileScannerService scannerService)
        {
            _dbService = dbService;
            _scannerService = scannerService;

            // Subscribe to mobile scanner events
            _scannerService.BarcodeScanned += OnBarcodeScannedFromMobile;

            AddToCartCommand = new RelayCommand<string>(ExecuteAddToCart);
            RemoveFromCartCommand = new RelayCommand<CartItem>(ExecuteRemoveFromCart);
            CheckoutCommand = new RelayCommand(ExecuteCheckout, CanExecuteCheckout);
            ClearCartCommand = new RelayCommand(ExecuteClearCart);
        }

        public string SearchQuery
        {
            get => _searchQuery;
            set => SetProperty(ref _searchQuery, value);
        }

        public decimal Total
        {
            get => _total;
            private set => SetProperty(ref _total, value);
        }

        public string CheckoutMessage
        {
            get => _checkoutMessage;
            set => SetProperty(ref _checkoutMessage, value);
        }

        public ICommand AddToCartCommand { get; }
        public ICommand RemoveFromCartCommand { get; }
        public ICommand CheckoutCommand { get; }
        public ICommand ClearCartCommand { get; }

        private void OnBarcodeScannedFromMobile(string barcode)
        {
            // Run on UI thread to update collections safely
            System.Windows.Application.Current.Dispatcher.Invoke(() =>
            {
                ExecuteAddToCart(barcode);
            });
        }

        private void ExecuteAddToCart(string? code)
        {
            if (string.IsNullOrEmpty(code)) return;

            // Look up product in local database
            Product? prod = null;
            using (var conn = _dbService.GetConnection())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT * FROM products WHERE code = @code AND active = 1";
                cmd.Parameters.AddWithValue("@code", code);
                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        prod = new Product
                        {
                            Id = Convert.ToInt32(reader["id"]),
                            Code = Convert.ToString(reader["code"]) ?? string.Empty,
                            Name = Convert.ToString(reader["name"]) ?? string.Empty,
                            PublicPrice = Convert.ToDecimal(reader["public_price"]),
                            PurchaseCost = Convert.ToDecimal(reader["purchase_cost"]),
                            Stock = Convert.ToDouble(reader["stock"]),
                            Unit = Convert.ToString(reader["unit"]) ?? "pieza"
                        };
                    }
                }
            }

            if (prod != null)
            {
                // Check if already in cart
                var existingItem = Cart.FirstOrDefault(i => i.Code == prod.Code);
                if (existingItem != null)
                {
                    existingItem.Quantity += 1;
                }
                else
                {
                    Cart.Add(new CartItem { Product = prod, Quantity = 1 });
                }
                RecalculateTotal();
                CheckoutMessage = string.Empty;
            }
            else
            {
                CheckoutMessage = $"Código '{code}' no encontrado en inventario.";
            }

            SearchQuery = string.Empty;
        }

        private void ExecuteRemoveFromCart(CartItem? item)
        {
            if (item != null)
            {
                Cart.Remove(item);
                RecalculateTotal();
            }
        }

        private void ExecuteClearCart()
        {
            Cart.Clear();
            RecalculateTotal();
            CheckoutMessage = string.Empty;
        }

        private void RecalculateTotal()
        {
            Total = Cart.Sum(item => item.Subtotal);
        }

        private bool CanExecuteCheckout()
        {
            return Cart.Count > 0;
        }

        private void ExecuteCheckout()
        {
            // Simple synchronous checkout transaction mapping to database
            string folio = "V-" + DateTime.Now.ToString("yyyyMMdd-HHmmss");
            
            using (var conn = _dbService.GetConnection())
            using (var tx = conn.BeginTransaction())
            {
                try
                {
                    // 1. Insert Sale header
                    int saleId = 0;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.Transaction = tx;
                        cmd.CommandText = @"
                            INSERT INTO sales (folio, subtotal, tax, discount, total, payment_method, status)
                            VALUES (@folio, @subtotal, 0, 0, @total, 'cash', 'completed');
                            SELECT last_insert_rowid();";
                        cmd.Parameters.AddWithValue("@folio", folio);
                        cmd.Parameters.AddWithValue("@subtotal", Total);
                        cmd.Parameters.AddWithValue("@total", Total);
                        saleId = Convert.ToInt32(cmd.ExecuteScalar());
                    }

                    // 2. Insert items and decrement stock
                    foreach (var item in Cart)
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tx;
                            cmd.CommandText = @"
                                INSERT INTO sale_items (sale_id, product_id, product_code, product_name, quantity, unit_price, subtotal)
                                VALUES (@saleId, @prodId, @code, @name, @qty, @price, @subtotal)";
                            cmd.Parameters.AddWithValue("@saleId", saleId);
                            cmd.Parameters.AddWithValue("@prodId", item.Product.Id);
                            cmd.Parameters.AddWithValue("@code", item.Code);
                            cmd.Parameters.AddWithValue("@name", item.Name);
                            cmd.Parameters.AddWithValue("@qty", item.Quantity);
                            cmd.Parameters.AddWithValue("@price", item.UnitPrice);
                            cmd.Parameters.AddWithValue("@subtotal", item.Subtotal);
                            cmd.ExecuteNonQuery();
                        }

                        // Decrement stock
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tx;
                            cmd.CommandText = "UPDATE products SET stock = stock - @qty, updated_at = CURRENT_TIMESTAMP WHERE id = @id";
                            cmd.Parameters.AddWithValue("@qty", item.Quantity);
                            cmd.Parameters.AddWithValue("@id", item.Product.Id);
                            cmd.ExecuteNonQuery();
                        }

                        // Save Movement entry
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tx;
                            cmd.CommandText = @"
                                INSERT INTO movements (product_id, type, quantity, reason, reference, user, notes)
                                VALUES (@prodId, 'exit', @qty, 'Venta', @ref, 'Cajero', 'Venta registrada')";
                            cmd.Parameters.AddWithValue("@prodId", item.Product.Id);
                            cmd.Parameters.AddWithValue("@qty", item.Quantity);
                            cmd.Parameters.AddWithValue("@ref", folio);
                            cmd.ExecuteNonQuery();
                        }
                    }

                    tx.Commit();
                    
                    CheckoutMessage = $"Venta cobrada con éxito. Folio: {folio}";
                    Cart.Clear();
                    RecalculateTotal();
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    CheckoutMessage = $"Error al procesar cobro: {ex.Message}";
                }
            }
        }
    }
}
