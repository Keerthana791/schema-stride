import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface Course {
  id: string;
  name: string; // mapped from title
  code: string; // mapped from course_code
  instructor: string; // mapped from teacher first/last/email
  students: number; // mapped from enrollment_count when available
  semester?: string | null;
  description?: string | null;
  progress: number; // local computed/placeholder
  credits?: number | null;
  branchName?: string | null; // mapped from branch_name
}

export interface CreateCoursePayload {
  courseCode: string;
  title: string;
  description?: string;
  credits?: number;
  semester?: string;
  academicYear?: string;
  branch: string; // e.g., CSE, ECE
  teacherId?: string; // required if admin
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {}

export const courseService = {
  async getAll(branch?: string): Promise<Course[]> {
    const query = branch ? `${API_CONFIG.ENDPOINTS.COURSES}?branch=${encodeURIComponent(branch)}` : API_CONFIG.ENDPOINTS.COURSES;
    const res = await apiClient.get<{ courses: any[] }>(query);
    const rows = res?.courses ?? [];
    return rows.map((r) => ({
      id: r.id,
      name: r.title ?? r.name ?? '',
      code: r.course_code ?? r.code ?? '',
      instructor: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.teacher_email || '',
      students: Number(r.enrollment_count ?? 0),
      semester: r.semester ?? null,
      description: r.description ?? null,
      progress: 0,
      credits: r.credits ?? null,
      branchName: r.branch_name ?? null,
    } as Course));
  },

  async getById(id: string): Promise<Course> {
    const res = await apiClient.get<{ course: any }>(API_CONFIG.ENDPOINTS.COURSE_BY_ID(id));
    const r = res.course;
    return {
      id: r.id,
      name: r.title ?? r.name ?? '',
      code: r.course_code ?? r.code ?? '',
      instructor: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.teacher_email || '',
      students: Number(r.enrollment_count ?? 0),
      semester: r.semester ?? null,
      description: r.description ?? null,
      progress: 0,
      credits: r.credits ?? null,
      branchName: r.branch_name ?? null,
    } as Course;
  },

  async create(payload: CreateCoursePayload): Promise<Course> {
    const res = await apiClient.post<{ course: any }>(API_CONFIG.ENDPOINTS.COURSES, payload);
    const r = res.course;
    return {
      id: r.id,
      name: r.title ?? '',
      code: r.course_code ?? '',
      instructor: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.teacher_email || '',
      students: Number(r.enrollment_count ?? 0),
      semester: r.semester ?? null,
      description: r.description ?? null,
      progress: 0,
      credits: r.credits ?? null,
      branchName: r.branch_name ?? null,
    } as Course;
  },

  async update(id: string, payload: UpdateCoursePayload): Promise<Course> {
    const res = await apiClient.put<{ course: any }>(API_CONFIG.ENDPOINTS.COURSE_BY_ID(id), payload);
    const r = res.course;
    return {
      id: r.id,
      name: r.title ?? '',
      code: r.course_code ?? '',
      instructor: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.teacher_email || '',
      students: Number(r.enrollment_count ?? 0),
      semester: r.semester ?? null,
      description: r.description ?? null,
      progress: 0,
      credits: r.credits ?? null,
      branchName: r.branch_name ?? null,
    } as Course;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(API_CONFIG.ENDPOINTS.COURSE_BY_ID(id));
  },

  async enroll(courseId: string): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.ENROLL(courseId));
  }
};
