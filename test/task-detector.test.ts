import { describe, it, expect, beforeEach } from "vitest";
import {
  TaskTypeDetector,
  createTaskDetector,
} from "../src/core/task-detector.js";
import type { TaskType } from "../src/types/index.js";

describe("TaskTypeDetector", () => {
  let detector: TaskTypeDetector;

  beforeEach(() => {
    detector = createTaskDetector();
  });

  describe("detect", () => {
    it("should detect code generation tasks", () => {
      expect(detector.detect("write a function to calculate fibonacci")).toBe(
        "code_generation",
      );
      expect(detector.detect("create a component for user profile")).toBe(
        "code_generation",
      );
      expect(detector.detect("implement a REST API for user auth")).toBe(
        "code_generation",
      );
      expect(detector.detect("generate code for sorting algorithm")).toBe(
        "code_generation",
      );
    });

    it("should detect code review tasks", () => {
      expect(detector.detect("review this code for bugs")).toBe("code_review");
      expect(detector.detect("what is wrong with this implementation")).toBe(
        "code_review",
      );
      expect(detector.detect("improve the performance of this code")).toBe(
        "code_review",
      );
      expect(detector.detect("check this code for security issues")).toBe(
        "code_review",
      );
    });

    it("should detect debugging tasks", () => {
      expect(detector.detect("debug this error in production")).toBe(
        "debugging",
      );
      expect(detector.detect("fix the bug in the login function")).toBe(
        "debugging",
      );
      expect(detector.detect("why does this function return null")).toBe(
        "debugging",
      );
      expect(detector.detect("error in line 42 of the code")).toBe("debugging");
    });

    it("should detect reasoning tasks", () => {
      expect(detector.detect("explain why this algorithm is O(n^2)")).toBe(
        "reasoning",
      );
      expect(
        detector.detect("reason through the best approach for this problem"),
      ).toBe("reasoning");
      expect(detector.detect("step by step analysis of this issue")).toBe(
        "reasoning",
      );
      expect(
        detector.detect("think about the implications of this decision"),
      ).toBe("reasoning");
    });

    it("should detect math tasks", () => {
      expect(detector.detect("calculate the area of a circle")).toBe("math");
      expect(detector.detect("solve the equation x^2 + 5x + 6 = 0")).toBe(
        "math",
      );
      expect(detector.detect("what is 2^10")).toBe("math");
      expect(detector.detect("compute the derivative of x^3")).toBe("math");
    });

    it("should detect writing tasks", () => {
      expect(detector.detect("write an article about climate change")).toBe(
        "writing",
      );
      expect(detector.detect("compose an email to the client")).toBe("writing");
      expect(detector.detect("draft a blog post about AI")).toBe("writing");
      expect(detector.detect("rewrite this paragraph to be clearer")).toBe(
        "writing",
      );
    });

    it("should detect summarization tasks", () => {
      expect(detector.detect("summarize this long document")).toBe(
        "summarization",
      );
      expect(detector.detect("tldr this article")).toBe("summarization");
      expect(detector.detect("give me a summary of the meeting")).toBe(
        "summarization",
      );
      expect(
        detector.detect("briefly explain the concept of quantum computing"),
      ).toBe("summarization");
    });

    it("should detect translation tasks", () => {
      expect(detector.detect("translate this to Spanish")).toBe("translation");
      expect(detector.detect("convert to French")).toBe("translation");
    });

    it("should detect multimodal tasks", () => {
      expect(detector.detect("analyze this image")).toBe("multimodal");
      expect(detector.detect("describe this picture")).toBe("multimodal");
      expect(detector.detect("process this visual data")).toBe("multimodal");
    });

    it("should default to general for unknown tasks", () => {
      expect(detector.detect("hello there")).toBe("general");
      expect(detector.detect("tell me a joke")).toBe("general");
      expect(detector.detect("what time is it")).toBe("general");
    });
  });

  describe("taskTypeToCategory", () => {
    it("should map coding tasks to coding category", () => {
      const codingTasks: TaskType[] = [
        "code_generation",
        "code_review",
        "debugging",
      ];
      codingTasks.forEach((task) => {
        const category = detector.taskTypeToCategory(task);
        expect(category).toBe("coding");
      });
    });

    it("should map reasoning tasks to reasoning category", () => {
      const reasoningTasks: TaskType[] = ["reasoning", "math"];
      reasoningTasks.forEach((task) => {
        const category = detector.taskTypeToCategory(task);
        expect(category).toBe("reasoning");
      });
    });

    it("should map writing tasks to writing category", () => {
      const writingTasks: TaskType[] = ["writing", "translation"];
      writingTasks.forEach((task) => {
        const category = detector.taskTypeToCategory(task);
        expect(category).toBe("writing");
      });
    });

    it("should map summarization to speed category", () => {
      const category = detector.taskTypeToCategory("summarization");
      expect(category).toBe("speed");
    });

    it("should map multimodal to multimodal category", () => {
      const category = detector.taskTypeToCategory("multimodal");
      expect(category).toBe("multimodal");
    });

    it("should map general to writing category", () => {
      const category = detector.taskTypeToCategory("general");
      expect(category).toBe("writing");
    });
  });
});
