using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using TuPos.App.ViewModels;

namespace TuPos.App.Views
{
    public partial class POSView : UserControl
    {
        public POSView()
        {
            InitializeComponent();
            
            Loaded += (s, e) =>
            {
                // Register global window KeyDown event for F12 shortcut
                var parentWindow = Window.GetWindow(this);
                if (parentWindow != null)
                {
                    parentWindow.KeyDown += ParentWindow_KeyDown;
                }
                TxtSearch.Focus();
            };

            Unloaded += (s, e) =>
            {
                var parentWindow = Window.GetWindow(this);
                if (parentWindow != null)
                {
                    parentWindow.KeyDown -= ParentWindow_KeyDown;
                }
            };
        }

        private void ParentWindow_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.F12)
            {
                if (DataContext is POSViewModel vm && vm.CheckoutCommand.CanExecute(null))
                {
                    vm.CheckoutCommand.Execute(null);
                    e.Handled = true;
                }
            }
        }

        private void TxtSearch_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                if (DataContext is POSViewModel vm)
                {
                    string code = TxtSearch.Text;
                    if (!string.IsNullOrEmpty(code))
                    {
                        vm.AddToCartCommand.Execute(code);
                        TxtSearch.Text = string.Empty;
                        e.Handled = true;
                    }
                }
            }
        }
    }
}
