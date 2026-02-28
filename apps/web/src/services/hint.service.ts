const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const getHint = async (
  assignmentId: string,
  userQuery: string,
  hintType?: "syntax" | "logic" | "approach",
): Promise<HintResponse> => {
  try {
    // Get identity ID from localStorage
    const identityId = localStorage.getItem("identityId");

    if (!identityId) {
      throw new Error("Identity not found. Please refresh the page.");
    }

    const response = await fetch(`${API_URL}/hints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Identity-ID": identityId,
      },
      body: JSON.stringify({ assignmentId, userQuery, hintType }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to get hint");
    }

    return result.data;
  } catch (error) {
    console.error("Error getting hint:", error);
    throw error;
  }
};

export const getHintHistory = async (
  assignmentId?: string,
): Promise<Array<{
  hint: string;
  hintType: string;
  createdAt: Date;
}>> => {
  try {
    const identityId = localStorage.getItem("identityId");

    if (!identityId) {
      throw new Error("Identity not found. Please refresh the page.");
    }

    const url = assignmentId 
      ? `${API_URL}/hints/history?assignmentId=${assignmentId}`
      : `${API_URL}/hints/history`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Identity-ID": identityId,
      },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to get hint history");
    }

    return result.data;
  } catch (error) {
    console.error("Error getting hint history:", error);
    throw error;
  }
};
