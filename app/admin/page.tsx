"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Settings, Image, Upload, Inbox, FolderInput, Loader2, Check, AlertCircle, Database, MessageSquare, Calendar } from "lucide-react";

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
  details: string[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSeedImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const response = await fetch("/api/admin/seed-import", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Import failed");
      }

      const result = await response.json();
      setImportResult(result);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsImporting(false);
    }
  };

  const dismissResult = () => {
    setImportResult(null);
    setImportError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your ONCEPOSTED collection</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleLogout}
          disabled={isLoggingOut}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {importError && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-3" data-testid="text-import-error">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Import Error</p>
            <p>{importError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={dismissResult}>Dismiss</Button>
        </div>
      )}

      {importResult && (
        <Card data-testid="card-import-result">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Check className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>{" "}
                <span className="font-medium text-green-600" data-testid="text-created-count">{importResult.created}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Skipped:</span>{" "}
                <span className="font-medium text-orange-600" data-testid="text-skipped-count">{importResult.skipped}</span>
              </div>
              {importResult.errors.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Errors:</span>{" "}
                  <span className="font-medium text-destructive" data-testid="text-error-count">{importResult.errors.length}</span>
                </div>
              )}
            </div>
            
            {importResult.errors.length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-destructive mb-1">Errors:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {importResult.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.details.length > 0 && importResult.details.length <= 10 && (
              <div className="text-sm">
                <p className="font-medium text-muted-foreground mb-1">Details:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {importResult.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={dismissResult}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover-elevate cursor-pointer" onClick={() => router.push("/admin/upload")} data-testid="card-upload">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Postcard
            </CardTitle>
            <CardDescription>
              Add new postcards to the collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload front and back images of your postcards.
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => router.push("/admin/inbox")} data-testid="card-inbox">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Metadata Inbox
            </CardTitle>
            <CardDescription>
              Add missing metadata to postcards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fill in title, location, and date for postcards.
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => router.push("/admin/moderation")} data-testid="card-moderation">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Moderation Queue
            </CardTitle>
            <CardDescription>
              Review pending submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Approve or reject visitor submissions.
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => router.push("/admin/scheduled")} data-testid="card-scheduled">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Queue
            </CardTitle>
            <CardDescription>
              View upcoming scheduled postcards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage the drip-publish queue for postcards.
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => router.push("/admin/manage")} data-testid="card-manage">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Manage Database
            </CardTitle>
            <CardDescription>
              View and delete postcards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Bulk select and delete test cards from the database.
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => router.push("/admin/messages")} data-testid="card-messages">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Contact Messages
            </CardTitle>
            <CardDescription>
              View messages from visitors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Read and manage messages sent through the contact form.
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => router.push("/admin/settings")} data-testid="card-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
            <CardDescription>
              Configure site settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage site configuration.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5" />
            Seed Import
          </CardTitle>
          <CardDescription>
            Import postcards from /seed/front and /seed/back folders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Place matching front and back images in the seed folders. Files are matched by base name 
            (e.g., card-001-front.jpg pairs with card-001-back.jpg).
          </p>
          <Button 
            onClick={handleSeedImport} 
            disabled={isImporting}
            data-testid="button-import-seed"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FolderInput className="mr-2 h-4 w-4" />
                Import Seed Folder
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
