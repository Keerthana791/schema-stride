import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, ArrowRight } from "lucide-react";
import { courseService, Course } from "@/services/courses";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Courses = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await courseService.getAll(branch);
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
  }, [toast, branch]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="mb-2 text-3xl font-bold">My Courses</h1>
            <p className="text-muted-foreground">Manage and track your enrolled courses</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={branch ?? ""} onValueChange={(v) => setBranch(v || undefined)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Branches</SelectItem>
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
            <Button>
              <BookOpen className="mr-2 h-4 w-4" />
              Browse All Courses
            </Button>
          </div>
        </div>

        {/* Courses Grid */}
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

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-primary transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                <Button variant="secondary" className="w-full">
                  View Course
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Courses;
