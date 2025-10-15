import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { courseService, CreateCoursePayload } from "@/services/courses";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CourseForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<CreateCoursePayload>({
    courseCode: "",
    title: "",
    description: "",
    credits: 3,
    semester: "",
    academicYear: "",
    branch: "",
    teacherEmail: undefined,
  });
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreditsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setForm((prev) => ({ ...prev, credits: isNaN(value) ? undefined : value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseCode || !form.title || !form.branch) {
      toast({ title: "Missing fields", description: "Course code, title and branch are required.", variant: "destructive" });
      return;
    }
    if (isAdmin && !form.teacherEmail) {
      toast({ title: "Teacher required", description: "Admin must specify the Teacher's email for the course.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      await courseService.create(form);
      toast({ title: "Course created", description: `${form.title} has been created.` });
      navigate("/courses");
    } catch (err: any) {
      toast({ title: "Failed to create", description: err?.message || "Error creating course", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Course</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="courseCode">Course Code</Label>
                  <Input id="courseCode" name="courseCode" value={form.courseCode} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" value={form.title} onChange={handleChange} required />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={form.description} onChange={handleChange} rows={4} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="credits">Credits</Label>
                  <Input id="credits" name="credits" type="number" min={1} max={10} value={form.credits ?? ""} onChange={handleCreditsChange} />
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Input id="semester" name="semester" value={form.semester} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Input id="academicYear" name="academicYear" value={form.academicYear} onChange={handleChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Branch</Label>
                  <Select value={form.branch} onValueChange={(v) => setForm((p) => ({ ...p, branch: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CSE">CSE</SelectItem>
                      <SelectItem value="ECE">ECE</SelectItem>
                      <SelectItem value="EEE">EEE</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="ME">ME</SelectItem>
                      <SelectItem value="CE">CE</SelectItem>
                      <SelectItem value="AI_ML">AI/ML</SelectItem>
                      <SelectItem value="DS">DS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isAdmin && (
                  <div>
                    <Label htmlFor="teacherEmail">Teacher Email (for Admin)</Label>
                    <Input id="teacherEmail" name="teacherEmail" type="email" value={form.teacherEmail ?? ""} onChange={handleChange as any} placeholder="teacher@college.edu" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Course"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CourseForm;
