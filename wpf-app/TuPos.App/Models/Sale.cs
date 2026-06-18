using System;
using System.Collections.Generic;

namespace TuPos.App.Models
{
    public class Sale
    {
        public int Id { get; set; }
        public string Folio { get; set; } = string.Empty;
        public int? ShiftId { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Tax { get; set; } = 0;
        public decimal Discount { get; set; } = 0;
        public decimal Total { get; set; }
        public string PaymentMethod { get; set; } = "cash"; // 'cash', 'card', 'transfer', 'credit', 'mixed'
        public decimal? CashReceived { get; set; }
        public decimal? ChangeGiven { get; set; }
        public string Status { get; set; } = "completed"; // 'completed', 'cancelled', 'pending'
        public string? CancelledAt { get; set; }
        public string? CancelledReason { get; set; }
        public string Notes { get; set; } = string.Empty;
        public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        public decimal CardReceived { get; set; } = 0;

        // Relation
        public List<SaleItem> Items { get; set; } = new();
    }
}
