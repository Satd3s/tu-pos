using System;

namespace TuPos.App.Models
{
    public class Shift
    {
        public int Id { get; set; }
        public decimal InitialFund { get; set; } = 0;
        public decimal TotalSales { get; set; } = 0;
        public decimal TotalCash { get; set; } = 0;
        public decimal TotalCard { get; set; } = 0;
        public decimal TotalTransfer { get; set; } = 0;
        public decimal TotalCredit { get; set; } = 0;
        public int SalesCount { get; set; } = 0;
        public string Status { get; set; } = "open"; // 'open', 'closed'
        public string OpenedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        public string? ClosedAt { get; set; }
        public int? UserId { get; set; }
        public string User { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }
}
