using Xunit;
using TuPos.App.Services;
using Microsoft.Data.Sqlite;
using System.IO;
using System;

namespace TuPos.Tests
{
    public class DatabaseTests
    {
        [Fact]
        public void TestDatabaseConnection_ShouldOpenAndConfigureWAL()
        {
            // Arrange
            string tempDbFile = Path.Combine(Path.GetTempPath(), "test_db_inventory.db");
            if (File.Exists(tempDbFile)) File.Delete(tempDbFile);

            var dbService = new DatabaseService(tempDbFile);

            try
            {
                // Act
                using (var conn = dbService.GetConnection())
                {
                    // Assert - Connection is open
                    Assert.Equal(System.Data.ConnectionState.Open, conn.State);

                    // Assert - WAL mode is enabled
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "PRAGMA journal_mode;";
                        string? journalMode = cmd.ExecuteScalar() as string;
                        Assert.Equal("wal", journalMode?.ToLower());
                    }

                    // Assert - Foreign keys are enabled
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "PRAGMA foreign_keys;";
                        long? foreignKeys = cmd.ExecuteScalar() as long?;
                        Assert.Equal(1, foreignKeys);
                    }
                }
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

        [Fact]
        public void TestBackupDatabase_ShouldCreateConsistentBackupFile()
        {
            // Arrange
            string tempDbFile = Path.Combine(Path.GetTempPath(), "test_backup_inventory.db");
            if (File.Exists(tempDbFile)) File.Delete(tempDbFile);

            var dbService = new DatabaseService(tempDbFile);

            try
            {
                // Create table and mock data
                using (var conn = dbService.GetConnection())
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, val TEXT);";
                    cmd.ExecuteNonQuery();

                    cmd.CommandText = "INSERT INTO test (val) VALUES ('test_value');";
                    cmd.ExecuteNonQuery();
                }

                // Act
                bool backupResult = dbService.BackupDatabase();

                // Assert
                Assert.True(backupResult);

                string backupFolder = Path.Combine(Path.GetDirectoryName(tempDbFile) ?? "", "backups");
                Assert.True(Directory.Exists(backupFolder));

                string[] backupFiles = Directory.GetFiles(backupFolder, "inventory_backup_*.db");
                Assert.NotEmpty(backupFiles);

                // Clean up backup files
                foreach (var file in backupFiles)
                {
                    try { File.Delete(file); } catch { }
                }
                try { Directory.Delete(backupFolder); } catch { }
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
