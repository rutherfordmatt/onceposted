"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowLeft, Trash2, Loader2, Database, RefreshCw, Edit, RotateCw, Wand2 } from "lucide-react";
import { normalizeImagePath } from "@/lib/image-utils";

interface Postcard {
  id: string;
  status: string;
  source: string;
  title: string | null;
  location: string | null;
  submitterName: string;
  frontThumbPath: string;
  createdAt: string;
}

export default function ManagePostcards() {
  const router = useRouter();
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rotatingIds, setRotatingIds] = useState<Set<string>>(new Set());
  const [fixingIds, setFixingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchPostcards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/postcards");
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch postcards");
      }
      const data = await response.json();
      setPostcards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPostcards();
  }, []);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === postcards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(postcards.map(p => p.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/admin/postcards/${id}`, { method: "DELETE" })
      );
      
      await Promise.all(deletePromises);
      
      setSelectedIds(new Set());
      await fetchPostcards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete postcards");
    } finally {
      setIsDeleting(false);
    }
  };

  const rotateImage = async (id: string, side: "front" | "back") => {
    const key = `${id}-${side}`;
    setRotatingIds(prev => new Set(prev).add(key));
    try {
      const response = await fetch(`/api/admin/postcards/${id}/rotate?side=${side}`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to rotate image");
      }
      await fetchPostcards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rotate image");
    } finally {
      setRotatingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const fixOrientation = async (id: string) => {
    setFixingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`/api/admin/postcards/${id}/fix-orientation?side=both`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to fix orientation");
      }
      await fetchPostcards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fix orientation");
    } finally {
      setFixingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      APPROVED: "bg-green-500/20 text-green-400",
      PENDING: "bg-yellow-500/20 text-yellow-400",
      REJECTED: "bg-red-500/20 text-red-400",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      ADMIN: "bg-blue-500/20 text-blue-400",
      VISITOR: "bg-purple-500/20 text-purple-400",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[source] || "bg-muted text-muted-foreground"}`}>
        {source}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/admin")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Database className="h-6 w-6" />
              Database Management
            </h1>
            <p className="text-muted-foreground">
              {postcards.length} postcards in database
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchPostcards}
          disabled={isLoading}
          data-testid="button-refresh"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>All Postcards</CardTitle>
              <CardDescription>
                Select postcards to delete them from the database
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={postcards.length === 0}
                data-testid="button-select-all"
              >
                {selectedIds.size === postcards.length && postcards.length > 0 ? "Deselect All" : "Select All"}
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedIds.size === 0 || isDeleting}
                    data-testid="button-delete-selected"
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete ({selectedIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedIds.size} postcard{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the selected postcards and their images from storage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={deleteSelected}
                      className="bg-destructive hover:bg-destructive/90"
                      data-testid="button-confirm-delete"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : postcards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No postcards in database
            </div>
          ) : (
            <div className="space-y-2">
              {postcards.map((postcard) => (
                <div
                  key={postcard.id}
                  className={`flex items-center gap-4 p-3 rounded-md border transition-colors ${
                    selectedIds.has(postcard.id) 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted/50"
                  }`}
                  data-testid={`card-postcard-${postcard.id}`}
                >
                  <Checkbox
                    checked={selectedIds.has(postcard.id)}
                    onCheckedChange={() => toggleSelect(postcard.id)}
                    data-testid={`checkbox-postcard-${postcard.id}`}
                  />
                  
                  <div className="relative w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                    <Image
                      src={normalizeImagePath(postcard.frontThumbPath)}
                      alt={postcard.title || "Postcard"}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {postcard.title || "Untitled"}
                      </span>
                      {getStatusBadge(postcard.status)}
                      {getSourceBadge(postcard.source)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{postcard.location || "No location"}</span>
                      <span>•</span>
                      <span>by {postcard.submitterName}</span>
                      <span>•</span>
                      <span>{new Date(postcard.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fixOrientation(postcard.id)}
                      disabled={fixingIds.has(postcard.id)}
                      title="Auto-fix orientation (both sides)"
                      data-testid={`button-fix-orientation-${postcard.id}`}
                    >
                      <Wand2 className={`h-3 w-3 mr-1 ${fixingIds.has(postcard.id) ? "animate-pulse" : ""}`} />
                      <span className="text-xs">Fix</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => rotateImage(postcard.id, "front")}
                      disabled={rotatingIds.has(`${postcard.id}-front`)}
                      title="Rotate front 90°"
                      data-testid={`button-rotate-front-${postcard.id}`}
                    >
                      <RotateCw className={`h-3 w-3 mr-1 ${rotatingIds.has(`${postcard.id}-front`) ? "animate-spin" : ""}`} />
                      <span className="text-xs">F</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => rotateImage(postcard.id, "back")}
                      disabled={rotatingIds.has(`${postcard.id}-back`)}
                      title="Rotate back 90°"
                      data-testid={`button-rotate-back-${postcard.id}`}
                    >
                      <RotateCw className={`h-3 w-3 mr-1 ${rotatingIds.has(`${postcard.id}-back`) ? "animate-spin" : ""}`} />
                      <span className="text-xs">B</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/postcards/${postcard.id}/edit`)}
                      data-testid={`button-edit-${postcard.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
