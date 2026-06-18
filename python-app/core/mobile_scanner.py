# =============================================================================
# SERVIDOR ESCÁNER MÓVIL - Alta de Productos desde Celular
# Versión 2.1 - Fix Cámara Bloqueo + Seguridad Token + Optimización
# =============================================================================

from flask import Flask, render_template_string, jsonify, request
from flask_cors import CORS
import socket
import threading
import json
import os
import secrets

# Template HTML
MOBILE_SCANNER_HTML = '''
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#16a34a">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>{{ station_name }} - Escáner</title>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; min-height: 100vh; color: white; padding-bottom: 40px; }
        .header { background: linear-gradient(135deg, #22c55e, #16a34a); padding: 15px 20px; text-align: center; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .header h1 { font-size: 1.2rem; margin: 0; }
        .container { padding: 15px; max-width: 600px; margin: 0 auto; }
        
        .camera-box { background: #000; border-radius: 16px; overflow: hidden; margin-bottom: 20px; position: relative; aspect-ratio: 4/3; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        #cameraVideo { width: 100%; height: 100%; object-fit: cover; }
        .scan-laser { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: scan 2s ease-in-out infinite; opacity: 0.8; }
        .scan-guide { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 70%; height: 40%; border: 2px solid white; border-radius: 12px; box-shadow: 0 0 0 4000px rgba(0,0,0,0.5); }
        @keyframes scan { 0%,100%{top:30%;opacity:0} 50%{top:70%;opacity:1} }
        
        .status-badge { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; color: #fff; backdrop-filter: blur(4px); cursor: pointer;}
        .status-badge.active { background: rgba(34, 197, 94, 0.8); }

        .input-group { background: #1e293b; border-radius: 16px; padding: 6px; margin-bottom: 15px; display: flex; gap: 8px; }
        .code-input { flex: 1; background: transparent; border: none; padding: 12px; color: white; font-size: 1.1rem; font-weight: bold; outline: none; }
        
        .btn { border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer; }
        .btn-primary { background: #22c55e; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-icon { padding: 12px; display: flex; align-items: center; justify-content: center; }
        
        .product-card { background: #1e293b; border-radius: 16px; padding: 20px; margin-top: 20px; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        
        .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #334155; }
        .badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
        .badge-new { background: #3b82f6; color: white; }
        .badge-exists { background: #f59e0b; color: black; }
        
        .field { margin-bottom: 15px; }
        .field label { display: block; color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px; }
        .field input { width: 100%; background: #0f172a; border: 1px solid #334155; color: white; padding: 12px; border-radius: 8px; font-size: 1rem; outline: none; transition: border-color 0.2s; }
        .field-price input { font-size: 1.5rem; font-weight: bold; color: #4ade80; }
        
        .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 25px; }
        
        .msg-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(100px); background: #333; color: white; padding: 12px 24px; border-radius: 50px; font-size: 0.9rem; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: transform 0.3s; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .msg-toast.show { transform: translateX(-50%) translateY(0); }
        .msg-toast.success { background: #22c55e; }
        .msg-toast.error { background: #ef4444; }

        .auth-screen { position: fixed; inset: 0; background: #0f172a; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; }
        .auth-icon { font-size: 3rem; margin-bottom: 20px; color: #94a3b8; }
        
        #history { margin-top: 30px; }
        .history-item { background: #1e293b; padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
        .hidden { display: none !important; }
    </style>
</head>
<body>
    {% if not authorized %}
    <div class="auth-screen">
        <div class="auth-icon">🔒</div>
        <h2>Acceso Restringido</h2>
        <p style="color: #64748b; margin: 10px 0 20px;">Escanea el código QR de "Tu POS" para acceder.</p>
    </div>
    {% else %}
    
    <div class="header">
        <h1>{{ station_name }}</h1>
    </div>
    
    <div class="container">
        <!-- Camera View -->
        <div class="camera-box" id="cameraContainer" onclick="initCamera()">
            <video id="cameraVideo" playsinline muted autoplay></video>
            <div class="scan-guide"></div>
            <div class="scan-laser"></div>
            <div class="status-badge" id="camStatus" onclick="event.stopPropagation(); initCamera()">Reiniciar cámara ↻</div>
        </div>

        <!-- Manual Input -->
        <div class="input-group">
            <input type="text" id="codeInput" class="code-input" placeholder="Escanear o escribir..." inputmode="numeric" autocomplete="off">
            <button class="btn btn-primary btn-icon" id="btnSearch">🔍</button>
        </div>

        <!-- Editor Product -->
        <div id="productForm" class="product-card hidden">
            <div class="form-header">
                <span id="formTitle">Producto</span>
                <span id="formBadge" class="badge badge-new">NUEVO</span>
            </div>
            
            <input type="hidden" id="pBarcode">
            
            <div class="field">
                <label>Nombre del Producto</label>
                <input type="text" id="pName" placeholder="Ej. Sabritas Sal 45g">
            </div>
            
            <div class="field field-price">
                <label>Precio Venta</label>
                <input type="number" id="pPrice" placeholder="0.00" step="0.50" inputmode="decimal">
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="field">
                    <label>Costo</label>
                    <input type="number" id="pCost" placeholder="0.00" inputmode="decimal">
                </div>
                <div class="field">
                    <label>Stock</label>
                    <input type="number" id="pStock" value="1" inputmode="numeric">
                </div>
            </div>
            
            <div class="actions">
                <button class="btn btn-danger" onclick="resetForm()">Cancelar</button>
                <button class="btn btn-primary" onclick="saveProduct()">Guardar</button>
            </div>
        </div>
        
        <div id="history"></div>
    </div>

    <!-- Notification -->
    <div id="toast" class="msg-toast"><span>Mensaje</span></div>

    <script>
        const TOKEN = "{{ token }}";
        const API = window.location.origin;
        let isScanning = true;
        let currentStream = null;
        let scanLock = false;
        let lastCode = null;
        
        // --- CAMERA LOGIC (FAST NATIVE + RESTART FIX) ---
        async function initCamera() {
            // Stop old stream if any
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }

            const video = document.getElementById('cameraVideo');
            const status = document.getElementById('camStatus');
            status.textContent = "Conectando...";
            
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment', width: { ideal: 1280 }, aspectRatio: { ideal: 4/3 } } 
                });
                currentStream = stream;
                video.srcObject = stream;
                // Important for iOS and some Androids to resume playback
                video.setAttribute("playsinline", true); 
                try { await video.play(); } catch(e){}
                
                status.textContent = "Activa • Toca para reiniciar";
                status.classList.add('active');
                
                // Native BarcodeDetector (Chrome/Android)
                if ('BarcodeDetector' in window) {
                    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
                    const scanLoop = async () => {
                        if (!currentStream) return;
                        try {
                            const barcodes = await detector.detect(video);
                            if (barcodes.length > 0) onBarcodeDetected(barcodes[0].rawValue);
                        } catch (e) {}
                        if (currentStream) requestAnimationFrame(scanLoop);
                    };
                    scanLoop();
                } 
            } catch (err) {
                status.textContent = "Error: " + err.message;
                showToast("Cámara error: " + err.message, 'error');
            }
        }

        // --- VISIBILITY FIX: Restart camera when unlocking phone ---
        document.addEventListener("visibilitychange", () => {
             if (document.visibilityState === 'visible') {
                 console.log("App visible again, restarting camera...");
                 setTimeout(initCamera, 300);
             }
        });

        function onBarcodeDetected(code) {
            if (scanLock || !code || code === lastCode) return;
            scanLock = true;
            lastCode = code;
            if (navigator.vibrate) navigator.vibrate(50);
            
            document.getElementById('codeInput').value = code;
            searchProduct(code);
            setTimeout(() => { scanLock = false; }, 2000); 
            setTimeout(() => { lastCode = null; }, 5000);
        }
        
        async function searchProduct(code) {
            if (!code) return;
            showToast("Buscando...");
            try {
                let res = await fetch(`${API}/api/product/${code}?token=${TOKEN}`);
                let json = await res.json();
                if (json.success && json.data) {
                    fillForm(json.data, false);
                    showToast("Encontrado", "success");
                    return;
                }
                fillForm({ barcode: code }, true); 
                try {
                    res = await fetch(`${API}/api/catalog/${code}?token=${TOKEN}`);
                    let cat = await res.json();
                    if (cat.success && cat.found && cat.data) {
                        document.getElementById('pName').value = cat.data.nombre || '';
                        document.getElementById('formBadge').textContent = "CATÁLOGO";
                        document.getElementById('formBadge').className = "badge badge-new";
                        showToast("Encontrado en Catálogo", "success");
                    }
                } catch(e) {}
            } catch (err) {
                showToast("Error red", "error");
            }
        }
        
        function fillForm(data, isNew) {
            const form = document.getElementById('productForm');
            form.classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
            document.getElementById('pBarcode').value = data.code || data.barcode || '';
            document.getElementById('pName').value = data.name || '';
            
            // Map keys from SQLite schema (public_price, purchase_cost)
            const price = data.public_price !== undefined ? data.public_price : (data.sale_price || '');
            const cost = data.purchase_cost !== undefined ? data.purchase_cost : (data.purchase_price || '');
            
            document.getElementById('pPrice').value = price;
            document.getElementById('pCost').value = cost;
            document.getElementById('pStock').value = data.stock !== undefined ? data.stock : 1;
            
            const badge = document.getElementById('formBadge');
            badge.textContent = isNew ? "NUEVO" : "EDITAR";
            badge.className = isNew ? "badge badge-new" : "badge badge-exists";
            document.getElementById('pPrice').focus();
        }
        
        async function saveProduct() {
            const data = {
                token: TOKEN,
                barcode: document.getElementById('pBarcode').value,
                name: document.getElementById('pName').value,
                sale_price: parseFloat(document.getElementById('pPrice').value) || 0,
                purchase_price: parseFloat(document.getElementById('pCost').value) || 0,
                stock: parseFloat(document.getElementById('pStock').value) || 0,
                is_new: document.getElementById('formBadge').textContent !== "EDITAR"
            };
            try {
                const res = await fetch(`${API}/api/product/save?token=${TOKEN}`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
                });
                const json = await res.json();
                if (json.success) {
                    showToast("Guardado", "success");
                    resetForm();
                    addToHistory(data);
                } else showToast("Error al guardar", "error");
            } catch(e) { showToast("Error red", "error"); }
        }
        
        function resetForm() {
            document.getElementById('productForm').classList.add('hidden');
            document.getElementById('codeInput').value = '';
            document.getElementById('codeInput').focus();
        }
        function addToHistory(p) {
            const h = document.getElementById('history');
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `<div><strong>${p.name}</strong><br><small>${p.barcode}</small></div><div style="color:#4ade80;font-weight:bold">$${p.sale_price}</div>`;
            h.insertBefore(el, h.firstChild);
        }
        function showToast(msg, type='normal') {
            const t = document.getElementById('toast');
            t.innerHTML = (type==='success'?'✅ ':type==='error'?'❌ ':'') + msg;
            t.className = 'msg-toast show ' + type;
            setTimeout(() => t.className = 'msg-toast', 3000);
        }
        // Init
        document.getElementById('btnSearch').addEventListener('click', () => searchProduct(document.getElementById('codeInput').value));
        window.addEventListener('load', initCamera);
    </script>
    {% endif %}
</body>
</html>
'''

