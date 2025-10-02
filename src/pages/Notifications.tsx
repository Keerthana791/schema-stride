import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, BookOpen, FileText, AlertCircle, GraduationCap } from "lucide-react";

const Notifications = () => {
  const notifications = [
    {
      id: 1,
      type: "assignment",
      title: "New Assignment Posted",
      message: "Dr. Sarah Johnson posted a new assignment in Data Structures & Algorithms",
      course: "CS201",
      time: "2 hours ago",
      read: false,
      icon: FileText,
      color: "text-primary",
    },
    {
      id: 2,
      type: "grade",
      title: "Assignment Graded",
      message: "Your SQL Database Design assignment has been graded: 92/100",
      course: "CS301",
      time: "5 hours ago",
      read: false,
      icon: GraduationCap,
      color: "text-success",
    },
    {
      id: 3,
      type: "reminder",
      title: "Quiz Reminder",
      message: "Digital Logic Quiz 2 is scheduled for Oct 8, 2025",
      course: "ECE301",
      time: "1 day ago",
      read: false,
      icon: AlertCircle,
      color: "text-secondary",
    },
    {
      id: 4,
      type: "announcement",
      title: "Course Material Updated",
      message: "New lecture slides available for Engineering Mathematics III",
      course: "MATH301",
      time: "2 days ago",
      read: true,
      icon: BookOpen,
      color: "text-accent",
    },
    {
      id: 5,
      type: "grade",
      title: "Quiz Results Published",
      message: "Your Network Protocols Quiz score: 16/20 (80%)",
      course: "CS302",
      time: "3 days ago",
      read: true,
      icon: GraduationCap,
      color: "text-success",
    },
    {
      id: 6,
      type: "assignment",
      title: "Assignment Due Soon",
      message: "Algorithm Implementation Project is due in 2 days",
      course: "CS201",
      time: "3 days ago",
      read: true,
      icon: AlertCircle,
      color: "text-destructive",
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with course activities and announcements
            </p>
          </div>
          <Button variant="outline">
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        </div>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-4">
            <Bell className="h-5 w-5 text-primary" />
            <span className="font-medium">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <Card
                key={notification.id}
                className={`shadow-card transition-all hover:shadow-elevated ${
                  !notification.read ? 'border-l-4 border-l-primary' : ''
                }`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`rounded-lg bg-background p-2 ${notification.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <Badge variant="default">New</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline">{notification.course}</Badge>
                      <span>{notification.time}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;
