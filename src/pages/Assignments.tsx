import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const Assignments = () => {
  const assignments = {
    pending: [
      {
        id: 1,
        title: "Algorithm Implementation Project",
        course: "CS201 - Data Structures",
        dueDate: "2025-10-05",
        daysLeft: 2,
        points: 100,
        description: "Implement AVL tree and Red-Black tree data structures",
      },
      {
        id: 2,
        title: "Digital Logic Circuit Design",
        course: "ECE301 - Digital Electronics",
        dueDate: "2025-10-08",
        daysLeft: 5,
        points: 80,
        description: "Design a 4-bit ALU using logic gates",
      },
      {
        id: 3,
        title: "Differential Equations Problem Set",
        course: "MATH301 - Engineering Math",
        dueDate: "2025-10-10",
        daysLeft: 7,
        points: 50,
        description: "Solve complex differential equations using Laplace transforms",
      },
    ],
    submitted: [
      {
        id: 4,
        title: "SQL Database Design",
        course: "CS301 - DBMS",
        submittedDate: "2025-09-28",
        points: 100,
        grade: 92,
        status: "graded",
      },
      {
        id: 5,
        title: "Network Protocol Analysis",
        course: "CS302 - Computer Networks",
        submittedDate: "2025-09-25",
        points: 75,
        grade: null,
        status: "pending",
      },
    ],
    graded: [
      {
        id: 6,
        title: "Process Scheduling Algorithms",
        course: "CS303 - Operating Systems",
        submittedDate: "2025-09-20",
        gradedDate: "2025-09-22",
        points: 100,
        grade: 88,
      },
      {
        id: 7,
        title: "Binary Search Tree Implementation",
        course: "CS201 - Data Structures",
        submittedDate: "2025-09-15",
        gradedDate: "2025-09-18",
        points: 80,
        grade: 95,
      },
    ],
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="mb-2 text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground">Track and manage your course assignments</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({assignments.pending.length})
            </TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted ({assignments.submitted.length})
            </TabsTrigger>
            <TabsTrigger value="graded">
              Graded ({assignments.graded.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Assignments */}
          <TabsContent value="pending" className="space-y-4">
            {assignments.pending.map((assignment) => (
              <Card key={assignment.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle>{assignment.title}</CardTitle>
                      </div>
                      <CardDescription>{assignment.course}</CardDescription>
                    </div>
                    <Badge variant={assignment.daysLeft <= 2 ? "destructive" : "secondary"}>
                      {assignment.daysLeft} days left
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{assignment.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{assignment.points} points</span>
                      </div>
                    </div>
                    <Button>Submit Assignment</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Submitted Assignments */}
          <TabsContent value="submitted" className="space-y-4">
            {assignments.submitted.map((assignment) => (
              <Card key={assignment.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-secondary" />
                        <CardTitle>{assignment.title}</CardTitle>
                      </div>
                      <CardDescription>{assignment.course}</CardDescription>
                    </div>
                    <Badge variant={assignment.status === "graded" ? "default" : "outline"}>
                      {assignment.status === "graded" ? "Graded" : "Pending Review"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>Submitted: {new Date(assignment.submittedDate).toLocaleDateString()}</span>
                      <span>{assignment.points} points</span>
                    </div>
                    {assignment.grade !== null && (
                      <div className="text-lg font-bold text-success">
                        {assignment.grade}/{assignment.points}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Graded Assignments */}
          <TabsContent value="graded" className="space-y-4">
            {assignments.graded.map((assignment) => (
              <Card key={assignment.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <CardTitle>{assignment.title}</CardTitle>
                      </div>
                      <CardDescription>{assignment.course}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-success">
                        {assignment.grade}/{assignment.points}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((assignment.grade / assignment.points) * 100)}%
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Submitted: {new Date(assignment.submittedDate).toLocaleDateString()}</span>
                    <span>Graded: {new Date(assignment.gradedDate).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Assignments;
