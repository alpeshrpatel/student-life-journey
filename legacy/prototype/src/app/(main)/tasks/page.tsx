"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/client";
import type { TaskDTO } from "@/shared/types";
import { StateCard } from "../dashboard/parts";
import { TaskRow } from "./task-row";

type Filter = "OPEN" | "DONE";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ tasks: TaskDTO[] }>("/api/tasks");
      setTasks(data.tasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tasks");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (tasks ?? []).filter((t) => t.status === filter),
    [tasks, filter],
  );

  async function toggle(task: TaskDTO) {
    setBusyId(task.id);
    try {
      if (task.status === "OPEN") {
        await api(`/api/tasks/${task.id}/complete`, { body: {} });
      } else {
        await api(`/api/tasks/${task.id}/reopen`, { body: {} });
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await api("/api/tasks", { body: { title: newTitle.trim() } });
      setNewTitle("");
      setShowAdd(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not add task");
    } finally {
      setAdding(false);
    }
  }

  if (error) return <StateCard title="Something went wrong" message={error} retry={load} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tasks</h1>
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20"
        >
          <Plus className="h-3.5 w-3.5" /> Add task
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addTask} className="flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs doing?"
            className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={adding}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            aria-label="Save task"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 text-center text-xs font-semibold">
        {(["OPEN", "DONE"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg py-2 transition-colors ${
              filter === f ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {f === "OPEN" ? "To do" : "Completed"}
          </button>
        ))}
      </div>

      {!tasks ? (
        <div className="animate-pulse space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {filter === "OPEN" ? "Nothing open — nice work! 🎉" : "No completed tasks yet."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((task) => (
            <li key={task.id}>
              <TaskRow
                task={task}
                busy={busyId === task.id}
                onToggle={() => void toggle(task)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
