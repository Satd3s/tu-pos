using Xunit;
using TuPos.App.Services;
using TuPos.App.Models;
using Microsoft.Data.Sqlite;
using System.IO;

namespace TuPos.Tests
{
    public class UserLoginTests
    {
        [Fact]
        public void TestPasswordHashing_Sha256MatchesExpectedValue()
        {
            // Arrange
            string password = "admin123";
            // Precomputed SHA256 hash for "admin123" in hexadecimal format
            string expectedHash = "240789146b9f23e8e19e7a685743b593740e5318db907d727b14d84a77e8a94a";

            // Act
            string actualHash = DatabaseService.HashPassword(password);

            // Assert
            Assert.Equal(expectedHash, actualHash);
        }

        [Fact]
        public void TestUserAuthentication_InMemoryDatabase()
        {
            // Arrange
            string tempDbFile = Path.Combine(Path.GetTempPath(), "test_auth_inventory.db");
            if (File.Exists(tempDbFile)) File.Delete(tempDbFile);

            var dbService = new DatabaseService(tempDbFile);

            using (var conn = dbService.GetConnection())
            using (var cmd = conn.CreateCommand())
            {
                // Create minimal user table for test
                cmd.CommandText = @"
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'cashier',
                        full_name TEXT,
                        pin TEXT,
                        active INTEGER DEFAULT 1,
                        permissions TEXT
                    );";
                cmd.ExecuteNonQuery();

                // Insert mock test user
                string passwordHash = DatabaseService.HashPassword("securepass123");
                cmd.CommandText = @"
                    INSERT INTO users (username, password, role, full_name, pin, active, permissions)
                    VALUES ('testuser', @password, 'cashier', 'Test User', '9999', 1, '{}');";
                cmd.Parameters.AddWithValue("@password", passwordHash);
                cmd.ExecuteNonQuery();
            }

            try
            {
                // Act - Case 1: Valid credentials
                User? validUser = dbService.Authenticate("testuser", "securepass123");
                // Act - Case 2: Invalid credentials
                User? invalidUser = dbService.Authenticate("testuser", "wrongpass");
                // Act - Case 3: Valid PIN
                User? validPinUser = dbService.AuthenticateByPin("9999");
                // Act - Case 4: Invalid PIN
                User? invalidPinUser = dbService.AuthenticateByPin("0000");

                // Assert
                Assert.NotNull(validUser);
                Assert.Equal("testuser", validUser.Username);
                Assert.Equal("Test User", validUser.FullName);

                Assert.Null(invalidUser);

                Assert.NotNull(validPinUser);
                Assert.Equal("testuser", validPinUser.Username);

                Assert.Null(invalidPinUser);
            }
            finally
            {
                // Clean up database file
                if (File.Exists(tempDbFile))
                {
                    try { File.Delete(tempDbFile); } catch { }
                }
            }
        }
    }
}
