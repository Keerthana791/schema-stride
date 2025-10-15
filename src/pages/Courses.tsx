import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, ArrowRight } from "lucide-react";
import { courseService, Course } from "@/services/courses";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Courses = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<string | undefined>(undefined);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleEnroll = async (id: string) => {
    try {
      await courseService.enroll(id);
      toast({ title: "Enrolled", description: "You have been enrolled in the course." });
    } catch (e: any) {
      toast({ title: "Enrollment failed", description: e?.message || "Please try again", variant: "destructive" });
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = user?.role === 'student'
          ? await courseService.getAvailable(branch)
          : await courseService.getAll(branch);
        setCourses(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load courses",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    fetchCourses();
  }, [toast, branch, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="mb-2 text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">Manage and track your enrolled courses</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={branch ?? "ALL"} onValueChange={(v) => setBranch(v === 'ALL' ? undefined : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Branches</SelectItem>
              <SelectItem value="CSE">CSE</SelectItem>
              <SelectItem value="ECE">ECE</SelectItem>
              <SelectItem value="EEE">EEE</SelectItem>
              <SelectItem value="IT">IT</SelectItem>
              <SelectItem value="ME">ME</SelectItem>
              <SelectItem value="CE">CE</SelectItem>
              <SelectItem value="AI_ML">AI/ML</SelectItem>
              <SelectItem value="DS">DS</SelectItem>
            </SelectContent>
          </Select>
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Button onClick={() => navigate('/courses/new')}>New Course</Button>
          )}
          <Button>
            <BookOpen className="mr-2 h-4 w-4" />
            Browse All Courses
          </Button>
        </div>
      </div>

      {courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">No courses found</h2>
          <p className="text-muted-foreground mb-6">Try changing the branch filter or create a new course.</p>
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Button onClick={() => navigate('/courses/new')}>Create Course</Button>
          )}
        </div>
      )}

      {courses.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="shadow-card transition-shadow hover:shadow-elevated">
              <CardHeader>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex gap-2">
                    <Badge variant="secondary">{course.code}</Badge>
                    {course.branchName ? <Badge variant="outline">{course.branchName}</Badge> : null}
                  </div>
                  {course.semester ? <Badge variant="outline">{course.semester}</Badge> : null}
                </div>
                <CardTitle className="text-xl">{course.name}</CardTitle>
                <CardDescription>{course.instructor}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{course.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{course.students} students</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-primary transition-all" style={{ width: `${course.progress}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {user?.role === 'student' ? (
                    <Button className="w-full" onClick={() => handleEnroll(course.id)}>
                      Enroll Now
                    </Button>
                  ) : (
                    <Button variant="secondary" className="w-full">
                      View Course
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/courses/${course.id}/lectures`)}>
                    Lectures
                    <BookOpen className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Courses;
