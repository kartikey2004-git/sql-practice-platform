const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface Assignment {
  _id: string;
  title: string;
  description: string;
  question?: string;
  sampleTables?: Array<{
    tableName: string;
    columns: Array<{ columnName: string; dataType: string }>;
    rows: Record<string, any>[];
  }>;
  expectedOutput?: {
    type: string;
    value: any;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export const fetchAssignments = async (): Promise<Assignment[]> => {
  try {
    const response = await fetch(`${API_URL}/assignments`);
    const result: ApiResponse<Assignment[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch assignments");
    }

    return result.data;
  } catch (error) {
    console.error("Error fetching assignments:", error);
    throw error;
  }
};

export const fetchAssignmentById = async (id: string): Promise<Assignment> => {
  try {
    const response = await fetch(`${API_URL}/assignments/${id}`);
    const result: ApiResponse<Assignment> = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch assignment");
    }

    return result.data;
  } catch (error) {
    console.error("Error fetching assignment:", error);
    throw error;
  }
};
