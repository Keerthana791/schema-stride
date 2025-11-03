import API_CONFIG from '@/config/api';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, headers = {}, ...restOptions } = options;

    const tenantId = (typeof window !== 'undefined') ? localStorage.getItem('tenantId') : null;

    const config: RequestInit = {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
        ...headers,
      },
    };

    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async postForm<T>(
    endpoint: string, 
    formData: FormData, 
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<T> {
    // Create new headers without setting Content-Type
    // The browser will automatically set it with the correct boundary
    const headers = new Headers();
    
    // Copy other headers if any
    const { headers: optionsHeaders, ...restOptions } = options;
    if (optionsHeaders) {
      if (optionsHeaders instanceof Headers) {
        // @ts-ignore - Headers.entries() is not in the TypeScript lib yet
        for (const [key, value] of optionsHeaders.entries()) {
          if (key.toLowerCase() !== 'content-type' && value) {
            headers.append(key, value);
          }
        }
      } else if (Array.isArray(optionsHeaders)) {
        optionsHeaders.forEach(([key, value]) => {
          if (key.toLowerCase() !== 'content-type' && value) {
            headers.append(key, String(value));
          }
        });
      } else {
        Object.entries(optionsHeaders as Record<string, string>).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'content-type' && value) {
            headers.append(key, String(value));
          }
        });
      }
    }
    
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      ...restOptions,
      headers,
    });
  }

  async postForm<T>(endpoint: string, formData: FormData, options?: RequestOptions): Promise<T> {
    const { requiresAuth = true, headers = {}, ...restOptions } = options || {};
    const tenantId = (typeof window !== 'undefined') ? localStorage.getItem('tenantId') : null;

    const config: RequestInit = {
      ...restOptions,
      method: 'POST',
      headers: {
        ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
        ...headers,
      },
      body: formData,
    };

    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_CONFIG.BASE_URL);
