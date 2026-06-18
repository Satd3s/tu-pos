
import os
import sys
import zipfile
import shutil
import ctypes
import json
import tkinter as tk
from tkinter import messagebox, ttk, filedialog

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

class InstallerWizard(tk.Tk):
    def __init__(self):
        super().__init__()
        
        self.title("Instalador Tu POS - Configuración")
        self.geometry("600x500")
        self.resizable(False, False)
        
        # Estilos modernos (dentro de lo posible en tk)
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.configure(bg='#f0f0f0')

        # Variables
        self.install_path = tk.StringVar(value=r"C:\TuPOS")
        self.company_name = tk.StringVar(value="Mi Negocio")
        self.company_phone = tk.StringVar()
        self.company_address = tk.StringVar()
        self.network_mode = tk.StringVar(value="standalone") # standalone, server, client
        self.server_ip = tk.StringVar(value="192.168.1.100")
        
        self.current_step = 0
        self.steps = [
            self.step_welcome,
            self.step_company,
            self.step_network,
            self.step_install,
            self.step_finish
        ]
        
        # Header
        self.header_frame = tk.Frame(self, bg='#2c3e50', height=60)
        self.header_frame.pack(fill='x')
        self.header_label = tk.Label(self.header_frame, text="Bienvenido al Asistente de Instalación", 
                                   fg='white', bg='#2c3e50', font=('Segoe UI', 14, 'bold'))
        self.header_label.pack(pady=15)
        
        # Content
        self.content_frame = tk.Frame(self, bg='#f0f0f0', padx=40, pady=20)
        self.content_frame.pack(expand=True, fill='both')
        
        # Footer
        self.footer_frame = tk.Frame(self, bg='#e0e0e0', height=50)
        self.footer_frame.pack(fill='x', side='bottom')
        
        self.btn_next = tk.Button(self.footer_frame, text="Siguiente >", command=self.next_step, 
                                bg='#3498db', fg='white', font=('Segoe UI', 9, 'bold'), relief='flat', padx=20)
        self.btn_next.pack(side='right', padx=20, pady=10)
        
        self.btn_back = tk.Button(self.footer_frame, text="< Atrás", command=self.prev_step,
                                bg='#95a5a6', fg='white', font=('Segoe UI', 9), relief='flat', padx=15)
        self.btn_back.pack(side='right', padx=5, pady=10)

        self.show_step()

    def clear_content(self):
        for widget in self.content_frame.winfo_children():
            widget.destroy()

    def show_step(self):
        self.clear_content()
        self.steps[self.current_step]()
        
        # Update buttons
        if self.current_step == 0:
            self.btn_back.config(state='disabled')
        else:
            self.btn_back.config(state='normal')
            
        if self.current_step == len(self.steps) - 1:
            self.btn_next.config(text="Cerrar", command=self.destroy)
        elif self.current_step == len(self.steps) - 2:
            self.btn_next.config(text="Instalar", command=self.start_installation)
        else:
            self.btn_next.config(text="Siguiente >", command=self.next_step)

    def next_step(self):
        if self.current_step < len(self.steps) - 1:
            self.current_step += 1
            self.show_step()

    def prev_step(self):
        if self.current_step > 0:
            self.current_step -= 1
            self.show_step()

    # --- STEPS ---
    
    def step_welcome(self):
        self.header_label.config(text="Instalación de Tu POS")
        tk.Label(self.content_frame, text="Bienvenido", font=('Segoe UI', 18, 'bold'), bg='#f0f0f0').pack(anchor='w')
        tk.Label(self.content_frame, text="Este asistente le guiará en la instalación del sistema.\n\nPor favor, confirme la ruta de instalación:", 
               bg='#f0f0f0', justify='left').pack(anchor='w', pady=10)
        
        frame = tk.LabelFrame(self.content_frame, text="Ruta de destino", bg='#f0f0f0', padx=10, pady=10)
        frame.pack(fill='x', pady=10)
        
        entry = tk.Entry(frame, textvariable=self.install_path, width=40)
        entry.pack(side='left', fill='x', expand=True)
        tk.Button(frame, text="...", command=self.browse_folder).pack(side='right', padx=5)

    def browse_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.install_path.set(folder)

    def step_company(self):
        self.header_label.config(text="Datos de la Empresa")
        tk.Label(self.content_frame, text="Personalice su sistema ahora", font=('Segoe UI', 14), bg='#f0f0f0').pack(anchor='w', pady=10)
        
        grid = tk.Frame(self.content_frame, bg='#f0f0f0')
        grid.pack(fill='x')
        
        tk.Label(grid, text="Nombre del Negocio:", bg='#f0f0f0', font=('Segoe UI', 10, 'bold')).grid(row=0, column=0, sticky='w', pady=5)
        tk.Entry(grid, textvariable=self.company_name, width=30).grid(row=0, column=1, pady=5)
        
        tk.Label(grid, text="Teléfono:", bg='#f0f0f0').grid(row=1, column=0, sticky='w', pady=5)
        tk.Entry(grid, textvariable=self.company_phone, width=30).grid(row=1, column=1, pady=5)
        
        tk.Label(grid, text="Dirección:", bg='#f0f0f0').grid(row=2, column=0, sticky='w', pady=5)
        tk.Entry(grid, textvariable=self.company_address, width=30).grid(row=2, column=1, pady=5)
        
        tk.Label(self.content_frame, text="* Estos datos aparecerán en los tickets.", bg='#f0f0f0', fg='gray').pack(anchor='w', pady=20)

    def step_network(self):
        self.header_label.config(text="Modo de Operación")
        tk.Label(self.content_frame, text="¿Cómo se comportará esta terminal?", font=('Segoe UI', 14), bg='#f0f0f0').pack(anchor='w', pady=10)
        
        modes = [
            ("standalone", "Caja Independiente (Local)\nTodo se guarda en esta PC."),
            ("server", "Servidor Central\nEsta PC guarda los datos de otras cajas."),
            ("client", "Terminal Cliente (Caja Secundaria)\nSe conecta a un servidor existente.")
        ]
        
        for val, text in modes:
            r = tk.Radiobutton(self.content_frame, text=text, variable=self.network_mode, value=val, 
                             bg='#f0f0f0', font=('Segoe UI', 10), justify='left', anchor='w')
            r.pack(fill='x', pady=5)
            
        # Optional IP
        self.ip_frame = tk.Frame(self.content_frame, bg='#f0f0f0', pady=10)
        tk.Label(self.ip_frame, text="IP del Servidor:", bg='#f0f0f0').pack(side='left')
        tk.Entry(self.ip_frame, textvariable=self.server_ip).pack(side='left', padx=10)
        
        # Show IP input only if client is selected
        self.network_mode.trace("w", self.toggle_ip_input)
        self.toggle_ip_input()

    def toggle_ip_input(self, *args):
        if self.network_mode.get() == 'client':
            self.ip_frame.pack(fill='x', padx=20)
        else:
            self.ip_frame.pack_forget()

    def step_install(self):
        self.header_label.config(text="Instalando...")
        self.progress = ttk.Progressbar(self.content_frame, orient='horizontal', length=400, mode='determinate')
        self.progress.pack(pady=40)
        self.status_label = tk.Label(self.content_frame, text="Preparando...", bg='#f0f0f0')
        self.status_label.pack()
        
        # Disable buttons
        self.btn_back.config(state='disabled')
        self.btn_next.config(state='disabled')

    def start_installation(self):
        self.next_step() # Move to step_install UI
        self.update()
        
        install_dir = self.install_path.get()
        
        try:
            # 1. Extract
            self.status_label.config(text="Extrayendo archivos...")
            self.progress['value'] = 20
            self.update()
            
            if os.path.exists(install_dir):
                shutil.rmtree(install_dir, ignore_errors=True)
            os.makedirs(install_dir, exist_ok=True)
            
            base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
            zip_path = os.path.join(base_path, 'app_payload.zip')
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(install_dir)
                
            self.progress['value'] = 60
            self.update()
            
            # 2. Configure config.json
            self.status_label.config(text="Aplicando configuración...")
            config_path = os.path.join(install_dir, 'config.json')
            
            # Read template or create new
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
            else:
                config = {} # Fallback
            
            # Update values
            config.setdefault('company', {})
            config['company']['name'] = self.company_name.get()
            config['company']['phone'] = self.company_phone.get()
            config['company']['address'] = self.company_address.get()
            
            config.setdefault('network', {})
            config['network']['mode'] = self.network_mode.get()
            if self.network_mode.get() == 'client':
                config['network']['server_ip'] = self.server_ip.get()
                
            config['first_run'] = False # Skip the internal HTML wizard
            config['setup_completed'] = True
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
                
            self.progress['value'] = 80
            self.update()
            
            # 3. Shortcut
            self.status_label.config(text="Creando accesos directos...")
            desktop = os.path.join(os.path.join(os.environ['USERPROFILE']), 'Desktop')
            shortcut_dest = os.path.join(desktop, "Tu POS Sistema.lnk")
            target_exe = os.path.join(install_dir, "Tu_POS_Sistema.exe")
            
            self.create_shortcut(target_exe, shortcut_dest, install_dir)
            
            self.progress['value'] = 100
            self.status_label.config(text="Finalizado")
            self.update()
            
            # Move to finish step automatically
            self.after(1000, self.next_step)
            
        except Exception as e:
            messagebox.showerror("Error", str(e))
            self.destroy()

    def create_shortcut(self, target_path, shortcut_path, working_dir):
        try:
            vbs_path = os.path.join(os.environ['TEMP'], 'CreateShortcut.vbs')
            with open(vbs_path, 'w') as f:
                f.write('Set oWS = WScript.CreateObject("WScript.Shell")\n')
                f.write(f'sLinkFile = "{shortcut_path}"\n')
                f.write('Set oLink = oWS.CreateShortcut(sLinkFile)\n')
                f.write(f'oLink.TargetPath = "{target_path}"\n')
                f.write(f'oLink.WorkingDirectory = "{working_dir}"\n')
                f.write(f'oLink.IconLocation = "{target_path},0"\n')
                f.write('oLink.Save\n')
            os.system(f'cscript /nologo "{vbs_path}"')
            os.remove(vbs_path)
        except:
            pass

    def step_finish(self):
        self.header_label.config(text="Instalación Completada")
        tk.Label(self.content_frame, text="✅ El sistema se instaló correctamente.", 
               font=('Segoe UI', 12, 'bold'), fg='green', bg='#f0f0f0').pack(pady=10)
        
        # Mostrar credenciales por defecto para que el usuario sepa cómo entrar
        info_frame = tk.LabelFrame(self.content_frame, text="Credenciales de Acceso", bg='#f0f0f0', font=('Segoe UI', 10, 'bold'))
        info_frame.pack(fill='x', padx=20, pady=10)
        
        tk.Label(info_frame, text="Usuario: admin", bg='#f0f0f0', font=('Segoe UI', 10)).pack(anchor='w', padx=10, pady=2)
        tk.Label(info_frame, text="Contraseña: admin123", bg='#f0f0f0', font=('Segoe UI', 10)).pack(anchor='w', padx=10, pady=2)
        tk.Label(info_frame, text="(Se recomienda cambiar la contraseña al entrar)", bg='#f0f0f0', fg='gray', font=('Segoe UI', 8)).pack(anchor='w', padx=10, pady=5)
        
        self.launch_var = tk.BooleanVar(value=True)
        tk.Checkbutton(self.content_frame, text="Iniciar Tu POS ahora", variable=self.launch_var, 
                      bg='#f0f0f0', font=('Segoe UI', 11)).pack(pady=10)
        
        # Override close button behavior
        self.btn_next.config(command=self.finish_and_launch)

    def finish_and_launch(self):
        if self.launch_var.get():
            exe = os.path.join(self.install_path.get(), "Tu_POS_Sistema.exe")
            try:
                os.startfile(exe)
            except:
                pass
        self.destroy()

if __name__ == "__main__":
    if not is_admin():
        # Re-run as admin
        try:
            ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
        except:
            pass
        sys.exit()

    app = InstallerWizard()
    app.mainloop()
