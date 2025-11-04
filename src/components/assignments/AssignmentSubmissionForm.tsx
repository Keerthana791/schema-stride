import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { assignmentService, Assignment, AssignmentSubmission } from "@/services/assignments";

export function AssignmentSubmissionForm({ 
  assignment,
  onSubmissionSuccess 
}: { 
  assignment: Assignment;
  onSubmissionSuccess: () => void;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !file) {
      toast({
        title: "Error",
        description: "Please provide either text content or upload a file",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submissionData: AssignmentSubmission = {
        assignmentId: assignment.id,
        content: content.trim(),
        fileUrl: "", // Will be set after file upload if applicable
      };

      // TODO: Handle file upload to S3 or your file storage
      // if (file) {
      //   const fileUrl = await uploadFile(file);
      //   submissionData.fileUrl = fileUrl;
      // }

      await assignmentService.submit(assignment.id, submissionData);
      
      toast({
        title: "Success",
        description: "Assignment submitted successfully!",
      });
      
      onSubmissionSuccess();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to submit assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="content">Your Submission</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your submission here..."
          className="min-h-[150px]"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="file">Or upload a file (optional)</Label>
        <Input
          id="file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="cursor-pointer"
        />
        {file && (
          <p className="text-sm text-muted-foreground">
            Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => {
            setContent("");
            setFile(null);
          }}
          disabled={isSubmitting}
        >
          Clear
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Assignment"}
        </Button>
      </div>
    </form>
  );
}
