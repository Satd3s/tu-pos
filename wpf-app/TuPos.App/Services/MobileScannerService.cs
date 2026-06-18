using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using TuPos.App.Models;

namespace TuPos.App.Services
{
    public class MobileScannerService
    {
        private HttpListener? _listener;
        private readonly DatabaseService _dbService;
        private readonly int _port;
        private readonly string _authToken;
        private bool _isRunning;
        private Thread? _listenerThread;

        public event Action<string>? BarcodeScanned;
        public event Action<Product>? ProductSaved;

        public MobileScannerService(DatabaseService dbService, int port = 5555)
        {
            _dbService = dbService;
            _port = port;
            _authToken = GenerateSimpleToken();
        }

        public string AuthToken => _authToken;
        public int Port => _port;
        public bool IsRunning => _isRunning;

        private string GenerateSimpleToken()
        {
            var bytes = new byte[4];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            return Convert.ToHexString(bytes).ToLower();
        }

        public string GetLocalIp()
        {
            try
            {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint? endPoint = socket.LocalEndPoint as IPEndPoint;
                    return endPoint?.Address.ToString() ?? "127.0.0.1";
                }
            }
            catch
            {
                return "127.0.0.1";
            }
        }

        public string GetUrl()
        {
            string ip = GetLocalIp();
            return $"http://{ip}:{_port}/?token={_authToken}";
        }

