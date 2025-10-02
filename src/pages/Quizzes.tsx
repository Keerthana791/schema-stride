import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Calendar, Clock, CheckCircle2 } from "lucide-react";

const Quizzes = () => {
  const upcomingQuizzes = [
    {
      id: 1,
      title: "Digital Logic Quiz 2",
      course: "ECE301 - Digital Electronics",
      date: "2025-10-08",
      duration: 45,
      questions: 20,
      topics: ["Sequential Circuits", "Flip-Flops", "Counters"],
    },
    {
      id: 2,
      title: "Data Structures Midterm",
      course: "CS201 - Data Structures",
      date: "2025-10-12",
      duration: 90,
      questions: 40,
      topics: ["Trees", "Graphs", "Hashing"],
    },
  ];

  const completedQuizzes = [
    {
      id: 3,
      title: "Database Normalization Quiz",
      course: "CS301 - DBMS",
      completedDate: "2025-09-28",
      score: 18,
      totalQuestions: 20,
      percentage: 90,
    },
    {
      id: 4,
      title: "Network Protocols Quiz",
      course: "CS302 - Computer Networks",
      completedDate: "2025-09-25",
      score: 16,
      totalQuestions: 20,
      percentage: 80,
    },
    {
      id: 5,
      title: "Algorithm Analysis Quiz",
      course: "CS201 - Data Structures",
      completedDate: "2025-09-20",
      score: 19,
      totalQuestions: 20,
      percentage: 95,
    },
  ];

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
            {upcomingQuizzes.map((quiz) => (
              <Card key={quiz.id} className="shadow-card">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <CardTitle>{quiz.title}</CardTitle>
                  </div>
                  <CardDescription>{quiz.course}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(quiz.date).toLocaleDateString()}</span>
                      </div>
                      <Badge variant="secondary">{quiz.questions} questions</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{quiz.duration} minutes</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Topics Covered:</p>
                    <div className="flex flex-wrap gap-2">
                      {quiz.topics.map((topic) => (
                        <Badge key={topic} variant="outline">
                          {topic}
                        </Badge>
                      ))}
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
            {completedQuizzes.map((quiz) => (
              <Card key={quiz.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <CardTitle>{quiz.title}</CardTitle>
                      </div>
                      <CardDescription>{quiz.course}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-success">
                        {quiz.percentage}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quiz.score}/{quiz.totalQuestions}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Completed: {new Date(quiz.completedDate).toLocaleDateString()}</span>
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
