import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Calendar, CheckCircle2, Clock, AlertCircle, Plus, Upload, Download } from "lucide-react";
import { assignmentService } from "@/services/assignments";
import ErrorBoundary from "@/components/ErrorBoundary";

interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  status: 'pending' | 'submitted' | 'graded';
  submittedAt?: string;
  grade?: number;
  feedback?: string;
  fileUrl?: string; // Add fileUrl to the interface
}
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AssignmentSubmissionForm } from "@/components/assignments/AssignmentSubmissionForm";

const Assignments = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await assignmentService.getAll();
      setAssignments(data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Ensure assignments is an array before filtering
  const assignmentsList = Array.isArray(assignments) ? assignments : [];
  const pending = assignmentsList.filter(a => a?.status === 'pending');
  const submitted = assignmentsList.filter(a => a?.status === 'submitted');
  const graded = assignmentsList.filter(a => a?.status === 'graded');

  const getDaysLeft = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleSubmissionSuccess = () => {
    setIsDialogOpen(false);
    // Refresh assignments to show the updated status
    fetchAssignments();
  };

  const handleViewSubmission = (assignment: Assignment) => {
    // Navigate to submission details or show in a dialog
    console.log("View submission for:", assignment.id);
    // You can implement this based on your requirements
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Assignments</h1>
            <p className="text-muted-foreground">Track and manage your course assignments</p>
          </div>
          {user?.role === 'teacher' || user?.role === 'admin' ? (
            <Button onClick={() => navigate('/assignments/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          ) : null}
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
                        <div className="flex items-center gap-1">
                          <span>•</span>
                          <span>{getDaysLeft(assignment.dueDate)} days left</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setIsDialogOpen(true);
                        }}
                        disabled={isSubmitting[assignment.id]}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isSubmitting[assignment.id] ? 'Submitting...' : 'Submit'}
                      </Button>
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Submitted: {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleDateString() : 'N/A'}</span>
                      <span>•</span>
                      <span>{assignment.maxPoints} points</span>
                      {assignment.fileUrl && (
                        <>
                          <span>•</span>
                          <Button 
                            variant="link" 
                            className="h-auto p-0 text-foreground"
                            onClick={() => handleDownloadFile(assignment.fileUrl, assignment.title)}
                          >
                            <Download className="mr-1 h-4 w-4" />
                            Download Submission
                          </Button>
                        </>
                      )}
                    </div>
                    {assignment.feedback && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-md">
                        <p className="text-sm font-medium">Feedback:</p>
                        <p className="text-sm">{assignment.feedback}</p>
                      </div>
                    )}
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

        {/* Submission Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Submit Assignment: {selectedAssignment?.title}</DialogTitle>
            </DialogHeader>
            {selectedAssignment && (
              <AssignmentSubmissionForm 
                assignment={selectedAssignment} 
                onSubmissionSuccess={handleSubmissionSuccess} 
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

// Export the component with error boundary as default
export default function AssignmentsPage() {
  return (
    <ErrorBoundary>
      <Assignments />
    </ErrorBoundary>
  );
}

// Named export for testing or direct imports
export { Assignments };
