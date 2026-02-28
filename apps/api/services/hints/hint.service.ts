import { HintLog } from "../../models/hintLog.model";
import { Assignment } from "../../models/assignment.model";
import { randomUUID } from "crypto";
import mongoose from "mongoose";

export interface HintRequest {
  assignmentId: string;
  userQuery: string;
  hintType?: "syntax" | "logic" | "approach";
}

export interface HintResponse {
  hint: string;
  hintType: "syntax" | "logic" | "approach";
  requestId: string;
}

export class HintService {
  /**
   * Rate limiting: Check if user has requested too many hints recently
   */
  private static async checkRateLimit(identityId: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentHints = await HintLog.countDocuments({
        identityId,
        createdAt: { $gte: oneHourAgo },
      });

      // Allow max 10 hints per hour per identity
      return recentHints < 10;
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return false;
    }
  }

  /**
   * Generate a contextual hint based on user's query and assignment
   */
  private static generateHint(
    assignment: any,
    userQuery: string,
    hintType: "syntax" | "logic" | "approach",
  ): string {
    const { question, sampleTables } = assignment;

    // Extract table names for context
    const tableNames = sampleTables
      .map((table: any) => table.tableName)
      .join(", ");

    const hints = {
      syntax: this.generateSyntaxHint(userQuery, tableNames),
      logic: this.generateLogicHint(question, tableNames),
      approach: this.generateApproachHint(question, tableNames),
    };

    return hints[hintType];
  }

  private static generateSyntaxHint(
    userQuery: string,
    tableNames: string,
  ): string {
    const queryLower = userQuery.toLowerCase();

    // Check for common syntax errors
    if (!queryLower.includes("select")) {
      return "Remember that SQL queries usually start with the SELECT keyword. Make sure you're selecting the columns you need.";
    }

    if (!queryLower.includes("from")) {
      return (
        "Don't forget the FROM clause to specify which table(s) you're querying from. Available tables: " +
        tableNames
      );
    }

    if (queryLower.includes("select *") && !queryLower.includes("where")) {
      return "Using SELECT * will return all columns. Consider specifying only the columns you need, and you might want to add a WHERE clause to filter results.";
    }

    if (
      queryLower.includes("where") &&
      !queryLower.includes("=") &&
      !queryLower.includes(">") &&
      !queryLower.includes("<")
    ) {
      return "Your WHERE clause needs a comparison operator like =, >, <, >=, <=, or LIKE to filter the results.";
    }

    return "Check your SQL syntax. Make sure all keywords are spelled correctly and that you have proper commas between column names.";
  }

  private static generateLogicHint(
    question: string,
    tableNames: string,
  ): string {
    const questionLower = question.toLowerCase();

    if (questionLower.includes("average") || questionLower.includes("mean")) {
      return "For calculating averages, consider using the AVG() aggregate function. You might also need GROUP BY if you're averaging by categories.";
    }

    if (
      questionLower.includes("count") ||
      questionLower.includes("number of")
    ) {
      return "For counting records, use COUNT(*) or COUNT(column_name). COUNT(*) counts all rows, while COUNT(column) counts non-null values in that column.";
    }

    if (
      questionLower.includes("maximum") ||
      questionLower.includes("highest")
    ) {
      return "To find the maximum value, use the MAX() function. You might need to combine this with WHERE to filter specific groups first.";
    }

    if (questionLower.includes("minimum") || questionLower.includes("lowest")) {
      return "To find the minimum value, use the MIN() function. Consider what conditions you need to filter by first.";
    }

    if (questionLower.includes("join") || questionLower.includes("combine")) {
      return "When you need data from multiple tables, use JOIN operations. Common types are INNER JOIN, LEFT JOIN, and RIGHT JOIN. Make sure to specify the join condition with ON.";
    }

    return `Think about what the question is asking for. You have these tables available: ${tableNames}. Consider which columns you need and how they relate to each other.`;
  }

  private static generateApproachHint(
    question: string,
    tableNames: string,
  ): string {
    const questionLower = question.toLowerCase();

    if (questionLower.includes("total") || questionLower.includes("sum")) {
      return "Start by identifying what you need to sum up. Use SUM() with the appropriate column, and consider if you need to group the results.";
    }

    if (
      questionLower.includes("group") ||
      questionLower.includes("each") ||
      questionLower.includes("per")
    ) {
      return "When you need results for each category, use GROUP BY. The columns in your SELECT statement (except aggregates) should match your GROUP BY columns.";
    }

    if (questionLower.includes("order") || questionLower.includes("sort")) {
      return "Use ORDER BY to sort your results. You can sort by multiple columns and specify ASC (default) or DESC for descending order.";
    }

    if (
      questionLower.includes("more than") ||
      questionLower.includes("greater than")
    ) {
      return "Use HAVING after GROUP BY to filter aggregated results, or use WHERE in combination with > for regular filtering.";
    }

    return `Break down the problem: 1) What columns do you need in the result? 2) What tables contain this data? 3) How do you filter or group the data? Available tables: ${tableNames}`;
  }

  /**
   * Sanitize hint to prevent leaking full solutions
   */
  private static sanitizeHint(hint: string, userQuery: string): string {
    // Remove any potential SQL code snippets that might give away the solution
    let sanitized = hint;

    // Remove common SQL patterns that might be too specific
    sanitized = sanitized.replace(/select\s+[^;]+/gi, "[SELECT statement]");
    sanitized = sanitized.replace(/from\s+\w+/gi, "FROM [table]");
    sanitized = sanitized.replace(/where\s+[^;]+/gi, "WHERE [condition]");
    sanitized = sanitized.replace(/group by\s+[^;]+/gi, "GROUP BY [columns]");
    sanitized = sanitized.replace(/order by\s+[^;]+/gi, "ORDER BY [columns]");

    // Ensure hint doesn't contain the exact user query
    if (sanitized.toLowerCase().includes(userQuery.toLowerCase())) {
      sanitized =
        "Focus on the concepts rather than the exact syntax. Think about what operations you need to perform.";
    }

    return sanitized;
  }

  /**
   * Get hint for user's query
   */
  static async getHint(
    identityId: string,
    request: HintRequest,
  ): Promise<HintResponse> {
    try {
      // Check rate limiting
      const isAllowed = await this.checkRateLimit(identityId);
      if (!isAllowed) {
        throw new Error("Rate limit exceeded: Maximum 10 hints per hour");
      }

      // Get assignment details
      const assignment = await Assignment.findById(request.assignmentId);
      if (!assignment) {
        throw new Error("Assignment not found");
      }

      // Determine hint type
      const hintType = request.hintType || "approach";

      // Generate hint
      const rawHint = this.generateHint(
        assignment,
        request.userQuery,
        hintType,
      );
      const sanitizedHint = this.sanitizeHint(rawHint, request.userQuery);

      // Generate unique request ID
      const requestId = randomUUID();

      // Log the hint request
      await HintLog.create({
        identityId,
        assignmentId: new mongoose.Types.ObjectId(request.assignmentId),
        userQuery: request.userQuery,
        hint: sanitizedHint,
        hintType,
        requestId,
      });

      return {
        hint: sanitizedHint,
        hintType,
        requestId,
      };
    } catch (error) {
      console.error("Error generating hint:", error);
      throw error;
    }
  }

  /**
   * Get hint history for a user
   */
  static async getHintHistory(
    identityId: string,
    assignmentId?: string,
  ): Promise<
    Array<{
      hint: string;
      hintType: string;
      createdAt: Date;
    }>
  > {
    try {
      const filter: any = { identityId };
      if (assignmentId) {
        filter.assignmentId = new mongoose.Types.ObjectId(assignmentId);
      }

      const hints = await HintLog.find(filter)
        .select("hint hintType createdAt")
        .sort({ createdAt: -1 })
        .limit(20);

      return hints.map((hint) => ({
        hint: hint.hint,
        hintType: hint.hintType,
        createdAt: hint.createdAt,
      }));
    } catch (error) {
      console.error("Error getting hint history:", error);
      throw error;
    }
  }
}
