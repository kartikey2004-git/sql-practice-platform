const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface SandboxInitResponse {
  schemaName: string;
  isNew: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTime: number;
}

export interface GradingResult {
  passed: boolean;
  executionTime: number;
  rowCount: number;
  reason?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const initSandbox = async (
  assignmentId: string,
): Promise<SandboxInitResponse> => {
  try {
    // Get identity ID from localStorage or generate new one
    let identityId = localStorage.getItem("identityId");

    if (!identityId) {
      // Generate a simple UUID-like identity for guest users
      identityId =
        "guest_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("identityId", identityId);
    }

    const response = await fetch(`${API_URL}/sandbox/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Identity-ID": identityId,
      },
      body: JSON.stringify({ assignmentId }),
    });

    const result: ApiResponse<SandboxInitResponse> = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to initialize sandbox");
    }

    // Store the returned identity ID if server generated a new one
    const returnedIdentityId = response.headers.get("X-Identity-ID");
    if (returnedIdentityId) {
      localStorage.setItem("identityId", returnedIdentityId);
    }

    return result.data;
  } catch (error) {
    console.error("Error initializing sandbox:", error);
    throw error;
  }
};

export const executeQuery = async (
  assignmentId: string,
  query: string,
): Promise<QueryResult> => {
  try {
    // Get identity ID from localStorage
    const identityId = localStorage.getItem("identityId");

    if (!identityId) {
      throw new Error("Identity not found. Please refresh the page.");
    }

    const response = await fetch(`${API_URL}/sandbox/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Identity-ID": identityId,
      },
      body: JSON.stringify({ assignmentId, query }),
    });

    const result = await response.json();

    // Check if response has a expected structure
    if (!result.success) {
      throw new Error(result.message || "Failed to execute query");
    }

    // Extract the actual query result data
    const queryResult = result.data;

    // Validate the result structure
    if (!queryResult || typeof queryResult !== "object") {
      throw new Error("Invalid response format from server");
    }

    return queryResult;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
};

export const gradeSubmission = async (
  assignmentId: string,
  query: string,
): Promise<GradingResult> => {
  try {
    // Get identity ID from localStorage
    const identityId = localStorage.getItem("identityId");

    if (!identityId) {
      throw new Error("Identity not found. Please refresh the page.");
    }

    const response = await fetch(`${API_URL}/sandbox/grade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Identity-ID": identityId,
      },
      body: JSON.stringify({ assignmentId, query }),
    });

    const result = await response.json();

    // Check if response has a expected structure
    if (!result.success) {
      throw new Error(result.message || "Failed to grade submission");
    }

    // Extract the actual grading result data
    const gradingResult = result.data;

    // Validate the result structure
    if (!gradingResult || typeof gradingResult !== "object") {
      throw new Error("Invalid response format from server");
    }

    return gradingResult;
  } catch (error) {
    console.error("Error grading submission:", error);
    throw error;
  }
};
