using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;
using TuPos.App.Models;

namespace TuPos.App.Services
{
    public class DatabaseService
    {
        private readonly string _dbPath;
        private readonly string _connectionString;

        public DatabaseService(string? customDbPath = null)
        {
            // Default path matches the python-app directory in parent folder for backward compatibility
            if (string.IsNullOrEmpty(customDbPath))
            {
                var baseDir = AppDomain.CurrentDomain.BaseDirectory;
                // Move up from wpf-app/TuPos.App/bin/Debug/net8.0-windows to scratch/tu pos/python-app/inventory.db
                // or just absolute path C:\Users\Satd3s_\.gemini\antigravity\scratch\tu pos\python-app\inventory.db
                _dbPath = @"C:\Users\Satd3s_\.gemini\antigravity\scratch\tu pos\python-app\inventory.db";
                
                // Fallback to local execution directory if parent path is not writable or during testing
                var parentDir = Path.GetDirectoryName(_dbPath);
                if (parentDir != null && !Directory.Exists(parentDir))
                {
                    _dbPath = Path.Combine(baseDir, "inventory.db");
                }
            }
            else
            {
                _dbPath = customDbPath;
            }

            _connectionString = $"Data Source={_dbPath};Cache=Shared;";
        }

        public string DbPath => _dbPath;

        public SqliteConnection GetConnection()
        {
            var connection = new SqliteConnection(_connectionString);
            connection.Open();

            // Enable WAL mode and foreign keys for concurrent safe access
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;";
                cmd.ExecuteNonQuery();
            }

            return connection;
        }

        /// <summary>
        /// Hash password using SHA256 to match the existing Python implementation
        /// </summary>
        public static string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password);
                var hash = sha256.ComputeHash(bytes);
                var sb = new StringBuilder();
                foreach (var b in hash)
                {
                    sb.Append(b.ToString("x2"));
                }
                return sb.ToString();
            }
        }

        /// <summary>
        /// Authenticate a user by username and password or fast PIN
        /// </summary>
        public User? Authenticate(string username, string password)
        {
            var hashedPassword = HashPassword(password);

            using (var conn = GetConnection())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT * FROM users WHERE username = @username AND password = @password AND active = 1";
                cmd.Parameters.AddWithValue("@username", username);
                cmd.Parameters.AddWithValue("@password", hashedPassword);

                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        return MapUserFromReader(reader);
                    }
                }
            }
            return null;
        }

        /// <summary>
        /// Authenticate a user by fast PIN code
        /// </summary>
        public User? AuthenticateByPin(string pin)
        {
            using (var conn = GetConnection())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT * FROM users WHERE pin = @pin AND active = 1";
                cmd.Parameters.AddWithValue("@pin", pin);

                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        return MapUserFromReader(reader);
                    }
                }
            }
            return null;
        }

        private User MapUserFromReader(SqliteDataReader reader)
        {
            return new User
            {
                Id = Convert.ToInt32(reader["id"]),
                Username = Convert.ToString(reader["username"]) ?? string.Empty,
                Password = Convert.ToString(reader["password"]) ?? string.Empty,
                Role = Convert.ToString(reader["role"]) ?? "cashier",
                FullName = Convert.ToString(reader["full_name"]) ?? string.Empty,
                Pin = Convert.ToString(reader["pin"]) ?? string.Empty,
                Active = Convert.ToInt32(reader["active"]),
                Permissions = Convert.ToString(reader["permissions"]) ?? "{}"
            };
        }

        /// <summary>
        /// Performs a native WAL checkpoint and backs up the SQLite database to the backups folder
        /// </summary>
        public bool BackupDatabase()
        {
            try
            {
                var baseDir = Path.GetDirectoryName(_dbPath) ?? AppDomain.CurrentDomain.BaseDirectory;
                var backupFolder = Path.Combine(baseDir, "backups");
                
                if (!Directory.Exists(backupFolder))
                {
                    Directory.CreateDirectory(backupFolder);
                }

                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var backupPath = Path.Combine(backupFolder, $"inventory_backup_{timestamp}.db");

                using (var sourceConn = GetConnection())
                {
                    // Force checkpoint to ensure all transactions in WAL file are written to main DB
                    using (var checkpointCmd = sourceConn.CreateCommand())
                    {
                        checkpointCmd.CommandText = "PRAGMA wal_checkpoint(TRUNCATE);";
                        checkpointCmd.ExecuteNonQuery();
                    }

                    using (var destConn = new SqliteConnection($"Data Source={backupPath}"))
                    {
                        destConn.Open();
                        sourceConn.BackupDatabase(destConn);
                    }
                }

                // Keep only the last 10 backups
                var backupFiles = Directory.GetFiles(backupFolder, "inventory_backup_*.db");
                if (backupFiles.Length > 10)
                {
                    Array.Sort(backupFiles); // Sorts alphabetically (oldest first due to timestamp format)
                    for (int i = 0; i < backupFiles.Length - 10; i++)
                    {
                        try { File.Delete(backupFiles[i]); } catch { }
                    }
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Backup failed: {ex.Message}");
                return false;
            }
        }
    }
}
