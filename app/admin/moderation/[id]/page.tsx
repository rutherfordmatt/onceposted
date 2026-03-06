"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Check, X, RotateCcw, Mail, User, Calendar, MapPin, MessageSquare } from "lucide-react";
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
  submitterEmail: string | null;
  frontImagePath: string;
  backImagePath: string;
  createdAt: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ModerationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    fetchPostcard();
  }, [id]);

  const fetchPostcard = async () => {
    try {
      const response = await fetch(`/api/admin/postcards/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch postcard");
      }
      const data = await response.json();
      setPostcard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: "approve" | "reject") => {
    setIsActioning(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/moderation/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} postcard`);
      }

      router.push(`/admin/moderation?action=${action === "approve" ? "approved" : "rejected"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsActioning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatPostcardDate = () => {
    if (!postcard) return null;
    if (postcard.dateIsUnknown) return "Unknown";
    if (postcard.dateMonth && postcard.dateYear) {
      return `${MONTHS[postcard.dateMonth - 1]} ${postcard.dateYear}`;
    }
    if (postcard.dateYear) return String(postcard.dateYear);
    if (postcard.dateMonth) return MONTHS[postcard.dateMonth - 1];
    return null;
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
        <Button variant="outline" onClick={() => router.push("/admin/moderation")} className="mt-4">
          Back to Moderation
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
          onClick={() => router.push("/admin/moderation")} 
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Review Submission</h1>
          <p className="text-muted-foreground">Submitted {formatDate(postcard.createdAt)}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-md aspect-[4/3] bg-muted rounded-md overflow-hidden">
              <img
                src={normalizeImagePath(showBack ? postcard.backImagePath : postcard.frontImagePath)}
                alt={showBack ? "Back of postcard" : "Front of postcard"}
                className="w-full h-full object-contain"
              />
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submitter Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{postcard.submitterName}</span>
          </div>
          {postcard.submitterEmail && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`mailto:${postcard.submitterEmail}`} 
                className="text-primary hover:underline"
                data-testid="link-email"
              >
                {postcard.submitterEmail}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Postcard Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {postcard.title && (
            <div className="flex items-start gap-3">
              <span className="text-muted-foreground min-w-[80px]">Title:</span>
              <span className="text-foreground">{postcard.title}</span>
            </div>
          )}
          {postcard.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-foreground">{postcard.location}</span>
            </div>
          )}
          {formatPostcardDate() && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-foreground">{formatPostcardDate()}</span>
            </div>
          )}
          {postcard.messageText && (
            <div className="flex items-start gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-foreground whitespace-pre-wrap">{postcard.messageText}</span>
            </div>
          )}
          {!postcard.title && !postcard.location && !formatPostcardDate() && !postcard.messageText && (
            <p className="text-muted-foreground italic">No additional details provided</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={() => handleAction("approve")} 
          disabled={isActioning}
          className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700"
          data-testid="button-approve"
        >
          {isActioning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Approve
        </Button>
        
        <Button 
          onClick={() => handleAction("reject")} 
          disabled={isActioning}
          variant="destructive"
          className="flex-1 min-w-[120px]"
          data-testid="button-reject"
        >
          {isActioning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <X className="mr-2 h-4 w-4" />
          )}
          Reject
        </Button>
      </div>
    </div>
  );
}
