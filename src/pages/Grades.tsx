import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, TrendingUp, Award } from "lucide-react";
import { gradeService, GradesSummary } from "@/services/grades";
import { useToast } from "@/hooks/use-toast";

const Grades = () => {
  const { toast } = useToast();
  const [gradesSummary, setGradesSummary] = useState<GradesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const data = await gradeService.getAll();
        setGradesSummary(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load grades",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [toast]);

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
        <div>
          <h1 className="mb-2 text-3xl font-bold">Grades & Performance</h1>
          <p className="text-muted-foreground">Track your academic progress and achievements</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current GPA
              </CardTitle>
              <Award className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{gradesSummary?.gpa.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground mt-1">Out of 4.0</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Grade
              </CardTitle>
              <GraduationCap className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round(gradesSummary?.averageGrade || 0)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Credits
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {gradesSummary?.totalCredits || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This semester</p>
            </CardContent>
          </Card>
        </div>

        {/* Course Grades */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Course Breakdown</h2>
          <div className="grid gap-6">
            {gradesSummary?.grades.map((course) => (
              <Card key={course.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <CardTitle>{course.courseName}</CardTitle>
                        <Badge variant="secondary">{course.courseCode}</Badge>
                      </div>
                      <CardDescription>{course.credits} Credits · {course.category}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-success">
                        {course.total}%
                      </div>
                      <Badge variant="outline" className="mt-1">
                        Grade {course.grade}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Assignments</span>
                        <span className="font-medium">{course.assignments}%</span>
                      </div>
                      <Progress value={course.assignments} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Quizzes</span>
                        <span className="font-medium">{course.quizzes}%</span>
                      </div>
                      <Progress value={course.quizzes} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Midterm</span>
                        <span className="font-medium">
                          {course.midterm > 0 ? `${course.midterm}%` : 'Pending'}
                        </span>
                      </div>
                      <Progress value={course.midterm} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Final</span>
                        <span className="font-medium">
                          {course.final > 0 ? `${course.final}%` : 'Pending'}
                        </span>
                      </div>
                      <Progress value={course.final} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Grades;
