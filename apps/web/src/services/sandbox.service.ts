const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface SandboxInitResponse {
  schemaName: string;
  isNew: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const initSandbox = async (assignmentId: string): Promise<SandboxInitResponse> => {
  try {
    // Get identity ID from localStorage or generate new one
    let identityId = localStorage.getItem('identityId');
    
    if (!identityId) {
      // Generate a simple UUID-like identity for guest users
      identityId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('identityId', identityId);
    }

    const response = await fetch(`${API_URL}/sandbox/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Identity-ID': identityId,
      },
      body: JSON.stringify({ assignmentId }),
    });

    const result: ApiResponse<SandboxInitResponse> = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to initialize sandbox");
    }

    // Store the returned identity ID if server generated a new one
    const returnedIdentityId = response.headers.get('X-Identity-ID');
    if (returnedIdentityId) {
      localStorage.setItem('identityId', returnedIdentityId);
    }

    return result.data;
  } catch (error) {
    console.error("Error initializing sandbox:", error);
    throw error;
  }
};