        public void Start()
        {
            if (_isRunning) return;

            _listener = new HttpListener();
            _listener.Prefixes.Add($"http://*:{_port}/");
            
            try
            {
                _listener.Start();
                _isRunning = true;

                _listenerThread = new Thread(ListenLoop)
                {
                    IsBackground = true,
                    Name = "MobileScannerHttpListener"
                };
                _listenerThread.Start();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] HttpListener failed to start: {ex.Message}");
                _isRunning = false;
            }
        }

        public void Stop()
        {
            _isRunning = false;
            try
            {
                _listener?.Stop();
                _listener?.Close();
            }
            catch { }
        }

        private async void ListenLoop()
        {
            while (_isRunning && _listener != null)
            {
                try
                {
                    HttpListenerContext context = await _listener.GetContextAsync();
                    _ = Task.Run(() => HandleRequest(context)); // Handle request in threadpool
                }
                catch
                {
                    // Thread closed
                }
            }
        }

        private void HandleRequest(HttpListenerContext context)
        {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = (int)HttpStatusCode.OK;
                response.Close();
                return;
            }

            try
            {
                string rawUrl = request.RawUrl ?? "/";
                string token = request.QueryString["token"] ?? "";

                // 1. Static Index Handler
                if (rawUrl == "/" || rawUrl.StartsWith("/?"))
                {
                    bool authorized = token == _authToken;
                    string html = GetHtmlContent(authorized);
                    SendHtmlResponse(response, html);
                    return;
                }

                // 2. Api Handlers (Requires Token Authorization)
                if (!AuthorizeRequest(request))
                {
                    SendJsonResponse(response, new { success = false, error = "Unauthorized" }, HttpStatusCode.Unauthorized);
                    return;
                }

                if (rawUrl.StartsWith("/api/ping"))
                {
                    SendJsonResponse(response, new { success = true });
                }
                else if (rawUrl.StartsWith("/api/product/save") && request.HttpMethod == "POST")
                {
                    HandleSaveProduct(request, response);
                }
                else if (rawUrl.StartsWith("/api/product/"))
                {
                    string barcode = rawUrl.Substring("/api/product/".Length);
                    int queryIndex = barcode.IndexOf('?');
                    if (queryIndex >= 0) barcode = barcode.Substring(0, queryIndex);

                    HandleGetProduct(barcode, response);
                }
                else if (rawUrl.StartsWith("/api/catalog/"))
                {
                    string barcode = rawUrl.Substring("/api/catalog/".Length);
                    int queryIndex = barcode.IndexOf('?');
                    if (queryIndex >= 0) barcode = barcode.Substring(0, queryIndex);

                    HandleGetCatalogProduct(barcode, response);
                }
                else
                {
                    SendJsonResponse(response, new { success = false, error = "Not Found" }, HttpStatusCode.NotFound);
                }
            }
            catch (Exception ex)
            {
                SendJsonResponse(response, new { success = false, error = ex.Message }, HttpStatusCode.InternalServerError);
            }
        }

        private bool AuthorizeRequest(HttpListenerRequest request)
        {
            string token = request.QueryString["token"] ?? "";
            return token == _authToken;
        }

        private void HandleGetProduct(string barcode, HttpListenerResponse response)
        {
            // Fire event to notify GUI that barcode was read
            BarcodeScanned?.Invoke(barcode);

            using (var conn = _dbService.GetConnection())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT * FROM products WHERE code = @code AND active = 1";
                cmd.Parameters.AddWithValue("@code", barcode);

                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        var prod = new
                        {
                            id = Convert.ToInt32(reader["id"]),
                            code = Convert.ToString(reader["code"]),
                            name = Convert.ToString(reader["name"]),
                            description = Convert.ToString(reader["description"]),
                            public_price = Convert.ToDouble(reader["public_price"]),
                            purchase_cost = Convert.ToDouble(reader["purchase_cost"]),
                            stock = Convert.ToDouble(reader["stock"]),
                            category = Convert.ToString(reader["category"])
                        };
                        SendJsonResponse(response, new { success = true, data = prod });
                        return;
                    }
                }
            }
            SendJsonResponse(response, new { success = false, error = "Not found" });
        }

        private void HandleGetCatalogProduct(string barcode, HttpListenerResponse response)
        {
            using (var conn = _dbService.GetConnection())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT * FROM product_catalog WHERE code = @code";
                cmd.Parameters.AddWithValue("@code", barcode);

                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        var prod = new
                        {
                            code = Convert.ToString(reader["code"]),
                            nombre = Convert.ToString(reader["name"]),
                            description = Convert.ToString(reader["description"])
                        };
                        SendJsonResponse(response, new { success = true, found = true, data = prod });
                        return;
                    }
                }
            }
            SendJsonResponse(response, new { success = true, found = false });
        }

        private void HandleSaveProduct(HttpListenerRequest request, HttpListenerResponse response)
        {
            using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
            {
                string json = reader.ReadToEnd();
                using (JsonDocument doc = JsonDocument.Parse(json))
                {
                    JsonElement root = doc.RootElement;
                    string barcode = root.GetProperty("barcode").GetString() ?? "";
                    string name = root.GetProperty("name").GetString() ?? "";
                    double salePrice = root.GetProperty("sale_price").GetDouble();
                    double purchasePrice = root.GetProperty("purchase_price").GetDouble();
                    double stock = root.GetProperty("stock").GetDouble();

                    if (string.IsNullOrEmpty(barcode) || string.IsNullOrEmpty(name))
                    {
                        SendJsonResponse(response, new { success = false, error = "Code and name required" }, HttpStatusCode.BadRequest);
                        return;
                    }

                    int productId = 0;
                    Product product = new Product
                    {
                        Code = barcode,
                        Name = name,
                        PublicPrice = (decimal)salePrice,
                        PurchaseCost = (decimal)purchasePrice,
                        Stock = stock
                    };

                    using (var conn = _dbService.GetConnection())
                    {
                        // Check if exists
                        using (var checkCmd = conn.CreateCommand())
                        {
                            checkCmd.CommandText = "SELECT id, category, min_stock, max_stock, unit FROM products WHERE code = @code";
                            checkCmd.Parameters.AddWithValue("@code", barcode);
                            using (var checkReader = checkCmd.ExecuteReader())
                            {
                                if (checkReader.Read())
                                {
                                    productId = Convert.ToInt32(checkReader["id"]);
                                    product.Id = productId;
                                    product.Category = Convert.ToString(checkReader["category"]) ?? "General";
                                    product.MinStock = Convert.ToDouble(checkReader["min_stock"]);
                                    product.MaxStock = Convert.ToDouble(checkReader["max_stock"]);
                                    product.Unit = Convert.ToString(checkReader["unit"]) ?? "pieza";
                                }
                            }
                        }

                        using (var tx = conn.BeginTransaction())
                        {
                            try
                            {
                                using (var saveCmd = conn.CreateCommand())
                                {
                                    saveCmd.Transaction = tx;
                                    if (productId > 0)
                                    {
                                        saveCmd.CommandText = @"
                                            UPDATE products 
                                            SET name = @name, public_price = @price, purchase_cost = @cost, stock = @stock, updated_at = CURRENT_TIMESTAMP
                                            WHERE id = @id";
                                        saveCmd.Parameters.AddWithValue("@id", productId);
                                    }
                                    else
                                    {
                                        saveCmd.CommandText = @"
                                            INSERT INTO products (code, name, public_price, purchase_cost, stock, category, unit, active)
                                            VALUES (@code, @name, @price, @cost, @stock, 'General', 'pieza', 1);
                                            SELECT last_insert_rowid();";
                                        saveCmd.Parameters.AddWithValue("@code", barcode);
                                    }

                                    saveCmd.Parameters.AddWithValue("@name", name);
                                    saveCmd.Parameters.AddWithValue("@price", salePrice);
                                    saveCmd.Parameters.AddWithValue("@cost", purchasePrice);
                                    saveCmd.Parameters.AddWithValue("@stock", stock);

                                    if (productId > 0)
                                    {
                                        saveCmd.ExecuteNonQuery();
                                    }
                                    else
                                    {
                                        productId = Convert.ToInt32(saveCmd.ExecuteScalar());
                                        product.Id = productId;
                                    }
                                }

                                // Create Stock entry movement
                                using (var moveCmd = conn.CreateCommand())
                                {
                                    moveCmd.Transaction = tx;
                                    moveCmd.CommandText = @"
                                        INSERT INTO movements (product_id, type, quantity, reason, reference, user, notes)
                                        VALUES (@prodId, 'adjustment', @qty, 'Escáner Móvil', 'Celular', 'Celular', 'Ajuste rápido desde móvil')";
                                    moveCmd.Parameters.AddWithValue("@prodId", productId);
                                    moveCmd.Parameters.AddWithValue("@qty", stock);
                                    moveCmd.ExecuteNonQuery();
                                }

                                tx.Commit();
                                
                                // Fire Event
                                ProductSaved?.Invoke(product);

                                SendJsonResponse(response, new { success = true });
                            }
                            catch (Exception ex)
                            {
                                tx.Rollback();
                                SendJsonResponse(response, new { success = false, error = ex.Message }, HttpStatusCode.InternalServerError);
                            }
                        }
                    }
                }
            }
        }

        private void SendHtmlResponse(HttpListenerResponse response, string html)
        {
            byte[] buffer = Encoding.UTF8.GetBytes(html);
            response.ContentType = "text/html; charset=utf-8";
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }

        private void SendJsonResponse(HttpListenerResponse response, object data, HttpStatusCode code = HttpStatusCode.OK)
        {
            string json = JsonSerializer.Serialize(data);
            byte[] buffer = Encoding.UTF8.GetBytes(json);
            response.StatusCode = (int)code;
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }

        private string GetHtmlContent(bool authorized)
        {
            // Replaces Flask rendering logic
            string authScreen = authorized ? "hidden" : "";
            string scannerContent = authorized ? "" : "hidden";
            string tokenParam = authorized ? _authToken : "";

            return $@"<!DOCTYPE html>
<html lang=""es"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"">
    <meta name=""theme-color"" content=""#16a34a"">
    <title>Tu POS - Escáner</title>
    <script src=""https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js""></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; min-height: 100vh; color: white; padding-bottom: 40px; }}
        .header {{ background: linear-gradient(135deg, #22c55e, #16a34a); padding: 15px 20px; text-align: center; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }}
        .header h1 {{ font-size: 1.2rem; margin: 0; }}
        .container {{ padding: 15px; max-width: 600px; margin: 0 auto; }}
        
        .camera-box {{ background: #000; border-radius: 16px; overflow: hidden; margin-bottom: 20px; position: relative; aspect-ratio: 4/3; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer; }}
        #cameraVideo {{ width: 100%; height: 100%; object-fit: cover; }}
        .scan-laser {{ position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: scan 2s ease-in-out infinite; opacity: 0.8; }}
        .scan-guide {{ position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 70%; height: 40%; border: 2px solid white; border-radius: 12px; box-shadow: 0 0 0 4000px rgba(0,0,0,0.5); }}
        @keyframes scan {{ 0%,100%{{top:30%;opacity:0}} 50%{{top:70%;opacity:1}} }}
        
        .status-badge {{ position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; color: #fff; backdrop-filter: blur(4px); }}
        .status-badge.active {{ background: rgba(34, 197, 94, 0.8); }}

        .input-group {{ background: #1e293b; border-radius: 16px; padding: 6px; margin-bottom: 15px; display: flex; gap: 8px; }}
        .code-input {{ flex: 1; background: transparent; border: none; padding: 12px; color: white; font-size: 1.1rem; font-weight: bold; outline: none; }}
        
        .btn {{ border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer; }}
        .btn-primary {{ background: #22c55e; color: white; }}
        .btn-danger {{ background: #ef4444; color: white; }}
        .btn-icon {{ padding: 12px; display: flex; align-items: center; justify-content: center; }}
        
        .product-card {{ background: #1e293b; border-radius: 16px; padding: 20px; margin-top: 20px; animation: slideUp 0.3s ease; }}
        @keyframes slideUp {{ from{{transform:translateY(20px);opacity:0}} to{{transform:translateY(0);opacity:1}} }}
        
        .form-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #334155; }}
        .badge {{ padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }}
        .badge-new {{ background: #3b82f6; color: white; }}
        .badge-exists {{ background: #f59e0b; color: black; }}
        
        .field {{ margin-bottom: 15px; }}
        .field label {{ display: block; color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px; }}
        .field input {{ width: 100%; background: #0f172a; border: 1px solid #334155; color: white; padding: 12px; border-radius: 8px; font-size: 1rem; outline: none; }}
        .field-price input {{ font-size: 1.5rem; font-weight: bold; color: #4ade80; }}
        
        .actions {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 25px; }}
        
        .msg-toast {{ position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(100px); background: #333; color: white; padding: 12px 24px; border-radius: 50px; font-size: 0.9rem; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: transform 0.3s; display: flex; align-items: center; gap: 8px; white-space: nowrap; }}
        .msg-toast.show {{ transform: translateX(-50%) translateY(0); }}
        .msg-toast.success {{ background: #22c55e; }}
        .msg-toast.error {{ background: #ef4444; }}

        .auth-screen {{ position: fixed; inset: 0; background: #0f172a; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; }}
        .auth-icon {{ font-size: 3rem; margin-bottom: 20px; color: #94a3b8; }}
        
        #history {{ margin-top: 30px; }}
        .history-item {{ background: #1e293b; padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }}
        .hidden {{ display: none !important; }}
    </style>
</head>
<body>
    <div class=""auth-screen {authScreen}"">
        <div class=""auth-icon"">🔒</div>
        <h2>Acceso Restringido</h2>
        <p style=""color: #64748b; margin: 10px 0 20px;"">Escanea el código QR de ""Tu POS"" para acceder.</p>
    </div>
    
    <div class=""{scannerContent}"">
        <div class=""header"">
            <h1>Tu POS - Escáner Móvil</h1>
        </div>
        
        <div class=""container"">
            <div class=""camera-box"" id=""cameraContainer"" onclick=""initCamera()"">
                <video id=""cameraVideo"" playsinline muted autoplay></video>
                <div class=""scan-guide""></div>
                <div class=""scan-laser""></div>
                <div class=""status-badge"" id=""camStatus"">Reiniciar cámara ↻</div>
            </div>

            <div class=""input-group"">
                <input type=""text"" id=""codeInput"" class=""code-input"" placeholder=""Escanear o escribir..."" inputmode=""numeric"" autocomplete=""off"">
                <button class=""btn btn-primary btn-icon"" id=""btnSearch"">🔍</button>
            </div>

            <div id=""productForm"" class=""product-card hidden"">
                <div class=""form-header"">
                    <span id=""formTitle"">Producto</span>
                    <span id=""formBadge"" class=""badge badge-new"">NUEVO</span>
                </div>
                
                <input type=""hidden"" id=""pBarcode"">
                
                <div class=""field"">
                    <label>Nombre del Producto</label>
                    <input type=""text"" id=""pName"" placeholder=""Ej. Sabritas Sal 45g"">
                </div>
                
                <div class=""field field-price"">
                    <label>Precio Venta</label>
                    <input type=""number"" id=""pPrice"" placeholder=""0.00"" step=""0.50"" inputmode=""decimal"">
                </div>
                
                <div style=""display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"">
                    <div class=""field"">
                        <label>Costo</label>
                        <input type=""number"" id=""pCost"" placeholder=""0.00"" inputmode=""decimal"">
                    </div>
                    <div class=""field"">
                        <label>Stock</label>
                        <input type=""number"" id=""pStock"" value=""1"" inputmode=""numeric"">
                    </div>
                </div>
                
                <div class=""actions"">
                    <button class=""btn btn-danger"" onclick=""resetForm()"">Cancelar</button>
                    <button class=""btn btn-primary"" onclick=""saveProduct()"">Guardar</button>
                </div>
            </div>
            
            <div id=""history""></div>
        </div>
    </div>

    <div id=""toast"" class=""msg-toast""><span>Mensaje</span></div>

    <script>
        const TOKEN = ""{tokenParam}"";
        const API = window.location.origin;
        let isScanning = true;
        let currentStream = null;
        let scanLock = false;
        let lastCode = null;
        
        async function initCamera() {{
            if (currentStream) {{
                currentStream.getTracks().forEach(track => track.stop());
            }}

            const video = document.getElementById('cameraVideo');
            const status = document.getElementById('camStatus');
            status.textContent = ""Conectando..."";
            
            try {{
                const stream = await navigator.mediaDevices.getUserMedia({{ 
                    video: {{ facingMode: 'environment', width: {{ ideal: 1280 }}, aspectRatio: {{ ideal: 4/3 }} }} 
                }});
                currentStream = stream;
                video.srcObject = stream;
                video.setAttribute(""playsinline"", true); 
                try {{ await video.play(); }} catch(e){{}}
                
                status.textContent = ""Activa • Toca para reiniciar"";
                status.classList.add('active');
                
                if ('BarcodeDetector' in window) {{
                    const detector = new BarcodeDetector({{ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] }});
                    const scanLoop = async () => {{
                        if (!currentStream) return;
                        try {{
                            const barcodes = await detector.detect(video);
                            if (barcodes.length > 0) onBarcodeDetected(barcodes[0].rawValue);
                        }} catch (e) {{}}
                        if (currentStream) requestAnimationFrame(scanLoop);
                    }};
                    scanLoop();
                }} 
            }} catch (err) {{
                status.textContent = ""Error: "" + err.message;
            }}
        }}

        document.addEventListener(""visibilitychange"", () => {{
             if (document.visibilityState === 'visible') {{
                 setTimeout(initCamera, 300);
             }}
        }});

        function onBarcodeDetected(code) {{
            if (scanLock || !code || code === lastCode) return;
            scanLock = true;
            lastCode = code;
            if (navigator.vibrate) navigator.vibrate(50);
            
            document.getElementById('codeInput').value = code;
            searchProduct(code);
            setTimeout(() => {{ scanLock = false; }}, 2000); 
            setTimeout(() => {{ lastCode = null; }}, 5000);
        }}
        
        async function searchProduct(code) {{
            if (!code) return;
            showToast(""Buscando..."");
            try {{
                let res = await fetch(`${{API}}/api/product/${{code}}?token=${{TOKEN}}`);
                let json = await res.json();
                if (json.success && json.data) {{
                    fillForm(json.data, false);
                    showToast(""Encontrado"", ""success"");
                    return;
                }}
                fillForm({{ barcode: code }}, true); 
                try {{
                    res = await fetch(`${{API}}/api/catalog/${{code}}?token=${{TOKEN}}`);
                    let cat = await res.json();
                    if (cat.success && cat.found && cat.data) {{
                        document.getElementById('pName').value = cat.data.nombre || '';
                        document.getElementById('formBadge').textContent = ""CATÁLOGO"";
                        document.getElementById('formBadge').className = ""badge badge-new"";
                        showToast(""Encontrado en Catálogo"", ""success"");
                    }}
                }} catch(e) {{}}
            }} catch (err) {{
                showToast(""Error red"", ""error"");
            }}
        }}
        
        function fillForm(data, isNew) {{
            const form = document.getElementById('productForm');
            form.classList.remove('hidden');
            form.scrollIntoView({{ behavior: 'smooth' }});
            document.getElementById('pBarcode').value = data.code || data.barcode || '';
            document.getElementById('pName').value = data.name || '';
            
            const price = data.public_price !== undefined ? data.public_price : '';
            const cost = data.purchase_cost !== undefined ? data.purchase_cost : '';
            
            document.getElementById('pPrice').value = price;
            document.getElementById('pCost').value = cost;
            document.getElementById('pStock').value = data.stock !== undefined ? data.stock : 1;
            
            const badge = document.getElementById('formBadge');
            badge.textContent = isNew ? ""NUEVO"" : ""EDITAR"";
            badge.className = isNew ? ""badge badge-new"" : ""badge badge-exists"";
            document.getElementById('pPrice').focus();
        }}
        
        async function saveProduct() {{
            const data = {{
                token: TOKEN,
                barcode: document.getElementById('pBarcode').value,
                name: document.getElementById('pName').value,
                sale_price: parseFloat(document.getElementById('pPrice').value) || 0,
                purchase_price: parseFloat(document.getElementById('pCost').value) || 0,
                stock: parseFloat(document.getElementById('pStock').value) || 0
            }};
            try {{
                const res = await fetch(`${{API}}/api/product/save?token=${{TOKEN}}`, {{
                    method: 'POST', headers: {{'Content-Type': 'application/json'}}, body: JSON.stringify(data)
                }});
                const json = await res.json();
                if (json.success) {{
                    showToast(""Guardado"", ""success"");
                    resetForm();
                    addToHistory(data);
                }} else showToast(""Error al guardar"", ""error"");
            }} catch(e) {{ showToast(""Error red"", ""error""); }}
        }}
        
        function resetForm() {{
            document.getElementById('productForm').classList.add('hidden');
            document.getElementById('codeInput').value = '';
            document.getElementById('codeInput').focus();
        }}
        
        function addToHistory(p) {{
            const h = document.getElementById('history');
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `<div><strong>${{p.name}}</strong><br><small>${{p.barcode}}</small></div><div style=""color:#4ade80;font-weight:bold"">$${{p.sale_price}}</div>`;
            h.insertBefore(el, h.firstChild);
        }}
        
        function showToast(msg, type='normal') {{
            const t = document.getElementById('toast');
            t.innerHTML = (type==='success'?'✅ ':type==='error'?'❌ ':'') + msg;
            t.className = 'msg-toast show ' + type;
            setTimeout(() => t.className = 'msg-toast', 3000);
        }}
        
        document.getElementById('btnSearch').addEventListener('click', () => searchProduct(document.getElementById('codeInput').value));
        window.addEventListener('load', initCamera);
    </script>
</body>
</html>";
        }
    }
}
