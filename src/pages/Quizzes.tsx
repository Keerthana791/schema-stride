import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { quizService, Quiz } from "@/services/quizzes";
import { useToast } from "@/hooks/use-toast";

const Quizzes = () => {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await quizService.getAll();
        setQuizzes(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load quizzes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
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

  const upcoming = quizzes.filter(q => q.status === 'upcoming');
  const completed = quizzes.filter(q => q.status === 'completed');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="mb-2 text-3xl font-bold">Quizzes & Exams</h1>
          <p className="text-muted-foreground">Prepare for and track your assessments</p>
        </div>

        {/* Upcoming Quizzes */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Upcoming</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {upcoming.map((quiz) => (
              <Card key={quiz.id} className="shadow-card">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <CardTitle>{quiz.title}</CardTitle>
                  </div>
                  <CardDescription>{quiz.courseName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{quiz.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(quiz.scheduledDate).toLocaleDateString()}</span>
                      </div>
                      <Badge variant="secondary">{quiz.totalQuestions} questions</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{quiz.duration} minutes</span>
                    </div>
                  </div>

                  <Button className="w-full" variant="secondary">
                    Review Materials
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Completed Quizzes */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Completed</h2>
          <div className="space-y-4">
            {completed.map((quiz) => (
              <Card key={quiz.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <CardTitle>{quiz.title}</CardTitle>
                      </div>
                      <CardDescription>{quiz.courseName}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-success">
                        {Math.round(((quiz.score || 0) / (quiz.totalMarks || 1)) * 100)}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quiz.score}/{quiz.totalMarks}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Completed: {new Date(quiz.scheduledDate).toLocaleDateString()}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
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

export default Quizzes;
