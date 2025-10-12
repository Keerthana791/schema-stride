import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, ClipboardList, GraduationCap } from "lucide-react";
import { dashboardService, UserStats } from "@/services/dashboard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [data, setData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await dashboardService.getUserStats();
        setData(userData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  const stats = data?.role === 'student' ? [
    {
      title: "Enrolled Courses",
      value: data?.userStats.enrolledCourses?.toString() || "0",
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending Assignments",
      value: data?.userStats.pendingAssignments?.toString() || "0",
      icon: FileText,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Upcoming Quizzes",
      value: data?.userStats.upcomingQuizzes?.toString() || "0",
      icon: ClipboardList,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Average Grade",
      value: `${data?.userStats.averageGrade || 0}%`,
      icon: GraduationCap,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ] : [
    {
      title: "My Courses",
      value: data?.userStats.myCourses?.toString() || "0",
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Students",
      value: data?.userStats.totalStudents?.toString() || "0",
      icon: GraduationCap,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Pending Submissions",
      value: data?.userStats.pendingSubmissions?.toString() || "0",
      icon: FileText,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Average Class Grade",
      value: `${data?.userStats.averageClassGrade || 0}%`,
      icon: ClipboardList,
      color: "text-success",
      bgColor: "bg-success/10",
    },
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

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Welcome to Your Dashboard</CardTitle>
            <CardDescription>
              {data?.role === 'student' 
                ? 'Track your learning progress and stay on top of your assignments'
                : 'Manage your courses and monitor student progress'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your stats are displayed above. Use the navigation menu to access courses, assignments, and more.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
