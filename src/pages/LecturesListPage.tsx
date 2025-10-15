import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { lecturesService, Lecture } from '@/services/lectures';
import { useAuth } from '@/contexts/AuthContext';

const LecturesListPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const isStaff = user?.role === 'admin' || user?.role === 'teacher';

  const load = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const res = await lecturesService.list(courseId);
      setLectures(res.lectures);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to load lectures', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    if (!title || !file) {
      toast({ title: 'Missing data', description: 'Title and video file are required', variant: 'destructive' });
      return;
    }
    try {
      await lecturesService.create(courseId, { title, description, file });
      setTitle('');
      setDescription('');
      setFile(null);
      toast({ title: 'Uploaded', description: 'Lecture uploaded successfully' });
      await load();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Please try again', variant: 'destructive' });
    }
  };

  const onDelete = async (lectureId: string) => {
    try {
      await lecturesService.remove(lectureId);
      toast({ title: 'Deleted', description: 'Lecture removed' });
      await load();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Please try again', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lectures</h1>
          <p className="text-muted-foreground">Manage and watch lecture videos for this course</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </div>

      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Lecture</CardTitle>
            <CardDescription>Add a new lecture video to this course</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onUpload} className="space-y-4">
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div className="flex justify-end">
                <Button type="submit">Upload</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {lectures.map((lec) => (
          <Card key={lec.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{lec.title}</CardTitle>
                {isStaff && (
                  <Button variant="outline" size="sm" onClick={() => onDelete(lec.id)}>Delete</Button>
                )}
              </div>
              {lec.description ? <CardDescription>{lec.description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex justify-end">
              <Link to={`/courses/${lec.course_id}/lectures/${lec.id}`}>
                <Button>Play</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {lectures.length === 0 && (
          <div className="text-muted-foreground">No lectures yet.</div>
        )}
      </div>
    </div>
  );
};

export default LecturesListPage;
