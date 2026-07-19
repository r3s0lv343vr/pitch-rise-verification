"use client";

import { useEffect, useState } from "react";
import { createProjectAction } from "@/app/actions";
import { useWalkthrough } from "@/components/walkthrough/walkthrough-context";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";

export function NewProjectTourForm() {
  const { active, state, setStep } = useWalkthrough();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("10000");
  const [budgetTouched, setBudgetTouched] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (
      state.step === "projects-nav" ||
      state.step === "project-highlight" ||
      state.step === "done"
    ) {
      return;
    }

    if (!name.trim()) {
      if (state.step !== "project-name") setStep("project-name");
      return;
    }
    if (!description.trim()) {
      if (state.step !== "project-description") setStep("project-description");
      return;
    }
    if (!budgetTouched) {
      if (state.step !== "project-budget") setStep("project-budget");
      return;
    }
    if (state.step !== "project-create") setStep("project-create");
  }, [active, state.step, name, description, budgetTouched, setStep]);

  return (
    <form action={createProjectAction} className="mt-4 space-y-3">
      <input type="hidden" name="returnTo" value={active ? "projects" : "dashboard"} />
      <div data-tour="project-name" className="rounded-xl p-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="e.g. Project 2 Comms"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div data-tour="project-description" className="rounded-xl p-1">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div data-tour="project-budget" className="rounded-xl p-1">
        <Label htmlFor="overallBudget">Overall budget (USD)</Label>
        <Input
          id="overallBudget"
          name="overallBudget"
          type="number"
          min={0}
          value={budget}
          onChange={(e) => {
            setBudget(e.target.value);
            setBudgetTouched(true);
          }}
          onFocus={() => setBudgetTouched(true)}
        />
      </div>
      <div data-tour="project-create" className="rounded-xl p-1">
        <Button type="submit" className="w-full">
          Create project + process map
        </Button>
      </div>
    </form>
  );
}
