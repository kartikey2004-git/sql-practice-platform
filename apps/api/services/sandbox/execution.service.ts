import { pool } from "../../src/utils/postgres";
import { SandboxMeta } from "../../models/sandboxMeta.model";
import { ExecutionLogService } from "../logging/executionLog.service";
import mongoose from "mongoose";

export interface QueryResult {
  columns: string[];
  rows: object[];
  rowCount: number;
  executionTime: number;
}

export interface ValidationError {
  type:
    | "FORBIDDEN_KEYWORD"
    | "MULTIPLE_STATEMENTS"
    | "EMPTY_QUERY"
    | "INVALID_SYNTAX";
  message: string;
  details?: string;
}

export interface ExecutionError {
  type:
    | "SANDBOX_NOT_FOUND"
    | "VALIDATION_ERROR"
    | "TIMEOUT"
    | "SYNTAX_ERROR"
    | "RUNTIME_ERROR"
    | "PERMISSION_ERROR";
  message: string;
  details?: string;
}

export class ExecutionService {
  private static readonly ALLOWED_KEYWORDS = ["SELECT", "WITH"];
  private static readonly BLOCKED_KEYWORDS = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "CREATE",
    "DROP",
    "ALTER",
    "COPY",
    "CALL",
    "DO",
    "GRANT",
    "REVOKE",
    "TRUNCATE",
    "EXECUTE",
    "PREPARE",
    "DEALLOCATE",
    "DISCARD",
    "RESET",
  ];
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds

  /**
   * Get sandbox schema for identity + assignment
   */
  static async getSandboxSchema(
    identityId: string,
    assignmentId: string,
  ): Promise<string> {
    try {
      const sandbox = await SandboxMeta.findOne({
        identityId,
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
      });

      if (!sandbox) {
        throw new Error("Sandbox not found for this identity and assignment");
      }

      // Update last used timestamp
      await SandboxMeta.updateOne(
        { _id: sandbox._id },
        { lastUsedAt: new Date() },
      );

      return sandbox.schemaName;
    } catch (error) {
      console.error("Error getting sandbox schema:", error);
      throw error;
    }
  }

  /**
   * Validate SQL query for safety
   */
  static validateQuery(query: string): {
    isValid: boolean;
    error?: ValidationError;
  } {
    if (!query || query.trim().length === 0) {
      return {
        isValid: false,
        error: {
          type: "EMPTY_QUERY",
          message: "Query cannot be empty",
        },
      };
    }

    const normalizedQuery = query.trim().toLowerCase();

    // Check for multiple statements (semicolon detection)
    const statementCount = (query.match(/;/g) || []).length;
    if (statementCount > 1) {
      return {
        isValid: false,
        error: {
          type: "MULTIPLE_STATEMENTS",
          message: "Multiple SQL statements are not allowed",
          details: "Only single SELECT or WITH statements are permitted",
        },
      };
    }

    // Extract first keyword
    const firstWordMatch = normalizedQuery.match(/^(\w+)/);
    if (!firstWordMatch || !firstWordMatch[1]) {
      return {
        isValid: false,
        error: {
          type: "INVALID_SYNTAX",
          message: "Invalid SQL syntax - cannot determine statement type",
        },
      };
    }

    const firstKeyword = firstWordMatch[1].toUpperCase();

    // Check if keyword is allowed
    if (!this.ALLOWED_KEYWORDS.includes(firstKeyword)) {
      return {
        isValid: false,
        error: {
          type: "FORBIDDEN_KEYWORD",
          message: `SQL keyword '${firstKeyword}' is not allowed`,
          details: `Only ${this.ALLOWED_KEYWORDS.join(", ")} statements are permitted`,
        },
      };
    }

    // Check for blocked keywords anywhere in the query
    for (const blockedKeyword of this.BLOCKED_KEYWORDS) {
      const regex = new RegExp(`\\b${blockedKeyword}\\b`, "i");
      if (regex.test(query)) {
        return {
          isValid: false,
          error: {
            type: "FORBIDDEN_KEYWORD",
            message: `SQL keyword '${blockedKeyword}' is not allowed`,
            details: "This operation could modify data or database structure",
          },
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Format PostgreSQL result for frontend
   */
  static formatResult(pgResult: any, executionTime: number): QueryResult {
    const columns = pgResult.fields?.map((field: any) => field.name) || [];
    const rows = pgResult.rows || [];
    const rowCount = pgResult.rowCount || 0;

    return {
      columns,
      rows,
      rowCount,
      executionTime,
    };
  }

  /**
   * Convert PostgreSQL errors to user-safe messages
   */
  static convertPostgresError(error: any): ExecutionError {
    const code = error.code;
    const message = error.message || "Unknown database error";

    // Syntax errors
    if (code === "42601" || message.includes("syntax error")) {
      return {
        type: "SYNTAX_ERROR",
        message: "SQL syntax error",
        details: "Please check your SQL syntax and try again",
      };
    }

    // Column/table not found
    if (
      code === "42703" ||
      (message.includes("column") && message.includes("does not exist"))
    ) {
      return {
        type: "RUNTIME_ERROR",
        message: "Column not found",
        details: "One or more columns in your query do not exist",
      };
    }

    if (
      code === "42P01" ||
      (message.includes("relation") && message.includes("does not exist"))
    ) {
      return {
        type: "RUNTIME_ERROR",
        message: "Table not found",
        details: "One or more tables in your query do not exist",
      };
    }

    // Permission errors
    if (code === "42501" || message.includes("permission")) {
      return {
        type: "PERMISSION_ERROR",
        message: "Access denied",
        details: "You do not have permission to perform this operation",
      };
    }

    // Generic runtime error
    return {
      type: "RUNTIME_ERROR",
      message: "Query execution failed",
      details: message,
    };
  }

  /**
   * Execute query with timeout
   */
  static async executeQueryWithTimeout(
    client: any,
    query: string,
    timeout: number = this.DEFAULT_TIMEOUT,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Query timeout"));
      }, timeout);

      client
        .query(query)
        .then((result: any) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error: any) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Main execution function
   */
  static async executeQuery(
    identityId: string,
    assignmentId: string,
    query: string,
  ): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      // 1. Get sandbox schema
      const schemaName = await this.getSandboxSchema(identityId, assignmentId);

      // 2. Validate query
      const validation = this.validateQuery(query);
      if (!validation.isValid) {
        const error = validation.error!;
        throw new Error(
          `${error.type}: ${error.message}${error.details ? ` - ${error.details}` : ""}`,
        );
      }

      // 3. Execute query with isolation
      const client = await pool.connect();
      try {
        // Set search path to sandbox schema for isolation
        await client.query(`SET search_path TO "${schemaName}"`);

        // Execute query with timeout
        const result = await this.executeQueryWithTimeout(client, query);

        // Calculate execution time
        const executionTime = Date.now() - startTime;

        // Log successful execution
        await ExecutionLogService.logExecution({
          identityId,
          assignmentId,
          query,
          executionTime,
          rowCount: result.rowCount || 0,
          status: "success",
          schemaName,
        });

        // Format and return result
        return this.formatResult(result, executionTime);
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Query execution error:", error);

      const executionTime = Date.now() - startTime;

      // Get schema name for logging if possible
      let schemaName = "unknown";
      try {
        schemaName = await this.getSandboxSchema(identityId, assignmentId);
      } catch (e) {
        // Schema not found, use unknown
      }

      // Log failed execution
      await ExecutionLogService.logExecution({
        identityId,
        assignmentId,
        query,
        executionTime,
        rowCount: 0,
        status: "error",
        errorMessage: error.message,
        schemaName,
      });

      // Handle timeout
      if (error.message === "Query timeout") {
        throw new Error(
          "TIMEOUT: Query execution exceeded the time limit (5 seconds)",
        );
      }

      // Handle sandbox not found
      if (error.message.includes("Sandbox not found")) {
        throw new Error(
          "SANDBOX_NOT_FOUND: Sandbox not found for this assignment. Please initialize the sandbox first.",
        );
      }

      // Handle validation errors
      if (
        error.message.includes("EMPTY_QUERY") ||
        error.message.includes("FORBIDDEN_KEYWORD") ||
        error.message.includes("MULTIPLE_STATEMENTS")
      ) {
        throw new Error(`VALIDATION_ERROR: ${error.message}`);
      }

      // Handle PostgreSQL errors
      if (error.code) {
        const pgError = this.convertPostgresError(error);
        throw new Error(
          `${pgError.type}: ${pgError.message}${pgError.details ? ` - ${pgError.details}` : ""}`,
        );
      }

      // Generic error
      throw new Error(
        `RUNTIME_ERROR: ${error.message || "An unknown error occurred"}`,
      );
    }
  }
}
