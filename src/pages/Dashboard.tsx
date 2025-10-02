import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, ClipboardList, GraduationCap, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Enrolled Courses",
      value: "6",
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending Assignments",
      value: "3",
      icon: FileText,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Upcoming Quizzes",
      value: "2",
      icon: ClipboardList,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Average Grade",
      value: "85%",
      icon: GraduationCap,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const recentCourses = [
    { id: 1, name: "Data Structures & Algorithms", code: "CS201", progress: 75 },
    { id: 2, name: "Digital Electronics", code: "ECE301", progress: 60 },
    { id: 3, name: "Engineering Mathematics III", code: "MATH301", progress: 90 },
  ];

  const upcomingDeadlines = [
    { id: 1, title: "Algorithm Assignment #3", course: "CS201", dueDate: "2 days", type: "Assignment" },
    { id: 2, title: "Digital Logic Quiz", course: "ECE301", dueDate: "5 days", type: "Quiz" },
    { id: 3, title: "Calculus Problem Set", course: "MATH301", dueDate: "1 week", type: "Assignment" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your learning overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Courses */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Current Courses</CardTitle>
              <CardDescription>Your active course progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentCourses.map((course) => (
                <div key={course.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-sm text-muted-foreground">{course.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">{course.progress}%</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-primary transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Stay on track with your submissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingDeadlines.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.course}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-accent">{item.dueDate}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
