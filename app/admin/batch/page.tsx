"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ArrowLeft,
  ArrowLeftRight,
  Check,
  X,
  ImagePlus,
  Upload,
  AlertTriangle,
  Link2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pairFiles } from "@/lib/batch-pairing";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ItemStatus = "ready" | "uploading" | "done" | "error";

interface BatchItem {
  id: string;
  front: File;
  back: File;
  frontUrl: string;
  backUrl: string;
  title: string;
  dateYear: string;
  needsCheck: boolean;
  status: ItemStatus;
  error?: string;
}

interface LooseFile {
  id: string;
  file: File;
  url: string;
}

let nextLocalId = 0;
const localId = () => `batch-${++nextLocalId}`;

export default function BatchUploadPage() {
  const router = useRouter();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [unmatched, setUnmatched] = useState<LooseFile[]>([]);
  const [selectedLoose, setSelectedLoose] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const urlsRef = useRef<Set<string>>(new Set());

  const makeUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    urlsRef.current.add(url);
    return url;
  };

  const releaseUrl = (url: string) => {
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  };

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!isUploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isUploading]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const known = new Set([
        ...items.flatMap((i) => [i.front.name, i.back.name]),
        ...unmatched.map((u) => u.file.name),
      ]);
      const skipped: string[] = [];
      const accepted: File[] = [];

      for (const file of incoming) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          skipped.push(`${file.name} (not a JPG or PNG)`);
        } else if (file.size > MAX_FILE_SIZE) {
          skipped.push(`${file.name} (larger than 10MB)`);
        } else if (known.has(file.name)) {
          skipped.push(`${file.name} (already added)`);
        } else {
          known.add(file.name);
          accepted.push(file);
        }
      }
      setRejected(skipped);
      if (accepted.length === 0) return;

      // Re-pair previously unmatched files too, so a missing back can be dropped in later.
      const loose = new Map(unmatched.map((u) => [u.file, u]));
      const { pairs, unmatched: stillLoose } = pairFiles([...unmatched.map((u) => u.file), ...accepted]);
      const urlFor = (file: File) => loose.get(file)?.url ?? makeUrl(file);

      setItems((prev) => [
        ...prev,
        ...pairs.map((pair) => ({
          id: localId(),
          front: pair.front,
          back: pair.back,
          frontUrl: urlFor(pair.front),
          backUrl: urlFor(pair.back),
          title: pair.title,
          dateYear: pair.dateYear ? String(pair.dateYear) : "",
          needsCheck: pair.needsCheck,
          status: "ready" as ItemStatus,
        })),
      ]);
      setUnmatched(stillLoose.map((file) => loose.get(file) ?? { id: localId(), file, url: urlFor(file) }));
      setSelectedLoose([]);
    },
    [items, unmatched]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const updateItem = (id: string, changes: Partial<BatchItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const swapSides = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              front: item.back,
              back: item.front,
              frontUrl: item.backUrl,
              backUrl: item.frontUrl,
              needsCheck: false,
            }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      releaseUrl(item.frontUrl);
      releaseUrl(item.backUrl);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const removeLoose = (id: string) => {
    const loose = unmatched.find((u) => u.id === id);
    if (loose) releaseUrl(loose.url);
    setUnmatched((prev) => prev.filter((u) => u.id !== id));
    setSelectedLoose((prev) => prev.filter((s) => s !== id));
  };

  const toggleLoose = (id: string) => {
    setSelectedLoose((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  // Manually pair two unmatched files; the first one ticked becomes the front.
  const pairSelected = () => {
    const [front, back] = selectedLoose.map((id) => unmatched.find((u) => u.id === id)!);
    if (!front || !back) return;
    setItems((prev) => [
      ...prev,
      {
        id: localId(),
        front: front.file,
        back: back.file,
        frontUrl: front.url,
        backUrl: back.url,
        title: front.file.name.replace(/\.[a-z0-9]+$/i, ""),
        dateYear: "",
        needsCheck: false,
        status: "ready",
      },
    ]);
    setUnmatched((prev) => prev.filter((u) => u !== front && u !== back));
    setSelectedLoose([]);
  };

  const handleUpload = async () => {
    const queue = items.filter((i) => i.status === "ready" || i.status === "error");
    if (queue.length === 0) return;

    setIsUploading(true);
    for (const [index, item] of queue.entries()) {
      setProgress({ current: index + 1, total: queue.length });
      updateItem(item.id, { status: "uploading", error: undefined });
      try {
        const formData = new FormData();
        formData.append("frontImage", item.front);
        formData.append("backImage", item.back);
        formData.append("draft", "true");
        formData.append("title", item.title);
        if (item.dateYear) formData.append("dateYear", item.dateYear);

        const response = await fetch("/api/admin/postcards", { method: "POST", body: formData });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Upload failed (${response.status})`);
        }
        updateItem(item.id, { status: "done" });
      } catch (err) {
        updateItem(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }
    setIsUploading(false);
  };

  const clearUploaded = () => {
    items.filter((i) => i.status === "done").forEach((i) => {
      releaseUrl(i.frontUrl);
      releaseUrl(i.backUrl);
    });
    setItems((prev) => prev.filter((i) => i.status !== "done"));
  };

  const pendingCount = items.filter((i) => i.status === "ready" || i.status === "error").length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const checkCount = items.filter((i) => i.needsCheck && i.status !== "done").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Batch Upload</h1>
          <p className="text-muted-foreground">
            Upload many postcards at once. They are saved as drafts for you to check and schedule.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Add images</CardTitle>
          <CardDescription>
            Fronts and backs are paired by filename, e.g. <code>Cardiff Castle - front.jpg</code> +{" "}
            <code>Cardiff Castle - back.jpg</code>, or <code>London Bridge (1).png</code> +{" "}
            <code>London Bridge (2).png</code>. Titles come from the filename.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 w-full h-36 border-2 border-dashed rounded-md cursor-pointer transition-colors text-muted-foreground",
              dragOver
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
            data-testid="dropzone-batch"
          >
            <ImagePlus className="h-10 w-10" />
            <span className="text-sm">Drop all front and back images here, or click to choose</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              multiple
              onChange={handleFileInput}
              className="hidden"
              data-testid="input-batch-files"
            />
          </label>
        </CardContent>
      </Card>

      {rejected.length > 0 && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-rejected">
          <p className="font-medium mb-1">Some files were skipped:</p>
          <ul className="list-disc list-inside">
            {rejected.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {unmatched.length > 0 && (
        <Card data-testid="card-unmatched">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Unmatched images ({unmatched.length})
            </CardTitle>
            <CardDescription>
              These couldn&apos;t be paired by filename. Drop in the missing side, or tick two images to pair
              them yourself (the first one ticked becomes the front).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {unmatched.map((loose) => {
                const position = selectedLoose.indexOf(loose.id);
                return (
                  <div
                    key={loose.id}
                    className={cn(
                      "relative rounded-md border p-2 space-y-1 cursor-pointer",
                      position >= 0 ? "border-primary bg-primary/5" : "border-border"
                    )}
                    onClick={() => toggleLoose(loose.id)}
                  >
                    <img src={loose.url} alt={loose.file.name} className="w-full h-20 object-contain" />
                    <p className="text-xs text-muted-foreground truncate" title={loose.file.name}>
                      {loose.file.name}
                    </p>
                    {position >= 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium">
                        {position === 0 ? "FRONT" : "BACK"}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLoose(loose.id);
                      }}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground"
                      aria-label={`Remove ${loose.file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedLoose.length !== 2}
              onClick={pairSelected}
              data-testid="button-pair-selected"
            >
              <Link2 className="h-4 w-4 mr-1" />
              Pair selected
            </Button>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {items.length} postcard{items.length === 1 ? "" : "s"} ready
            </h2>
            {checkCount > 0 && (
              <p className="text-sm text-orange-500 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {checkCount} pair{checkCount === 1 ? "" : "s"} guessed front/back — check the sides
              </p>
            )}
          </div>

          {items.map((item) => (
            <Card key={item.id} data-testid={`card-batch-${item.id}`}>
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-center">
                      <img src={item.frontUrl} alt="Front" className="w-24 h-16 object-contain bg-muted rounded" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Front</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => swapSides(item.id)}
                      disabled={isUploading || item.status === "done"}
                      title="Swap front and back"
                      data-testid={`button-swap-${item.id}`}
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <img src={item.backUrl} alt="Back" className="w-24 h-16 object-contain bg-muted rounded" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Back</p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={item.title}
                        onChange={(e) => updateItem(item.id, { title: e.target.value })}
                        placeholder="Title"
                        disabled={isUploading || item.status === "done"}
                        data-testid={`input-title-${item.id}`}
                      />
                      <Input
                        value={item.dateYear}
                        onChange={(e) => updateItem(item.id, { dateYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        placeholder="Year"
                        className="w-20"
                        inputMode="numeric"
                        disabled={isUploading || item.status === "done"}
                        data-testid={`input-year-${item.id}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground truncate" title={`${item.front.name} / ${item.back.name}`}>
                      {item.front.name} · {item.back.name}
                    </p>
                    {item.needsCheck && item.status !== "done" && (
                      <p className="text-xs text-orange-500">Front/back guessed from filename — swap if wrong</p>
                    )}
                    {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                  </div>

                  <div className="flex items-center justify-end w-10 flex-shrink-0">
                    {item.status === "uploading" && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    {item.status === "done" && <Check className="h-5 w-5 text-green-600" />}
                    {(item.status === "ready" || item.status === "error") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={isUploading}
                        aria-label="Remove pair"
                        data-testid={`button-remove-${item.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="sticky bottom-4 flex flex-wrap items-center gap-3 p-3 rounded-md border bg-background shadow-lg">
          {isUploading ? (
            <p className="text-sm text-muted-foreground flex-1">
              Uploading {progress.current} of {progress.total}… keep this page open.
            </p>
          ) : doneCount > 0 ? (
            <p className="text-sm text-green-600 dark:text-green-400 flex-1 flex items-center gap-1">
              <Check className="h-4 w-4" />
              {doneCount} saved as draft{doneCount === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground flex-1">Check the titles and sides, then upload.</p>
          )}

          {doneCount > 0 && !isUploading && (
            <>
              <Button variant="ghost" size="sm" onClick={clearUploaded} data-testid="button-clear-uploaded">
                Clear uploaded
              </Button>
              <Button variant="outline" onClick={() => router.push("/admin/staging")} data-testid="button-go-staging">
                <ClipboardList className="h-4 w-4 mr-2" />
                Go to Staging
              </Button>
            </>
          )}
          <Button onClick={handleUpload} disabled={isUploading || pendingCount === 0} data-testid="button-upload-batch">
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload {pendingCount > 0 ? pendingCount : ""} as drafts
          </Button>
        </div>
      )}
    </div>
  );
}
