using System;

namespace TuPos.App.Models
{
    public class Customer
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Rfc { get; set; } = string.Empty;
        public decimal CreditLimit { get; set; } = 0;
        public decimal CurrentBalance { get; set; } = 0;
        public int AllowCredit { get; set; } = 0; // 0 = No, 1 = Yes
        public string Notes { get; set; } = string.Empty;
        public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        public string UpdatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        public int Active { get; set; } = 1;

        public decimal CreditAvailable => CreditLimit - CurrentBalance;
    }
}
