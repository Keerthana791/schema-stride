import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface Lecture {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  video_path: string;
  duration_sec?: number | null;
  visibility?: 'enrolled' | 'private' | 'public';
  created_by: string;
  created_at: string;
}

export const lecturesService = {
  async list(courseId: string): Promise<{ lectures: Lecture[] }> {
    const res = await apiClient.get<{ lectures: Lecture[] }>(`${API_CONFIG.ENDPOINTS.COURSES}/${courseId}/lectures`);
    return res;
  },

  async create(courseId: string, data: { title: string; description?: string; file: File }): Promise<{ lecture: Lecture }> {
    const fd = new FormData();
    fd.append('title', data.title);
    if (data.description) fd.append('description', data.description);
    fd.append('file', data.file);
    const res = await apiClient.postForm<{ lecture: Lecture }>(`${API_CONFIG.ENDPOINTS.COURSES}/${courseId}/lectures`, fd);
    return res;
  },

  async remove(lectureId: string): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/api/lectures/${lectureId}`);
    return res;
  },

  streamUrl(lectureId: string): string {
    const token = localStorage.getItem('accessToken') || '';
    return `/api/upload/lecture/${lectureId}?token=${encodeURIComponent(token)}`;
  }
};
