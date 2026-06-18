using System;

namespace TuPos.App.Models
{
    public class Movement
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string Type { get; set; } = "entry"; // 'entry', 'exit', 'adjustment'
        public double Quantity { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public int? PurchaseId { get; set; }
        public decimal UnitCost { get; set; }
        public string User { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
    }
}