class MobileScannerServer:
    def __init__(self, port=5555):
        self.app = Flask(__name__)
        CORS(self.app)
        self.port = port
        self.server_thread = None
        self.is_running = False
        self.station_name = "Tu POS"
        self.auth_token = secrets.token_hex(4)
        self._setup_routes()
    
    def _setup_routes(self):
        def check_auth():
            token = request.args.get('token')
            if not token and request.is_json: token = request.json.get('token')
            return token == self.auth_token

        @self.app.route('/')
        def index():
            token = request.args.get('token')
            authorized = (token == self.auth_token)
            return render_template_string(MOBILE_SCANNER_HTML, station_name=self.station_name, token=token if authorized else '', authorized=authorized)
        
        @self.app.route('/api/ping')
        def ping(): return jsonify({'success': True})
        
        @self.app.route('/api/product/<barcode>')
        def get_product(barcode):
            if not check_auth(): return jsonify({'success': False, 'error': 'Unauthorized'}), 401
            product = self._find_product(barcode)
            if product: return jsonify({'success': True, 'data': product})
            return jsonify({'success': False, 'error': 'No encontrado'})
        
        @self.app.route('/api/product/save', methods=['POST'])
        def save_product():
            if not check_auth(): return jsonify({'success': False, 'error': 'Unauthorized'}), 401
            return jsonify(self._save_product(request.get_json()))
        
        @self.app.route('/api/catalog/<barcode>')
        def search_catalog(barcode):
            if not check_auth(): return jsonify({'success': False, 'error': 'Unauthorized'}), 401
            data = self._search_catalog(barcode)
            return jsonify({'success': True, 'found': bool(data), 'data': data})
    
    def _search_catalog(self, barcode):
        try:
            import sys
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from api import catalogo_abarrotes
            res = catalogo_abarrotes.buscar_por_codigo(barcode)
            if res.get('success') and res.get('encontrado'): return res.get('data')
        except: pass
        return None
    
    def _find_product(self, barcode):
        try:
            import sys
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from api import products
            res = products.get_by_code(barcode)
            if res.get('success') and res.get('data'):
                return res.get('data')
        except: pass
        return None
    
    def _save_product(self, data):
        try:
            import sys
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from api import products
            
            p_data = {
                'code': data.get('barcode'),
                'name': data.get('name'),
                'public_price': float(data.get('sale_price', 0)),
                'purchase_cost': float(data.get('purchase_price', 0)),
                'stock': float(data.get('stock', 0)),
                'category': 'General',
                'unit': 'pieza'
            }
            
            existing = self._find_product(data.get('barcode'))
            if existing:
                p_data['id'] = existing['id']
                # Merge existing fields so we do not clear them
                p_data['description'] = existing.get('description', '')
                p_data['brand'] = existing.get('brand', '')
                p_data['part_number'] = existing.get('part_number', '')
                p_data['supplier'] = existing.get('supplier', '')
                p_data['location'] = existing.get('location', '')
                p_data['min_stock'] = existing.get('min_stock', 5)
                p_data['max_stock'] = existing.get('max_stock', 100)
                p_data['unit'] = existing.get('unit', 'pieza')
                p_data['category'] = existing.get('category', 'General')
            
            return products.save(p_data)
        except Exception as e: 
            return {'success': False, 'error': str(e)}
    
    def get_local_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close(); return ip
        except:
            try: return socket.gethostbyname(socket.gethostname())
            except: return "127.0.0.1"
    
    def get_url(self):
        ip = self.get_local_ip()
        proto = "https" if self.use_ssl else "http"
        return f"{proto}://{ip}:{self.port}/?token={self.auth_token}"
    
    def _generate_ssl_cert(self):
        import subprocess
        cert_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'certs')
        cert_file = os.path.join(cert_dir, 'cert.pem')
        key_file = os.path.join(cert_dir, 'key.pem')
        if os.path.exists(cert_file) and os.path.exists(key_file): return cert_file, key_file
        os.makedirs(cert_dir, exist_ok=True)
        try:
            ip = self.get_local_ip()
            subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-keyout', key_file, '-out', cert_file, '-days', '365', '-nodes', '-subj', f'/CN={ip}'], capture_output=True)
            if os.path.exists(cert_file): return cert_file, key_file
        except: pass
        # Fallback simplified
        try:
            from cryptography import x509
            from cryptography.x509.oid import NameOID
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.backends import default_backend
            import datetime
            key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
            subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, self.get_local_ip())])
            cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow()).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).sign(key, hashes.SHA256(), default_backend())
            with open(key_file, 'wb') as f: f.write(key.private_bytes(encoding=serialization.Encoding.PEM, format=serialization.PrivateFormat.TraditionalOpenSSL, encryption_algorithm=serialization.NoEncryption()))
            with open(cert_file, 'wb') as f: f.write(cert.public_bytes(serialization.Encoding.PEM))
            return cert_file, key_file
        except: return None, None

    def start(self, station_name="Tu POS"):
        self.station_name = station_name
        if self.is_running: return self.get_url()
        self.auth_token = secrets.token_hex(4)
        cert_file, key_file = self._generate_ssl_cert()
        self.use_ssl = bool(cert_file and key_file)
        
        def run():
            import logging, ssl
            logging.getLogger('werkzeug').setLevel(logging.ERROR)
            ctx = None
            if self.use_ssl:
                ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                ctx.load_cert_chain(cert_file, key_file)
            self.app.run(host='0.0.0.0', port=self.port, debug=False, use_reloader=False, threaded=True, ssl_context=ctx)
        
        self.server_thread = threading.Thread(target=run, daemon=True)
        self.server_thread.start()
        self.is_running = True
        return self.get_url()

    def stop(self): self.is_running = False

_mobile_scanner = None
def get_mobile_scanner():
    global _mobile_scanner
    if _mobile_scanner is None: _mobile_scanner = MobileScannerServer()
    return _mobile_scanner

def start_mobile_scanner(station_name="Tu POS"): return get_mobile_scanner().start(station_name)
def stop_mobile_scanner(): 
    if _mobile_scanner: _mobile_scanner.stop()
