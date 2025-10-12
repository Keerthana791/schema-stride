import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  is_active: boolean;
  created_at: string;
  student_id?: string;
  teacher_id?: string;
  department?: string;
  roles?: Array<{
    id: string;
    name: string;
    description: string;
    assigned_at: string;
    expires_at?: string;
  }>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  user_count: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: 'teacher' | 'student';
  studentId?: string;
  teacherId?: string;
  department?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  specialization?: string;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  department?: string;
  specialization?: string;
  isActive?: boolean;
}

export const adminService = {
  async getUsers(): Promise<{ users: User[] }> {
    const response = await apiClient.get<{ users: User[] }>(API_CONFIG.ENDPOINTS.ADMIN_USERS);
    return response;
  },

  async getUser(id: string): Promise<{ user: User }> {
    const response = await apiClient.get<{ user: User }>(API_CONFIG.ENDPOINTS.ADMIN_USER_BY_ID(id));
    return response;
  },

  async createUser(userData: CreateUserData): Promise<{ message: string; user: User }> {
    const response = await apiClient.post<{ message: string; user: User }>(
      API_CONFIG.ENDPOINTS.ADMIN_CREATE_USER,
      userData
    );
    return response;
  },

  async updateUser(id: string, userData: UpdateUserData): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      API_CONFIG.ENDPOINTS.ADMIN_UPDATE_USER(id),
      userData
    );
    return response;
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      API_CONFIG.ENDPOINTS.ADMIN_DELETE_USER(id)
    );
    return response;
  },

  async getRoles(): Promise<{ roles: Role[] }> {
    const response = await apiClient.get<{ roles: Role[] }>(API_CONFIG.ENDPOINTS.ADMIN_ROLES);
    return response;
  },

  async assignRole(userId: string, roleId: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      API_CONFIG.ENDPOINTS.ADMIN_ASSIGN_ROLE(userId),
      { roleId }
    );
    return response;
  },

  async removeRole(userId: string, roleId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      API_CONFIG.ENDPOINTS.ADMIN_REMOVE_ROLE(userId, roleId)
    );
    return response;
  }
};

