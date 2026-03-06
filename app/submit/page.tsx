"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Check, ImagePlus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function SubmitPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    dateMonth: "",
    dateYear: "",
    dateIsUnknown: false,
    submitterName: "",
    submitterEmail: "",
    messageText: "",
    consent: false,
  });
  
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const validateImage = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Only JPG, JPEG, and PNG images are accepted.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Image must be smaller than 10MB.";
    }
    return null;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateImage(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      if (side === "front") {
        setFrontImage(file);
        setFrontPreview(URL.createObjectURL(file));
      } else {
        setBackImage(file);
        setBackPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!frontImage || !backImage) {
      setError("Please upload both front and back images of the postcard.");
      return;
    }

    if (!formData.submitterName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!formData.submitterEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.submitterEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!formData.consent) {
      setError("Please confirm that you have the rights to upload these images.");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append("frontImage", frontImage);
      submitData.append("backImage", backImage);
      submitData.append("title", formData.title);
      submitData.append("location", formData.location);
      submitData.append("dateMonth", formData.dateMonth);
      submitData.append("dateYear", formData.dateYear);
      submitData.append("dateIsUnknown", String(formData.dateIsUnknown));
      submitData.append("submitterName", formData.submitterName);
      submitData.append("submitterEmail", formData.submitterEmail);
      submitData.append("messageText", formData.messageText);

      const response = await fetch("/api/postcards", {
        method: "POST",
        body: submitData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit postcard");
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-6">
        <div className="p-6 rounded-full bg-green-500/10">
          <Check className="h-12 w-12 text-green-500" />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-light text-foreground" data-testid="text-success-title">Thank You</h2>
          <p className="text-muted-foreground max-w-md" data-testid="text-success-message">
            Your postcard has been submitted for review. We'll notify you by email once it's approved.
          </p>
        </div>
        <Button 
          onClick={() => router.push("/")} 
          variant="outline"
          data-testid="button-back-home"
        >
          Back to Collection
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-16 px-6">
      <div className="max-w-xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collection
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-light text-foreground mb-2">Submit a Postcard</h1>
          <p className="text-muted-foreground text-sm">
            Share your vintage postcard with our community. All submissions are reviewed before appearing on the site.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 rounded-sm bg-destructive/10 text-destructive text-sm" data-testid="text-error">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frontImage" className="text-xs uppercase tracking-wider text-muted-foreground">Front *</Label>
              <label
                htmlFor="frontImage"
                className={cn(
                  "flex flex-col items-center justify-center w-full aspect-[4/3] border border-dashed rounded-sm cursor-pointer transition-all",
                  frontPreview ? "border-foreground/50" : "border-muted-foreground/30 hover:border-foreground/50"
                )}
                data-testid="label-front-image"
              >
                {frontPreview ? (
                  <img
                    src={frontPreview}
                    alt="Front preview"
                    className="h-full w-full object-cover rounded-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs">Click to upload</span>
                  </div>
                )}
                <input
                  id="frontImage"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleImageChange(e, "front")}
                  className="hidden"
                  data-testid="input-front-image"
                />
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backImage" className="text-xs uppercase tracking-wider text-muted-foreground">Back *</Label>
              <label
                htmlFor="backImage"
                className={cn(
                  "flex flex-col items-center justify-center w-full aspect-[4/3] border border-dashed rounded-sm cursor-pointer transition-all",
                  backPreview ? "border-foreground/50" : "border-muted-foreground/30 hover:border-foreground/50"
                )}
                data-testid="label-back-image"
              >
                {backPreview ? (
                  <img
                    src={backPreview}
                    alt="Back preview"
                    className="h-full w-full object-cover rounded-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs">Click to upload</span>
                  </div>
                )}
                <input
                  id="backImage"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleImageChange(e, "back")}
                  className="hidden"
                  data-testid="input-back-image"
                />
              </label>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            JPG, JPEG, PNG. Max 10MB per image.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Greetings from Paris"
                value={formData.title}
                onChange={handleInputChange}
                className="bg-transparent"
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-xs uppercase tracking-wider text-muted-foreground">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="e.g., Paris, France"
                value={formData.location}
                onChange={handleInputChange}
                className="bg-transparent"
                data-testid="input-location"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={formData.dateMonth}
                onValueChange={(value) => handleSelectChange("dateMonth", value)}
                disabled={formData.dateIsUnknown}
              >
                <SelectTrigger className="w-32 bg-transparent" data-testid="select-date-month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                name="dateYear"
                type="number"
                min="1800"
                max="2000"
                placeholder="Year"
                value={formData.dateYear}
                onChange={handleInputChange}
                disabled={formData.dateIsUnknown}
                className="w-24 bg-transparent"
                data-testid="input-date-year"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dateIsUnknown"
                  checked={formData.dateIsUnknown}
                  onCheckedChange={(checked) => handleCheckboxChange("dateIsUnknown", checked as boolean)}
                  data-testid="checkbox-date-unknown"
                />
                <Label htmlFor="dateIsUnknown" className="text-sm font-normal cursor-pointer text-muted-foreground">
                  Unknown
                </Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="submitterName" className="text-xs uppercase tracking-wider text-muted-foreground">Your Name *</Label>
              <Input
                id="submitterName"
                name="submitterName"
                placeholder="Your name"
                value={formData.submitterName}
                onChange={handleInputChange}
                required
                className="bg-transparent"
                data-testid="input-submitter-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="submitterEmail" className="text-xs uppercase tracking-wider text-muted-foreground">Your Email *</Label>
              <Input
                id="submitterEmail"
                name="submitterEmail"
                type="email"
                placeholder="your@email.com"
                value={formData.submitterEmail}
                onChange={handleInputChange}
                required
                className="bg-transparent"
                data-testid="input-submitter-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="messageText" className="text-xs uppercase tracking-wider text-muted-foreground">Message on Postcard</Label>
            <Textarea
              id="messageText"
              name="messageText"
              placeholder="Transcribe any message written on the postcard..."
              value={formData.messageText}
              onChange={handleInputChange}
              rows={4}
              className="bg-transparent resize-none"
              data-testid="input-message-text"
            />
          </div>

          <div className="flex items-start gap-3 p-4 rounded-sm bg-muted/30 border border-border/50">
            <Checkbox
              id="consent"
              checked={formData.consent}
              onCheckedChange={(checked) => handleCheckboxChange("consent", checked as boolean)}
              data-testid="checkbox-consent"
            />
            <Label htmlFor="consent" className="text-sm font-normal cursor-pointer leading-relaxed text-muted-foreground">
              I confirm I own the rights to upload these images and allow this site to display them. *
            </Label>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
            data-testid="button-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Postcard
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
