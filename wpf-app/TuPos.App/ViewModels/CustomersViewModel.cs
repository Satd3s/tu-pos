using System;
using System.Collections.ObjectModel;
using TuPos.App.Models;
using TuPos.App.Services;

namespace TuPos.App.ViewModels
{
    public class CustomersViewModel : ViewModelBase
    {
        private readonly DatabaseService _dbService;

        public ObservableCollection<Customer> Customers { get; } = new();

        public CustomersViewModel(DatabaseService dbService)
        {
            _dbService = dbService;
            LoadCustomers();
        }

        public void LoadCustomers()
        {
            Customers.Clear();
            try
            {
                using (var conn = _dbService.GetConnection())
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT * FROM customers WHERE active = 1 ORDER BY name";
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            Customers.Add(new Customer
                            {
                                Id = Convert.ToInt32(reader["id"]),
                                Code = Convert.ToString(reader["code"]) ?? string.Empty,
                                Name = Convert.ToString(reader["name"]) ?? string.Empty,
                                Phone = Convert.ToString(reader["phone"]) ?? string.Empty,
                                Email = Convert.ToString(reader["email"]) ?? string.Empty,
                                CreditLimit = Convert.ToDecimal(reader["credit_limit"]),
                                CurrentBalance = Convert.ToDecimal(reader["current_balance"]),
                                AllowCredit = Convert.ToInt32(reader["allow_credit"]),
                                Notes = Convert.ToString(reader["notes"]) ?? string.Empty
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to load customers: {ex.Message}");
            }
        }
    }
}
