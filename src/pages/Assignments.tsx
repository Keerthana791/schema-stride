import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { assignmentService, Assignment } from "@/services/assignments";
import { useToast } from "@/hooks/use-toast";

const Assignments = () => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const data = await assignmentService.getAll();
        setAssignments(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load assignments",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
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

  const pending = assignments.filter(a => a.status === 'pending');
  const submitted = assignments.filter(a => a.status === 'submitted');
  const graded = assignments.filter(a => a.status === 'graded');

  const getDaysLeft = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
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
              Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted ({submitted.length})
            </TabsTrigger>
            <TabsTrigger value="graded">
              Graded ({graded.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Assignments */}
          <TabsContent value="pending" className="space-y-4">
            {pending.map((assignment) => {
              const daysLeft = getDaysLeft(assignment.dueDate);
              return (
                <Card key={assignment.id} className="shadow-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <CardTitle>{assignment.title}</CardTitle>
                        </div>
                        <CardDescription>{assignment.courseName}</CardDescription>
                      </div>
                      <Badge variant={daysLeft <= 2 ? "destructive" : "secondary"}>
                        {daysLeft} days left
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
                          <span>{assignment.maxPoints} points</span>
                        </div>
                      </div>
                      <Button>Submit Assignment</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Submitted Assignments */}
          <TabsContent value="submitted" className="space-y-4">
            {submitted.map((assignment) => (
              <Card key={assignment.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-secondary" />
                        <CardTitle>{assignment.title}</CardTitle>
                      </div>
                      <CardDescription>{assignment.courseName}</CardDescription>
                    </div>
                    <Badge variant="outline">Pending Review</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>Submitted: {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleDateString() : 'N/A'}</span>
                      <span>{assignment.maxPoints} points</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Graded Assignments */}
          <TabsContent value="graded" className="space-y-4">
            {graded.map((assignment) => (
              <Card key={assignment.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <CardTitle>{assignment.title}</CardTitle>
                      </div>
                      <CardDescription>{assignment.courseName}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-success">
                        {assignment.grade}/{assignment.maxPoints}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(((assignment.grade || 0) / assignment.maxPoints) * 100)}%
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Submitted: {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  {assignment.feedback && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium">Feedback:</span> {assignment.feedback}
                    </p>
                  )}
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
