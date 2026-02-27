import { pool } from "../../src/utils/postgres";
import { SandboxMeta } from "../../models/sandboxMeta.model";
import { Assignment } from "../../models/assignment.model";
import type { ITable } from "../../models/assignment.model";
import mongoose from "mongoose";

export class SandboxService {
  static generateSchemaName(identityId: string, assignmentId: string): string {
    const sanitizedIdentity = identityId.replace(/[^a-zA-Z0-9_]/g, "_");
    const sanitizedAssignment = assignmentId.replace(/[^a-zA-Z0-9_]/g, "_");
    const schemaName = `sb_${sanitizedIdentity}_${sanitizedAssignment}`;

    return schemaName.length > 63 ? schemaName.substring(0, 63) : schemaName;
  }

  static async findExistingSandbox(
    identityId: string,
    assignmentId: string,
  ): Promise<{ schemaName: string; lastUsedAt: Date } | null> {
    try {
      const existingSandbox = await SandboxMeta.findOne({
        identityId,
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
      });

      if (existingSandbox) {
        await SandboxMeta.updateOne(
          { _id: existingSandbox._id },
          { lastUsedAt: new Date() },
        );

        return {
          schemaName: existingSandbox.schemaName,
          lastUsedAt: existingSandbox.lastUsedAt,
        };
      }

      return null;
    } catch (error) {
      console.error("Error finding existing sandbox:", error);
      throw error;
    }
  }

  static async createSchema(schemaName: string): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating schema:", error);
      throw error;
    }
  }

  private static generateCreateTableStatement(
    schemaName: string,
    table: ITable,
  ): string {
    const columnDefinitions = table.columns
      .map(
        (column: { columnName: string; dataType: string }) =>
          `"${column.columnName}" ${column.dataType}`,
      )
      .join(", ");

    return `CREATE TABLE "${schemaName}"."${table.tableName}" (${columnDefinitions})`;
  }

  static async createTables(
    schemaName: string,
    sampleTables: ITable[],
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const table of sampleTables) {
        const createTableSQL = this.generateCreateTableStatement(
          schemaName,
          table,
        );
        await client.query(createTableSQL);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error creating tables:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  private static generateInsertStatement(
    schemaName: string,
    tableName: string,
    row: Record<string, any>,
    columns: { columnName: string; dataType: string }[],
  ): string {
    const columnNames = columns.map((col) => `"${col.columnName}"`).join(", ");
    const values = columns
      .map((col) => {
        const value = row[col.columnName];
        if (value === null || value === undefined) {
          return "NULL";
        } else if (typeof value === "string") {
          return `'${value.replace(/'/g, "''")}'`;
        } else if (typeof value === "number") {
          return value.toString();
        } else if (typeof value === "boolean") {
          return value.toString();
        } else {
          return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        }
      })
      .join(", ");

    return `INSERT INTO "${schemaName}"."${tableName}" (${columnNames}) VALUES (${values})`;
  }

  static async insertRows(
    schemaName: string,
    sampleTables: ITable[],
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const table of sampleTables) {
        for (const row of table.rows) {
          const insertSQL = this.generateInsertStatement(
            schemaName,
            table.tableName,
            row,
            table.columns,
          );
          await client.query(insertSQL);
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error inserting rows:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async initSandbox(
    identityId: string,
    assignmentId: string,
  ): Promise<{ schemaName: string; isNew: boolean }> {
    try {
      const existingSandbox = await this.findExistingSandbox(
        identityId,
        assignmentId,
      );

      if (existingSandbox) {
        return {
          schemaName: existingSandbox.schemaName,
          isNew: false,
        };
      }

      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        throw new Error("Assignment not found");
      }

      const schemaName = this.generateSchemaName(identityId, assignmentId);

      await this.createSchema(schemaName);

      await this.createTables(schemaName, assignment.sampleTables);

      await this.insertRows(schemaName, assignment.sampleTables);

      await SandboxMeta.create({
        identityId,
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        schemaName,
        lastUsedAt: new Date(),
      });

      return {
        schemaName,
        isNew: true,
      };
    } catch (error) {
      console.error("Error initializing sandbox:", error);
      throw error;
    }
  }
}
