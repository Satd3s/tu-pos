namespace TuPos.App.Models
{
    public class Product
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "General";
        public string Brand { get; set; } = string.Empty;
        public string PartNumber { get; set; } = string.Empty;
        public string Supplier { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public double Stock { get; set; } = 0;
        public double MinStock { get; set; } = 5;
        public double MaxStock { get; set; } = 100;
        public decimal PurchaseCost { get; set; } = 0;
        public decimal PublicPrice { get; set; } = 0;
        public string Unit { get; set; } = "pieza";
        public int Active { get; set; } = 1;
    }
}
