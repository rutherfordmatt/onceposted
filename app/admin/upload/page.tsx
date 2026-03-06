"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, ImagePlus, X, Check, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePair {
  front: File | null;
  back: File | null;
  frontPreview: string | null;
  backPreview: string | null;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export default function AdminUploadPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePair, setImagePair] = useState<ImagePair>({
    front: null,
    back: null,
    frontPreview: null,
    backPreview: null,
  });
  const [dragOver, setDragOver] = useState<"front" | "back" | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [nextSlotLabel, setNextSlotLabel] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/scheduled")
      .then((res) => res.json())
      .then((data) => {
        if (data.nextSlot) {
          const d = new Date(data.nextSlot);
          const dateStr = d.toISOString().split("T")[0];
          setScheduledFor(dateStr);
          setNextSlotLabel(
            d.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only JPG, JPEG, and PNG images are accepted.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB.");
      return false;
    }
    return true;
  };

  const handleFile = useCallback((file: File, side: "front" | "back") => {
    if (!validateFile(file)) return;
    setError(null);

    const preview = URL.createObjectURL(file);
    setImagePair((prev) => ({
      ...prev,
      [side]: file,
      [`${side}Preview`]: preview,
    }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, side: "front" | "back") => {
      e.preventDefault();
      setDragOver(null);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0], side);
      }
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent, side: "front" | "back") => {
    e.preventDefault();
    setDragOver(side);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file, side);
    }
  };

  const clearImage = (side: "front" | "back") => {
    setImagePair((prev) => ({
      ...prev,
      [side]: null,
      [`${side}Preview`]: null,
    }));
  };

  const handleUpload = async () => {
    if (!imagePair.front || !imagePair.back) {
      setError("Please upload both front and back images.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("frontImage", imagePair.front);
      formData.append("backImage", imagePair.back);
      if (scheduledFor) {
        const schedDate = new Date(scheduledFor + "T09:00:00");
        formData.append("scheduledFor", schedDate.toISOString());
      }

      const response = await fetch("/api/admin/postcards", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const postcard = await response.json();
      router.push(`/admin/postcards/${postcard.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = imagePair.front && imagePair.back && !isUploading;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload Postcard</h1>
        <p className="text-muted-foreground">Add a new postcard to the collection</p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Front Image</CardTitle>
            <CardDescription>The front side of the postcard</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={(e) => handleDrop(e, "front")}
              onDragOver={(e) => handleDragOver(e, "front")}
              onDragLeave={handleDragLeave}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-md cursor-pointer transition-colors",
                dragOver === "front"
                  ? "border-primary bg-primary/10"
                  : imagePair.frontPreview
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
              data-testid="dropzone-front"
            >
              {imagePair.frontPreview ? (
                <>
                  <img
                    src={imagePair.frontPreview}
                    alt="Front preview"
                    className="h-full w-full object-contain rounded-md p-1"
                  />
                  <button
                    onClick={() => clearImage("front")}
                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-clear-front"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center gap-2 text-muted-foreground cursor-pointer w-full h-full justify-center">
                  <ImagePlus className="h-10 w-10" />
                  <span className="text-sm">Drop image here or click to upload</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileInput(e, "front")}
                    className="hidden"
                    data-testid="input-front-image"
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Back Image</CardTitle>
            <CardDescription>The back side of the postcard</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={(e) => handleDrop(e, "back")}
              onDragOver={(e) => handleDragOver(e, "back")}
              onDragLeave={handleDragLeave}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-md cursor-pointer transition-colors",
                dragOver === "back"
                  ? "border-primary bg-primary/10"
                  : imagePair.backPreview
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
              data-testid="dropzone-back"
            >
              {imagePair.backPreview ? (
                <>
                  <img
                    src={imagePair.backPreview}
                    alt="Back preview"
                    className="h-full w-full object-contain rounded-md p-1"
                  />
                  <button
                    onClick={() => clearImage("back")}
                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-clear-back"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center gap-2 text-muted-foreground cursor-pointer w-full h-full justify-center">
                  <ImagePlus className="h-10 w-10" />
                  <span className="text-sm">Drop image here or click to upload</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileInput(e, "back")}
                    className="hidden"
                    data-testid="input-back-image"
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Publish Date
          </CardTitle>
          <CardDescription>
            {nextSlotLabel
              ? `Next available slot: ${nextSlotLabel}`
              : "Set a future date to publish this postcard, or leave empty for immediate publish"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Input
                type="date"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                data-testid="input-scheduled-date"
              />
            </div>
            {scheduledFor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScheduledFor("")}
                data-testid="button-clear-schedule"
              >
                <X className="h-4 w-4 mr-1" />
                Publish immediately
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        {imagePair.front && imagePair.back && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            Both images ready
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleUpload}
          disabled={!canUpload}
          className="flex-1 min-w-[140px]"
          data-testid="button-upload"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Edit
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
