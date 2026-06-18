namespace TuPos.App.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "cashier";
        public string FullName { get; set; } = string.Empty;
        public string Pin { get; set; } = string.Empty;
        public int Active { get; set; } = 1;
        public string Permissions { get; set; } = "{}";

        public bool IsAdmin => Role == "admin";
    }
}
