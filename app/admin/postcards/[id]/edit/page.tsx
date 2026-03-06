"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, ArrowLeft, Check, RotateCw, RotateCcw, Trash2, ImagePlus, Calendar, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { normalizeImagePath } from "@/lib/image-utils";

interface Postcard {
  id: string;
  title: string | null;
  location: string | null;
  dateMonth: number | null;
  dateYear: number | null;
  dateIsUnknown: boolean;
  messageText: string | null;
  submitterName: string;
  frontImagePath: string;
  backImagePath: string;
  frontThumbPath: string;
  backThumbPath: string;
  scheduledFor: string | null;
}

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

export default function EditPostcardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const fromInbox = searchParams.get("from") === "inbox";

  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNext, setIsSavingNext] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [nextInboxId, setNextInboxId] = useState<string | null>(null);
  const [imageCacheBuster, setImageCacheBuster] = useState(Date.now());

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    dateMonth: "",
    dateYear: "",
    dateIsUnknown: false,
    messageText: "",
    submitterName: "",
    scheduledFor: "",
  });

  useEffect(() => {
    fetchPostcard();
    if (fromInbox) {
      fetchNextInboxItem();
    }
  }, [id, fromInbox]);

  const fetchPostcard = async () => {
    try {
      const response = await fetch(`/api/admin/postcards/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch postcard");
      }
      const data = await response.json();
      setPostcard(data);
      setFormData({
        title: data.title || "",
        location: data.location || "",
        dateMonth: data.dateMonth ? String(data.dateMonth) : "",
        dateYear: data.dateYear ? String(data.dateYear) : "",
        dateIsUnknown: data.dateIsUnknown || false,
        messageText: data.messageText || "",
        submitterName: data.submitterName || "Admin",
        scheduledFor: data.scheduledFor
          ? new Date(data.scheduledFor).toISOString().split("T")[0]
          : "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNextInboxItem = async () => {
    try {
      const response = await fetch("/api/admin/inbox");
      if (response.ok) {
        const items = await response.json();
        const next = items.find((item: { id: string }) => item.id !== id);
        setNextInboxId(next?.id || null);
      }
    } catch {
      // Ignore errors fetching next item
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, dateIsUnknown: checked }));
  };

  const savePostcard = async () => {
    const response = await fetch(`/api/admin/postcards/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: formData.title || null,
        location: formData.location || null,
        dateMonth: formData.dateMonth ? parseInt(formData.dateMonth, 10) : null,
        dateYear: formData.dateYear ? parseInt(formData.dateYear, 10) : null,
        dateIsUnknown: formData.dateIsUnknown,
        messageText: formData.messageText || null,
        submitterName: formData.submitterName || "Admin",
        scheduledFor: formData.scheduledFor
          ? new Date(formData.scheduledFor + "T09:00:00").toISOString()
          : null,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to save");
    }

    return response.json();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await savePostcard();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndNextUpload = async () => {
    setIsSavingNext(true);
    setError(null);

    try {
      await savePostcard();
      router.push("/admin/upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSavingNext(false);
    }
  };

  const handleSaveAndNextInbox = async () => {
    if (!nextInboxId) return;
    
    setIsSavingNext(true);
    setError(null);

    try {
      await savePostcard();
      router.push(`/admin/postcards/${nextInboxId}/edit?from=inbox`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSavingNext(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/postcards/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete postcard");
      }

      router.push(fromInbox ? "/admin/inbox" : "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsDeleting(false);
    }
  };

  const handleRotate = async (side: "front" | "back") => {
    setIsRotating(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/postcards/${id}/rotate?side=${side}`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rotate image");
      }

      setImageCacheBuster(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRotating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!postcard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Postcard not found</p>
        <Button variant="outline" onClick={() => router.push("/admin")} className="mt-4">
          Back to Admin
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push(fromInbox ? "/admin/inbox" : "/admin")} 
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Edit Postcard</h1>
          <p className="text-muted-foreground">Update postcard details</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm flex items-center gap-2" data-testid="text-success">
          <Check className="h-4 w-4" />
          Changes saved successfully!
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-md aspect-[4/3] bg-muted rounded-md overflow-hidden">
              <img
                src={`${normalizeImagePath(showBack ? postcard.backImagePath : postcard.frontImagePath)}?v=${imageCacheBuster}`}
                alt={showBack ? "Back of postcard" : "Front of postcard"}
                className="w-full h-full object-contain"
              />
              {isRotating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={!showBack ? "default" : "outline"}
                size="sm"
                onClick={() => setShowBack(false)}
                data-testid="button-show-front"
              >
                Front
              </Button>
              <Button
                variant={showBack ? "default" : "outline"}
                size="sm"
                onClick={() => setShowBack(true)}
                data-testid="button-show-back"
              >
                Back
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBack(!showBack)}
                className="ml-2"
                data-testid="button-flip"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRotate(showBack ? "back" : "front")}
                disabled={isRotating}
                className="ml-2 gap-1"
                data-testid="button-rotate-image"
              >
                <RotateCw className="h-4 w-4" />
                Rotate {showBack ? "Back" : "Front"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Greetings from Paris"
                value={formData.title}
                onChange={handleInputChange}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="e.g., Paris, France"
                value={formData.location}
                onChange={handleInputChange}
                data-testid="input-location"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Date</Label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2 flex-1 min-w-[200px]">
                <Select
                  value={formData.dateMonth}
                  onValueChange={(value) => handleSelectChange("dateMonth", value)}
                  disabled={formData.dateIsUnknown}
                >
                  <SelectTrigger className="w-32" data-testid="select-date-month">
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
                  className="w-28"
                  data-testid="input-date-year"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dateIsUnknown"
                  checked={formData.dateIsUnknown}
                  onCheckedChange={handleCheckboxChange}
                  data-testid="checkbox-date-unknown"
                />
                <Label htmlFor="dateIsUnknown" className="text-sm font-normal cursor-pointer">
                  Date unknown
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="submitterName">Submitter Name</Label>
            <Input
              id="submitterName"
              name="submitterName"
              placeholder="Admin"
              value={formData.submitterName}
              onChange={handleInputChange}
              data-testid="input-submitter-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled Publish Date
            </Label>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Input
                  type="date"
                  value={formData.scheduledFor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, scheduledFor: e.target.value }))
                  }
                  data-testid="input-scheduled-date"
                />
              </div>
              {formData.scheduledFor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, scheduledFor: "" }))
                  }
                  type="button"
                  data-testid="button-clear-schedule"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.scheduledFor
                ? `Will publish on ${new Date(formData.scheduledFor + "T09:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at 9:00 AM`
                : "No schedule set — postcard is published immediately"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="messageText">Message on Postcard</Label>
            <Textarea
              id="messageText"
              name="messageText"
              placeholder="Transcribe any message written on the postcard..."
              value={formData.messageText}
              onChange={handleInputChange}
              rows={4}
              data-testid="input-message-text"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={handleSave} 
          disabled={isSaving || isSavingNext} 
          className="flex-1 min-w-[120px]" 
          data-testid="button-save"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
        
        <Button 
          onClick={handleSaveAndNextUpload} 
          disabled={isSaving || isSavingNext}
          variant="secondary"
          className="min-w-[120px]" 
          data-testid="button-save-next-upload"
        >
          {isSavingNext ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <ImagePlus className="mr-2 h-4 w-4" />
              Save & Next Upload
            </>
          )}
        </Button>

        {fromInbox && nextInboxId && (
          <Button 
            onClick={handleSaveAndNextInbox} 
            disabled={isSaving || isSavingNext}
            variant="outline"
            className="min-w-[120px]" 
            data-testid="button-save-next-inbox"
          >
            Save & Next Inbox
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => router.push("/")} 
          data-testid="button-view-gallery"
        >
          View in Gallery
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              disabled={isSaving || isSavingNext || isDeleting}
              data-testid="button-delete"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this postcard?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this postcard and its images. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
