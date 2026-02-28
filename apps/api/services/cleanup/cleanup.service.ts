import { pool } from "../../src/utils/postgres";
import { SandboxMeta } from "../../models/sandboxMeta.model";
import { ExecutionLogService } from "../logging/executionLog.service";
import { HintLog } from "../../models/hintLog.model";

export class CleanupService {
  /**
   * Clean up old sandbox schemas and metadata
   */
  static async cleanupOldSandboxes(daysToKeep: number = 7): Promise<{
    schemasDeleted: number;
    metadataDeleted: number;
  }> {
    try {
      const cutoffDate = new Date(
        Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
      );

      // Find old sandbox metadata
      const oldSandboxes = await SandboxMeta.find({
        lastUsedAt: { $lt: cutoffDate },
      }).select("schemaName");

      if (oldSandboxes.length === 0) {
        console.log("No old sandboxes to clean up");
        return { schemasDeleted: 0, metadataDeleted: 0 };
      }

      const client = await pool.connect();
      let schemasDeleted = 0;

      try {
        await client.query("BEGIN");

        // Drop schemas from PostgreSQL
        for (const sandbox of oldSandboxes) {
          try {
            // Drop schema with CASCADE to remove all objects
            await client.query(
              `DROP SCHEMA IF EXISTS "${sandbox.schemaName}" CASCADE`,
            );
            schemasDeleted++;
            console.log(`Dropped schema: ${sandbox.schemaName}`);
          } catch (error) {
            console.error(
              `Failed to drop schema ${sandbox.schemaName}:`,
              error,
            );
          }
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      // Delete metadata from MongoDB
      const deleteResult = await SandboxMeta.deleteMany({
        lastUsedAt: { $lt: cutoffDate },
      });

      console.log(
        `Cleanup completed: ${schemasDeleted} schemas deleted, ${deleteResult.deletedCount} metadata records deleted`,
      );

      return {
        schemasDeleted,
        metadataDeleted: deleteResult.deletedCount,
      };
    } catch (error) {
      console.error("Error during sandbox cleanup:", error);
      throw error;
    }
  }

  /**
   * Clean up orphaned schemas (schemas without metadata)
   */
  static async cleanupOrphanedSchemas(): Promise<number> {
    try {
      const client = await pool.connect();
      try {
        // Get all sandbox schemas from metadata
        const activeSchemas = await SandboxMeta.find().select("schemaName");
        const activeSchemaNames = activeSchemas.map((s) => s.schemaName);

        // Get all schemas starting with 'sb_' from PostgreSQL
        const allSchemasResult = await client.query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'sb_%'
        `);

        const allSchemaNames = allSchemasResult.rows.map(
          (row: any) => row.schema_name,
        );

        // Find orphaned schemas
        const orphanedSchemas = allSchemaNames.filter(
          (schema) => !activeSchemaNames.includes(schema),
        );

        if (orphanedSchemas.length === 0) {
          console.log("No orphaned schemas found");
          return 0;
        }

        let deletedCount = 0;
        await client.query("BEGIN");

        for (const schema of orphanedSchemas) {
          try {
            await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
            deletedCount++;
            console.log(`Dropped orphaned schema: ${schema}`);
          } catch (error) {
            console.error(`Failed to drop orphaned schema ${schema}:`, error);
          }
        }

        await client.query("COMMIT");
        console.log(`Cleaned up ${deletedCount} orphaned schemas`);

        return deletedCount;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error during orphaned schema cleanup:", error);
      throw error;
    }
  }

  /**
   * Comprehensive cleanup of all old data
   */
  static async performFullCleanup(daysToKeep: number = 7): Promise<{
    schemasDeleted: number;
    metadataDeleted: number;
    executionLogsDeleted: number;
    hintLogsDeleted: number;
    orphanedSchemasDeleted: number;
  }> {
    try {
      console.log("Starting comprehensive cleanup...");

      // Clean old sandboxes
      const sandboxCleanup = await this.cleanupOldSandboxes(daysToKeep);

      // Clean orphaned schemas
      const orphanedCleanup = await this.cleanupOrphanedSchemas();

      // Clean execution logs
      const executionLogsDeleted =
        await ExecutionLogService.cleanupOldLogs(daysToKeep);

      // Clean hint logs (they have TTL but we can force cleanup)
      const hintCutoffDate = new Date(
        Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
      );
      const hintDeleteResult = await HintLog.deleteMany({
        createdAt: { $lt: hintCutoffDate },
      });

      const result = {
        schemasDeleted: sandboxCleanup.schemasDeleted,
        metadataDeleted: sandboxCleanup.metadataDeleted,
        executionLogsDeleted,
        hintLogsDeleted: hintDeleteResult.deletedCount,
        orphanedSchemasDeleted: orphanedCleanup,
      };

      console.log("Comprehensive cleanup completed:", result);
      return result;
    } catch (error) {
      console.error("Error during comprehensive cleanup:", error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   */
  static async getCleanupStats(): Promise<{
    totalSandboxes: number;
    activeSandboxes: number;
    oldSandboxes: number;
    totalSchemas: number;
    orphanedSchemas: number;
  }> {
    try {
      // Get sandbox metadata stats
      const totalSandboxes = await SandboxMeta.countDocuments();
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeSandboxes = await SandboxMeta.countDocuments({
        lastUsedAt: { $gte: oneWeekAgo },
      });
      const oldSandboxes = totalSandboxes - activeSandboxes;

      // Get schema stats from PostgreSQL
      const client = await pool.connect();
      try {
        const allSchemasResult = await client.query(`
          SELECT COUNT(*) as count
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'sb_%'
        `);
        const totalSchemas = parseInt(allSchemasResult.rows[0].count);

        const activeSchemas = await SandboxMeta.find().select("schemaName");
        const activeSchemaNames = activeSchemas.map((s) => s.schemaName);

        const allSchemasListResult = await client.query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'sb_%'
        `);
        const allSchemaNames = allSchemasListResult.rows.map(
          (row: any) => row.schema_name,
        );

        const orphanedSchemas = allSchemaNames.filter(
          (schema) => !activeSchemaNames.includes(schema),
        ).length;

        return {
          totalSandboxes,
          activeSandboxes,
          oldSandboxes,
          totalSchemas,
          orphanedSchemas,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting cleanup stats:", error);
      throw error;
    }
  }
}
