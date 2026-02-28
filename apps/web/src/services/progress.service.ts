const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface ProgressData {
  lastQuery: string;
  attemptCount: number;
  isCompleted: boolean;
  completedAt?: Date;
  lastAttemptAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const getProgress = async (assignmentId: string): Promise<ProgressData> => {
  try {
    const identityId = localStorage.getItem("identityId");

    if (!identityId) {
      throw new Error("Identity not found. Please refresh the page.");
    }

    const response = await fetch(`${API_URL}/progress/${assignmentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Identity-ID": identityId,
      },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to get progress");
    }

    return result.data;
  } catch (error) {
    console.error("Error getting progress:", error);
    throw error;
  }
};

export const updateProgress = async (
  assignmentId: string,
  updates: {
    lastQuery?: string;
    incrementAttempt?: boolean;
    markCompleted?: boolean;
  },
): Promise<ProgressData> => {
  try {
    const identityId = localStorage.getItem("identityId");

    if (!identityId) {
      throw new Error("Identity not found. Please refresh the page.");
    }

    const response = await fetch(`${API_URL}/progress/${assignmentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Identity-ID": identityId,
      },
      body: JSON.stringify(updates),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to update progress");
    }

    return result.data;
  } catch (error) {
    console.error("Error updating progress:", error);
    throw error;
  }
};

export const getAllProgress = async (): Promise<
  Array<{
    assignmentId: string;
    progress: ProgressData;
  }>
> => {
  try {
    const identityId = localStorage.getItem("identityId");

    if (!identityId) {
      throw new Error("Identity not found. Please refresh the page.");
    }

    const response = await fetch(`${API_URL}/progress/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Identity-ID": identityId,
      },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to get all progress");
    }

    return result.data;
  } catch (error) {
    console.error("Error getting all progress:", error);
    throw error;
  }
};
