using System;

namespace TuPos.App.Models
{
    public class CustomerCredit
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string Type { get; set; } = "charge"; // 'charge', 'payment'
        public decimal Amount { get; set; }
        public int? SaleId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public string User { get; set; } = string.Empty;
        public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
    }
}
