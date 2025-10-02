import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Calendar, ArrowRight } from "lucide-react";

const Courses = () => {
  const courses = [
    {
      id: 1,
      name: "Data Structures & Algorithms",
      code: "CS201",
      instructor: "Dr. Sarah Johnson",
      students: 45,
      semester: "Fall 2025",
      description: "Advanced data structures, algorithm design and analysis",
      progress: 75,
    },
    {
      id: 2,
      name: "Digital Electronics",
      code: "ECE301",
      instructor: "Prof. Michael Chen",
      students: 52,
      semester: "Fall 2025",
      description: "Digital logic design, sequential circuits, and microprocessors",
      progress: 60,
    },
    {
      id: 3,
      name: "Engineering Mathematics III",
      code: "MATH301",
      instructor: "Dr. Emily Roberts",
      students: 60,
      semester: "Fall 2025",
      description: "Differential equations, Laplace transforms, and Fourier series",
      progress: 90,
    },
    {
      id: 4,
      name: "Database Management Systems",
      code: "CS301",
      instructor: "Prof. David Kumar",
      students: 38,
      semester: "Fall 2025",
      description: "Relational databases, SQL, normalization, and transactions",
      progress: 45,
    },
    {
      id: 5,
      name: "Computer Networks",
      code: "CS302",
      instructor: "Dr. Lisa Anderson",
      students: 42,
      semester: "Fall 2025",
      description: "Network protocols, TCP/IP, routing, and network security",
      progress: 55,
    },
    {
      id: 6,
      name: "Operating Systems",
      code: "CS303",
      instructor: "Prof. James Wilson",
      students: 48,
      semester: "Fall 2025",
      description: "Process management, memory management, and file systems",
      progress: 70,
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">My Courses</h1>
            <p className="text-muted-foreground">Manage and track your enrolled courses</p>
          </div>
          <Button>
            <BookOpen className="mr-2 h-4 w-4" />
            Browse All Courses
          </Button>
        </div>

        {/* Courses Grid */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="shadow-card transition-shadow hover:shadow-elevated">
              <CardHeader>
                <div className="mb-2 flex items-start justify-between">
                  <Badge variant="secondary">{course.code}</Badge>
                  <Badge variant="outline">{course.semester}</Badge>
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
