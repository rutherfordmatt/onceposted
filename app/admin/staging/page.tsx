"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, ArrowLeft, Calendar, CalendarCheck, Edit, Trash2, Upload, AlertTriangle, Check } from "lucide-react";
import { normalizeImagePath } from "@/lib/image-utils";
import {
  dayKey,
  isTooClose,
  latestDayKey,
  nextPublishSlots,
  publishDateFor,
} from "@/lib/schedule";

interface Draft {
  id: string;
  title: string | null;
  location: string | null;
  dateYear: number | null;
  submitterName: string;
  frontImagePath: string;
  backImagePath: string;
  frontThumbPath: string;
  backThumbPath: string;
}

type EditableField = "title" | "location" | "dateYear" | "submitterName";
type RowFields = Record<EditableField, string>;

function formatDay(key: string): string {
  return publishDateFor(key).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fieldsFromDraft(draft: Draft): RowFields {
  return {
    title: draft.title ?? "",
    location: draft.location ?? "",
    dateYear: draft.dateYear ? String(draft.dateYear) : "",
    submitterName: draft.submitterName ?? "Admin",
  };
}

export default function StagingPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [fields, setFields] = useState<Record<string, RowFields>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [takenDays, setTakenDays] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const savedFields = useRef<Record<string, RowFields>>({});
  const pendingSaves = useRef<Set<Promise<boolean>>>(new Set());

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/staging");
      if (response.status === 401) {
        router.push("/secret-admin");
        return;
      }
      if (!response.ok) throw new Error("Failed to load drafts");
      const data: { drafts: Draft[]; scheduledDates: string[]; lastPublished: string | null } =
        await response.json();

      const taken = new Set(data.scheduledDates.map((d) => dayKey(new Date(d))));
      const nextFields: Record<string, RowFields> = {};
      for (const draft of data.drafts) nextFields[draft.id] = fieldsFromDraft(draft);

      setDrafts(data.drafts);
      setFields(nextFields);
      savedFields.current = structuredClone(nextFields);
      setTakenDays(taken);
      setSelected((prev) => new Set(data.drafts.filter((d) => prev.has(d.id)).map((d) => d.id)));

      // Give every draft its own weekly slot, keeping any date already picked
      // on this page as long as it is still a week clear of everything else.
      setDates((prev) => {
        const next: Record<string, string> = {};
        const used = [...taken];
        for (const draft of data.drafts) {
          const kept = prev[draft.id];
          if (kept && !isTooClose(kept, used)) {
            next[draft.id] = kept;
            used.push(kept);
          }
        }
        const unassigned = data.drafts.filter((d) => !next[d.id]);
        const slots = nextPublishSlots({
          anchorKey: latestDayKey([...data.scheduledDates, data.lastPublished]),
          takenKeys: used,
          count: unassigned.length,
        });
        unassigned.forEach((draft, i) => (next[draft.id] = slots[i]));
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (id: string, field: EditableField, value: string) => {
    setFields((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveField = (id: string, field: EditableField) => {
    const value = fields[id]?.[field] ?? "";
    if (savedFields.current[id]?.[field] === value) return;

    const body =
      field === "dateYear"
        ? { dateYear: value ? parseInt(value, 10) : null }
        : { [field]: field === "submitterName" ? value.trim() || "Admin" : value.trim() };

    setSavingIds((prev) => new Set(prev).add(id));
    const request = fetch(`/api/admin/postcards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to save changes");
        savedFields.current[id] = { ...savedFields.current[id], [field]: value };
        return true;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to save changes");
        return false;
      })
      .finally(() => {
        pendingSaves.current.delete(request);
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    pendingSaves.current.add(request);
  };

  const schedule = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsScheduling(true);
    setError(null);
    setNotice(null);
    try {
      // Titles feed the public slug, so let any in-flight edits land first.
      const saved = await Promise.all(pendingSaves.current);
      if (saved.includes(false)) throw new Error("Some changes didn't save — fix them before scheduling");

      const response = await fetch("/api/admin/staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: ids.map((id) => ({
            id,
            scheduledFor: publishDateFor(dates[id]).toISOString(),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to schedule");

      if (data.errors?.length) setError(data.errors.join(". "));
      if (data.scheduled?.length) {
        setNotice(`Scheduled ${data.scheduled.length} postcard${data.scheduled.length === 1 ? "" : "s"}.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setIsScheduling(false);
    }
  };

  const deleteDraft = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/postcards/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete draft");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete draft");
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const dateProblem = (id: string): string | null => {
    const day = dates[id];
    if (!day) return "Pick a date";
    if (day < dayKey(new Date())) return "This date is in the past";
    if (isTooClose(day, takenDays)) return "Less than a week from a postcard already in the queue";
    const otherDrafts = Object.entries(dates).filter(([other]) => other !== id).map(([, d]) => d);
    if (isTooClose(day, otherDrafts)) return "Less than a week from another draft";
    return null;
  };

  const canSchedule = (id: string) => !!fields[id]?.title.trim() && !!dates[id];
  const selectedIds = drafts.map((d) => d.id).filter((id) => selected.has(id));
  const selectedReady = selectedIds.every(canSchedule);
  const allSelected = drafts.length > 0 && selectedIds.length === drafts.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Staging</h1>
          <p className="text-muted-foreground">
            {drafts.length === 0
              ? "No drafts waiting"
              : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} waiting — check the details, then schedule`}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/scheduled")} data-testid="button-view-queue">
          <Calendar className="h-4 w-4 mr-2" />
          Scheduled Queue
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}
      {notice && (
        <div
          className="p-4 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm flex items-center gap-2"
          data-testid="text-notice"
        >
          <Check className="h-4 w-4" />
          {notice}
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="text-center py-12">
          <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nothing to stage</p>
          <Button variant="outline" onClick={() => router.push("/admin/batch")} className="mt-4" data-testid="button-batch">
            <Upload className="h-4 w-4 mr-2" />
            Batch Upload
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(drafts.map((d) => d.id)))}
                data-testid="checkbox-select-all"
              />
              Select all
            </label>
            <div className="flex-1" />
            <Button
              onClick={() => schedule(selectedIds)}
              disabled={isScheduling || selectedIds.length === 0 || !selectedReady}
              title={!selectedReady ? "Every selected draft needs a title and a date" : undefined}
              data-testid="button-schedule-selected"
            >
              {isScheduling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarCheck className="h-4 w-4 mr-2" />
              )}
              Schedule selected{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </Button>
          </div>

          <div className="space-y-3">
            {drafts.map((draft) => {
              const row = fields[draft.id];
              const problem = dateProblem(draft.id);
              if (!row) return null;
              return (
                <Card key={draft.id} data-testid={`card-draft-${draft.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex items-start gap-3 flex-shrink-0">
                        <Checkbox
                          checked={selected.has(draft.id)}
                          onCheckedChange={() => toggleSelected(draft.id)}
                          className="mt-1"
                          data-testid={`checkbox-draft-${draft.id}`}
                        />
                        <a href={normalizeImagePath(draft.frontImagePath)} target="_blank" rel="noreferrer">
                          <img
                            src={normalizeImagePath(draft.frontThumbPath)}
                            alt="Front"
                            className="w-28 h-20 object-contain bg-muted rounded"
                          />
                        </a>
                        <a href={normalizeImagePath(draft.backImagePath)} target="_blank" rel="noreferrer">
                          <img
                            src={normalizeImagePath(draft.backThumbPath)}
                            alt="Back"
                            className="w-28 h-20 object-contain bg-muted rounded"
                          />
                        </a>
                      </div>

                      <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2">
                        <div className="col-span-2 md:col-span-3 space-y-1">
                          <Label className="text-xs text-muted-foreground">Title</Label>
                          <Input
                            value={row.title}
                            onChange={(e) => setField(draft.id, "title", e.target.value)}
                            onBlur={() => saveField(draft.id, "title")}
                            className={!row.title.trim() ? "border-destructive" : undefined}
                            data-testid={`input-title-${draft.id}`}
                          />
                        </div>
                        <div className="col-span-2 md:col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Location</Label>
                          <Input
                            value={row.location}
                            onChange={(e) => setField(draft.id, "location", e.target.value)}
                            onBlur={() => saveField(draft.id, "location")}
                            data-testid={`input-location-${draft.id}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Year</Label>
                          <Input
                            value={row.dateYear}
                            inputMode="numeric"
                            onChange={(e) =>
                              setField(draft.id, "dateYear", e.target.value.replace(/\D/g, "").slice(0, 4))
                            }
                            onBlur={() => saveField(draft.id, "dateYear")}
                            data-testid={`input-year-${draft.id}`}
                          />
                        </div>
                        <div className="col-span-2 md:col-span-3 space-y-1">
                          <Label className="text-xs text-muted-foreground">Submitted by</Label>
                          <Input
                            value={row.submitterName}
                            onChange={(e) => setField(draft.id, "submitterName", e.target.value)}
                            onBlur={() => saveField(draft.id, "submitterName")}
                            data-testid={`input-submitter-${draft.id}`}
                          />
                        </div>
                        <div className="col-span-2 md:col-span-3 space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Publish date {dates[draft.id] && `· ${formatDay(dates[draft.id])}, ${publishDateFor(dates[draft.id]).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                          </Label>
                          <Input
                            type="date"
                            value={dates[draft.id] ?? ""}
                            onChange={(e) => setDates((prev) => ({ ...prev, [draft.id]: e.target.value }))}
                            className={problem ? "border-orange-500" : undefined}
                            data-testid={`input-date-${draft.id}`}
                          />
                        </div>
                        {problem && (
                          <p className="col-span-2 md:col-span-6 text-xs text-orange-500 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {problem}
                          </p>
                        )}
                      </div>

                      <div className="flex lg:flex-col items-center lg:items-stretch justify-end gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => schedule([draft.id])}
                          disabled={isScheduling || !canSchedule(draft.id)}
                          data-testid={`button-schedule-${draft.id}`}
                        >
                          {savingIds.has(draft.id) ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CalendarCheck className="h-4 w-4 mr-1" />
                          )}
                          Schedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/postcards/${draft.id}/edit?from=staging`)}
                          data-testid={`button-edit-${draft.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              data-testid={`button-delete-${draft.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                              <AlertDialogDescription>
                                &ldquo;{row.title || "Untitled"}&rdquo; and its images will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteDraft(draft.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
