import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Plus, ArrowLeft, Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api";

interface Course {
  id: string;
  title: string;
  code: string;
}

const CreateAssignment = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    maxPoints: 100,
    dueDate: "",
    instructions: "",
    attachment: null as File | null
  });

  // Define the response type
  interface CoursesResponse {
    success: boolean;
    courses: Course[];
  }

  // Fetch teacher's courses on component mount
  useEffect(() => {
    const fetchTeacherCourses = async () => {
      try {
        console.log('Fetching teacher courses...');
        const response = await apiClient.get<CoursesResponse>('/assignments/teacher/courses');
        console.log('Response from server:', response);
        
        // Check if response exists
        if (!response) {
          throw new Error('No response received from server');
        }
        
        // The backend returns { success: true, courses: [...] }
        if (response.success && Array.isArray(response.courses)) {
          console.log('Setting courses:', response.courses);
          setCourses(response.courses);
        } else if (Array.isArray(response)) {
          // Fallback if the response is just the array directly
          console.log('Setting courses from direct array response:', response);
          setCourses(response);
        } else {
          console.error('Unexpected response format:', response);
          throw new Error('Unexpected response format from server');
        }
      } catch (error: any) {
        console.error("Error fetching courses:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to load your courses. Please try again.",
          variant: "destructive",
        });
      }
    };

    if (user?.role === 'teacher' || user?.role === 'admin') {
      fetchTeacherCourses();
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setFormData(prev => ({
          ...prev,
          attachment: file
        }));
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFormData(prev => ({
      ...prev,
      attachment: null
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('courseId', formData.courseId);
      formDataToSend.append('maxPoints', formData.maxPoints.toString());
      formDataToSend.append('dueDate', date?.toISOString() || '');
      formDataToSend.append('instructions', formData.instructions);
      
      if (formData.attachment) {
        formDataToSend.append('file', formData.attachment);
      }
      
      const response = await apiClient.postForm('/assignments', formDataToSend);
      
      toast({
        title: "Success",
        description: "Assignment created successfully!",
      });
      
      navigate("/assignments");
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxPoints' ? Number(value) : value
    }));
  };
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        dueDate: selectedDate.toISOString()
      }));
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignments
        </Button>
        
        <div className="max-w-3xl mx-auto bg-card p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">Create New Assignment</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Assignment Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter assignment title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter assignment description"
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="courseId">Course</Label>
                {courses.length > 0 ? (
                  <select
                    id="courseId"
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No courses found. Please create a course first.
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxPoints">Maximum Points</Label>
                <Input
                  id="maxPoints"
                  name="maxPoints"
                  type="number"
                  min="1"
                  value={formData.maxPoints}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                placeholder="Enter assignment instructions"
                rows={4}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Assignment File (PDF, Optional)</Label>
              <div className="flex items-center gap-4">
                <label
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors"
                  htmlFor="file-upload"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">PDF (MAX. 10MB)</p>
                  </div>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              
              {selectedFile && (
                <div className="mt-2 flex items-center justify-between p-3 border rounded-md bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-destructive hover:text-destructive/90"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Assignment
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateAssignment;
