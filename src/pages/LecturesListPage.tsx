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
    
    // Validate inputs
    if (!title.trim()) {
      toast({ title: 'Missing title', description: 'Please enter a title for the lecture', variant: 'destructive' });
      return;
    }
    
    if (!file) {
      toast({ title: 'No file selected', description: 'Please select a video file to upload', variant: 'destructive' });
      return;
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please upload a video file (MP4, WebM, or QuickTime)', 
        variant: 'destructive' 
      });
      return;
    }

    // Validate file size (e.g., 500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast({ 
        title: 'File too large', 
        description: 'Video file must be less than 500MB', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      // Show loading state
      const { id: toastId, dismiss } = toast({ 
        title: 'Uploading...', 
        description: 'Please wait while we upload your video',
        variant: 'default'
      });
      
      // Create form data
      const formData = new FormData();
      formData.append('title', title);
      if (description) formData.append('description', description);
      formData.append('file', file);

      // Log the form data for debugging
      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });

      // Call the service
      await lecturesService.create(courseId, { 
        title, 
        description, 
        file 
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setFile(null);
      
      // Update UI
      dismiss();
      toast({ 
        title: 'Success!', 
        description: 'Lecture uploaded successfully',
        variant: 'default'
      });
      
      // Reload lectures
      await load();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: 'Upload failed', 
        description: error?.message || 'An error occurred during upload. Please try again.', 
        variant: 'destructive' 
      });
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
