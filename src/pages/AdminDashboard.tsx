import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BookOpen, 
  FileText, 
  HelpCircle, 
  TrendingUp, 
  UserPlus,
  Settings,
  BarChart3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { dashboardService, DashboardStats, UserStats } from '@/services/dashboard';
import { adminService, User } from '@/services/admin';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsResponse, userStatsResponse, usersResponse] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getUserStats(),
        adminService.getUsers()
      ]);
      
      setDashboardStats(statsResponse);
      setUserStats(userStatsResponse);
      setUsers(usersResponse.users);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your institution's learning management system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.stats.students || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active students in the system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.stats.teachers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active teachers in the system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.stats.courses || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Courses currently available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.stats.enrollments || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active course enrollments
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Grade Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Overall performance across all courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Grade</span>
                    <span className="font-semibold">
                      {dashboardStats?.gradeStats.average_grade?.toFixed(1) || '0.0'}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {dashboardStats?.gradeStats.a_grades || 0}
                      </div>
                      <div className="text-sm text-gray-600">A Grades (90%+)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {dashboardStats?.gradeStats.b_grades || 0}
                      </div>
                      <div className="text-sm text-gray-600">B Grades (80-89%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {dashboardStats?.gradeStats.c_grades || 0}
                      </div>
                      <div className="text-sm text-gray-600">C Grades (70-79%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {dashboardStats?.gradeStats.failing_grades || 0}
                      </div>
                      <div className="text-sm text-gray-600">Below 70%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest assignments and enrollments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Recent Assignments</h4>
                    <div className="space-y-2">
                      {dashboardStats?.recentActivity.assignments.slice(0, 3).map((assignment, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="truncate">{assignment.title}</span>
                          <span className="text-gray-500">
                            {new Date(assignment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Recent Enrollments</h4>
                    <div className="space-y-2">
                      {dashboardStats?.recentActivity.enrollments.slice(0, 3).map((enrollment, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="truncate">
                            {enrollment.first_name} {enrollment.last_name}
                          </span>
                          <span className="text-gray-500">
                            {new Date(enrollment.enrollment_date).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage students, teachers, and administrators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.student_id && (
                          <p className="text-xs text-gray-500">Student ID: {user.student_id}</p>
                        )}
                        {user.teacher_id && (
                          <p className="text-xs text-gray-500">Teacher ID: {user.teacher_id}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'teacher' ? 'secondary' : 'outline'}>
                        {user.role}
                      </Badge>
                      <Badge variant={user.is_active ? 'default' : 'destructive'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Enrollment Analytics</CardTitle>
              <CardDescription>Top courses by enrollment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardStats?.courseEnrollments.map((course, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="text-sm text-gray-600">{course.course_code}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{course.enrollment_count}</div>
                      <div className="text-sm text-gray-600">enrollments</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;



