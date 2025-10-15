import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { lecturesService } from '@/services/lectures';

const LecturePlayerPage = () => {
  const { lectureId, courseId } = useParams<{ lectureId: string; courseId: string }>();
  const navigate = useNavigate();

  const src = lectureId ? lecturesService.streamUrl(lectureId) : '';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lecture Player</h1>
        <Button variant="outline" onClick={() => navigate(`/courses/${courseId}/lectures`)}>Back to lectures</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Now Playing</CardTitle>
        </CardHeader>
        <CardContent>
          {src ? (
            <video src={src} controls className="w-full rounded-lg bg-black" />
          ) : (
            <div className="text-muted-foreground">Invalid lecture.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LecturePlayerPage;
