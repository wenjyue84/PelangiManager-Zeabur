/**
 * Enhanced Error Handling for PelangiManager
 * Provides detailed error information and debugging context
 */

export interface DetailedError {
  message: string;
  details?: string;
  endpoint?: string;
  statusCode?: number;
  errorCode?: string;
  solution?: string;
  debugInfo?: {
    timestamp: string;
    userAgent: string;
    url: string;
    method?: string;
    requestData?: any;
    responseData?: any;
  };
}

export interface ErrorToastOptions {
  title: string;
  description: string;
  variant?: "default" | "destructive";
  debugDetails?: string;
}

/**
 * Parse API error response and extract detailed information
 */
export async function parseApiError(error: any, endpoint?: string, method?: string, requestData?: any): Promise<DetailedError> {
  const timestamp = new Date().toISOString();
  const userAgent = navigator.userAgent;
  const url = window.location.href;

  // Initialize base error object
  let detailedError: DetailedError = {
    message: "Unknown error occurred",
    endpoint,
    debugInfo: {
      timestamp,
      userAgent,
      url,
      method,
      requestData,
    }
  };

  try {
    // Handle different error types
    if (error instanceof Response) {
      // Response object from fetch
      detailedError.statusCode = error.status;
      
      try {
        const responseText = await error.text();
        let responseData: any = responseText;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          // Response is not JSON, keep as text
        }
        
        detailedError.debugInfo!.responseData = responseData;
        
        if (typeof responseData === 'object' && responseData.message) {
          detailedError.message = responseData.message;
          detailedError.details = responseData.details;
          detailedError.solution = responseData.solution;
          detailedError.errorCode = responseData.errorCode;
        } else {
          detailedError.message = responseText || error.statusText || `HTTP ${error.status} Error`;
        }
      } catch {
        detailedError.message = error.statusText || `HTTP ${error.status} Error`;
      }
    } else if (error instanceof Error) {
      // Standard Error object
      detailedError.message = error.message;
      
      // Parse status code from error message if present (format: "404: Error message")
      const statusMatch = error.message.match(/^(\d{3}):\s*(.+)$/);
      if (statusMatch) {
        detailedError.statusCode = parseInt(statusMatch[1]);
        detailedError.message = statusMatch[2];
      }
    } else if (typeof error === 'string') {
      detailedError.message = error;
    } else if (error && typeof error === 'object') {
      // Object with error properties
      detailedError.message = error.message || error.error || error.description || "Unknown error";
      detailedError.statusCode = error.status || error.statusCode;
      detailedError.details = error.details;
      detailedError.solution = error.solution;
      detailedError.errorCode = error.errorCode;
    }

    // Enhance error with contextual information based on status code
    detailedError = enhanceErrorWithContext(detailedError);

  } catch (parseError) {
    console.error('Error parsing error:', parseError);
    detailedError.message = "Failed to parse error details";
    detailedError.details = String(error);
  }

  return detailedError;
}

/**
 * Enhance error with contextual information and solutions
 */
