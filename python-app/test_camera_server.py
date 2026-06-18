from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def test():
    return '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Camara</title>
    <style>
        body { background: #1a1a2e; color: white; font-family: sans-serif; padding: 20px; text-align: center; }
        video { width: 100%; max-width: 400px; background: #000; border-radius: 12px; display: block; margin: 20px auto; }
        #status { padding: 15px; margin: 10px auto; border-radius: 8px; background: #333; max-width: 400px; }
        .success { background: #22c55e !important; }
        .error { background: #ef4444 !important; }
    </style>
</head>
<body>
    <h2>Test de Camara</h2>
    <div id="status">Iniciando...</div>
    <video id="video" autoplay playsinline muted></video>
    <script>
        async function init() {
            const video = document.getElementById('video');
            const status = document.getElementById('status');
            try {
                status.textContent = 'Solicitando permiso de camara...';
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    status.textContent = 'FUNCIONANDO! ' + video.videoWidth + 'x' + video.videoHeight;
                    status.className = 'success';
                };
                await video.play();
            } catch (err) {
                status.textContent = 'ERROR: ' + err.name + ' - ' + err.message;
                status.className = 'error';
                console.error(err);
            }
        }
        init();
    </script>
</body>
</html>'''

if __name__ == '__main__':
    import ssl
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    
    # Generar certificado autofirmado
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend
    import datetime
    import tempfile
    import os
    
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
    subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'localhost')])
    cert = (x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.utcnow())
        .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365))
        .sign(key, hashes.SHA256(), default_backend()))
    
    # Guardar temporalmente
    cert_path = os.path.join(tempfile.gettempdir(), 'test_cert.pem')
    key_path = os.path.join(tempfile.gettempdir(), 'test_key.pem')
    
    with open(key_path, 'wb') as f:
        f.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL, serialization.NoEncryption()))
    with open(cert_path, 'wb') as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    
    context.load_cert_chain(cert_path, key_path)
    
    print("=" * 50)
    print("Servidor de prueba corriendo en:")
    print("https://localhost:5556")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5556, ssl_context=context, debug=False)
