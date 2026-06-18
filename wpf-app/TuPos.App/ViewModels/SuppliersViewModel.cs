using System;
using System.Collections.ObjectModel;
using TuPos.App.Models;
using TuPos.App.Services;

namespace TuPos.App.ViewModels
{
    public class SuppliersViewModel : ViewModelBase
    {
        private readonly DatabaseService _dbService;

        public ObservableCollection<Supplier> Suppliers { get; } = new();

        public SuppliersViewModel(DatabaseService dbService)
        {
            _dbService = dbService;
            LoadSuppliers();
        }

        public void LoadSuppliers()
        {
            Suppliers.Clear();
            try
            {
                using (var conn = _dbService.GetConnection())
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT * FROM suppliers WHERE active = 1 ORDER BY name";
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            Suppliers.Add(new Supplier
                            {
                                Id = Convert.ToInt32(reader["id"]),
                                Name = Convert.ToString(reader["name"]) ?? string.Empty,
                                Contact = Convert.ToString(reader["contact"]) ?? string.Empty,
                                Phone = Convert.ToString(reader["phone"]) ?? string.Empty,
                                Email = Convert.ToString(reader["email"]) ?? string.Empty,
                                Address = Convert.ToString(reader["address"]) ?? string.Empty,
                                Notes = Convert.ToString(reader["notes"]) ?? string.Empty
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to load suppliers: {ex.Message}");
            }
        }
    }
}