function enhanceErrorWithContext(error: DetailedError): DetailedError {
  const enhanced = { ...error };

  switch (enhanced.statusCode) {
    case 401:
      enhanced.message = "Authentication Required";
      enhanced.details = "Your session has expired or you're not logged in.";
      enhanced.solution = "Please log in again to continue.";
      enhanced.errorCode = "AUTH_REQUIRED";
      break;
      
    case 403:
      enhanced.message = "Access Forbidden";
      enhanced.details = "You don't have permission to perform this action.";
      enhanced.solution = "Contact an administrator if you need access to this feature.";
      enhanced.errorCode = "ACCESS_FORBIDDEN";
      break;
      
    case 404:
      enhanced.message = "Endpoint Not Found";
      enhanced.details = `The API endpoint ${enhanced.endpoint} was not found on the server.`;
      enhanced.solution = "This might be a temporary server issue. Try refreshing the page or contact support.";
      enhanced.errorCode = "ENDPOINT_NOT_FOUND";
      break;
      
    case 409:
      enhanced.message = "Conflict Error";
      enhanced.details = "The requested action conflicts with the current state.";
      enhanced.solution = "Check if the resource is already in use or refresh the page to get the latest state.";
      enhanced.errorCode = "RESOURCE_CONFLICT";
      break;
      
    case 422:
      enhanced.message = "Validation Error";
      enhanced.details = "The submitted data failed server validation.";
      enhanced.solution = "Please check your input and try again.";
      enhanced.errorCode = "VALIDATION_ERROR";
      break;
      
    case 500:
      enhanced.message = "Server Error";
      enhanced.details = "An internal server error occurred.";
      enhanced.solution = "This is a server-side issue. Please try again in a moment or contact support.";
      enhanced.errorCode = "INTERNAL_SERVER_ERROR";
      break;
      
    case 502:
    case 503:
    case 504:
      enhanced.message = "Server Unavailable";
      enhanced.details = "The server is temporarily unavailable.";
      enhanced.solution = "Please wait a moment and try again. If the problem persists, the server may be restarting.";
      enhanced.errorCode = "SERVER_UNAVAILABLE";
      break;
      
    default:
      if (enhanced.message.includes('Failed to fetch') || enhanced.message.includes('NetworkError')) {
        enhanced.message = "Connection Failed";
        enhanced.details = "Unable to connect to the server. This could be a network issue or the server may be down.";
        enhanced.solution = "Check your internet connection and ensure the development server is running (npm run dev).";
        enhanced.errorCode = "CONNECTION_FAILED";
      }
      break;
  }

  // Add specific guidance for common scenarios
  if (enhanced.endpoint?.includes('/api/guest-tokens')) {
    if (enhanced.statusCode === 400) {
      enhanced.details = enhanced.details || "The guest token creation failed due to invalid data or capsule unavailability.";
      enhanced.solution = "Check if the selected capsule is available and all required fields are filled correctly.";
    }
  }

  if (enhanced.endpoint?.includes('/api/guests/checkin')) {
    if (enhanced.statusCode === 400) {
      enhanced.details = enhanced.details || "Guest check-in failed due to validation errors or capsule conflicts.";
      enhanced.solution = "Verify all guest information is correct and the selected capsule is available.";
    }
  }

  return enhanced;
}

/**
 * Create user-friendly toast message from detailed error
 */
export function createErrorToast(error: DetailedError): ErrorToastOptions {
  let description = error.message;
  
  if (error.details) {
    description += `\n\nDetails: ${error.details}`;
  }
  
  if (error.solution) {
    description += `\n\nSolution: ${error.solution}`;
  }

  // Add debug information in development
  let debugDetails = "";
  if (process.env.NODE_ENV === 'development' && error.debugInfo) {
    debugDetails = `Debug Info:
• Timestamp: ${error.debugInfo.timestamp}
• Endpoint: ${error.endpoint || 'Unknown'}
• Status: ${error.statusCode || 'Unknown'}
• Error Code: ${error.errorCode || 'Unknown'}`;

    if (error.debugInfo.method && error.debugInfo.requestData) {
      debugDetails += `
• Request: ${error.debugInfo.method} ${error.endpoint}
• Data: ${JSON.stringify(error.debugInfo.requestData, null, 2)}`;
    }
  }

  return {
    title: error.statusCode === 401 ? "Authentication Required" : "Operation Failed",
    description,
    variant: "destructive",
    debugDetails,
  };
}

/**
 * Enhanced API request wrapper with detailed error handling
 */
export async function apiRequestWithDetailedErrors(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(data ? { "Content-Type": "application/json" } : {})
    };
    
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      // Parse the detailed error from the server
      const detailedError = await parseApiError(response, url, method, data);
      
      // Create a new error with the detailed information
      const errorMessage = JSON.stringify(detailedError);
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('{')) {
      // Re-throw detailed errors as-is
      throw error;
    }
    
    // Handle network errors and other issues
    const detailedError = await parseApiError(error, url, method, data);
    const errorMessage = JSON.stringify(detailedError);
    throw new Error(errorMessage);
  }
}

/**
 * Utility to extract detailed error from mutation error
 */
export function extractDetailedError(error: any): DetailedError {
  if (error instanceof Error) {
    try {
      // Try to parse as detailed error JSON
      const detailedError = JSON.parse(error.message);
      if (detailedError && typeof detailedError === 'object' && detailedError.message) {
        return detailedError as DetailedError;
      }
    } catch {
      // Not a detailed error JSON, create one
    }
  }
  
  // Fallback to basic error
  return {
    message: error?.message || String(error) || "Unknown error occurred",
    debugInfo: {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }
  };
}