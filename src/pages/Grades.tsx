import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, TrendingUp, Award } from "lucide-react";

const Grades = () => {
  const courses = [
    {
      id: 1,
      name: "Data Structures & Algorithms",
      code: "CS201",
      grade: 88,
      credits: 4,
      breakdown: {
        assignments: 90,
        quizzes: 85,
        midterm: 88,
        final: 0,
        participation: 95,
      },
      weights: {
        assignments: 30,
        quizzes: 20,
        midterm: 20,
        final: 25,
        participation: 5,
      },
    },
    {
      id: 2,
      name: "Digital Electronics",
      code: "ECE301",
      grade: 82,
      credits: 3,
      breakdown: {
        assignments: 85,
        quizzes: 80,
        midterm: 82,
        final: 0,
        lab: 88,
      },
      weights: {
        assignments: 25,
        quizzes: 20,
        midterm: 20,
        final: 25,
        lab: 10,
      },
    },
    {
      id: 3,
      name: "Engineering Mathematics III",
      code: "MATH301",
      grade: 92,
      credits: 4,
      breakdown: {
        assignments: 95,
        quizzes: 90,
        midterm: 92,
        final: 0,
      },
      weights: {
        assignments: 30,
        quizzes: 20,
        midterm: 25,
        final: 25,
      },
    },
    {
      id: 4,
      name: "Database Management Systems",
      code: "CS301",
      grade: 85,
      credits: 3,
      breakdown: {
        assignments: 88,
        quizzes: 82,
        project: 90,
        midterm: 80,
        final: 0,
      },
      weights: {
        assignments: 25,
        quizzes: 15,
        project: 20,
        midterm: 15,
        final: 25,
      },
    },
  ];

  const calculateGPA = () => {
    const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
    const weightedSum = courses.reduce((sum, course) => {
      const gradePoint = course.grade >= 90 ? 4.0 : 
                        course.grade >= 80 ? 3.0 : 
                        course.grade >= 70 ? 2.0 : 1.0;
      return sum + (gradePoint * course.credits);
    }, 0);
    return (weightedSum / totalCredits).toFixed(2);
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

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
              <div className="text-3xl font-bold">{calculateGPA()}</div>
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
                {Math.round(courses.reduce((sum, c) => sum + c.grade, 0) / courses.length)}%
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
                {courses.reduce((sum, c) => sum + c.credits, 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This semester</p>
            </CardContent>
          </Card>
        </div>

        {/* Course Grades */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Course Breakdown</h2>
          <div className="grid gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <CardTitle>{course.name}</CardTitle>
                        <Badge variant="secondary">{course.code}</Badge>
                      </div>
                      <CardDescription>{course.credits} Credits</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-success">
                        {course.grade}%
                      </div>
                      <Badge variant="outline" className="mt-1">
                        Grade {getLetterGrade(course.grade)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {Object.entries(course.breakdown).map(([category, score]) => {
                      const weight = course.weights[category as keyof typeof course.weights];
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize text-muted-foreground">
                              {category} ({weight}%)
                            </span>
                            <span className="font-medium">
                              {score > 0 ? `${score}%` : 'Pending'}
                            </span>
                          </div>
                          <Progress value={score} className="h-2" />
                        </div>
                      );
                    })}
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
