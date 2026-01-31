import type { TaskType, ModelCategory } from "../types/index.js";

export class TaskTypeDetector {
  private patterns: Map<TaskType, RegExp[]>;

  constructor() {
    this.patterns = new Map([
      [
        "code_generation",
        [
          /write\s+(a\s+)?(function|class|code|script|component|module|api)/i,
          /implement\s+/i,
          /create\s+(a\s+)?(function|class|component|module|api|script)/i,
          /generate\s+(code|function|class)/i,
          /build\s+(a|an)\s+(app|component|feature)/i,
        ],
      ],
      [
        "code_review",
        [
          /review\s+(this|the)\s+code/i,
          /what('s| is)\s+wrong\s+with/i,
          /improve\s+(the\s+)?(code|performance)/i,
          /check\s+(this|the)\s+code/i,
          /analyze\s+(this|the)\s+(code|implementation)/i,
        ],
      ],
      [
        "debugging",
        [
          /debug/i,
          /fix\s+(this|the)\s+(error|bug|issue|problem)/i,
          /why\s+(is|does)\s+(this|it|.*function)\s+(not\s+work|fail|break|return\s+null)/i,
          /error\s+(in|with)/i,
          /not\s+working/i,
        ],
      ],
      [
        "reasoning",
        [
          /explain\s+why/i,
          /reason\s+through/i,
          /step\s+by\s+step/i,
          /think\s+about/i,
          /analyze\s+the\s+(problem|situation)/i,
          /what\s+would\s+happen\s+if/i,
        ],
      ],
      [
        "math",
        [
          /calculate/i,
          /solve\s+(the|this)\s+(equation|problem)/i,
          /what\s+is\s+\d+/i,
          /compute/i,
          /math(ematical)?/i,
        ],
      ],
      [
        "writing",
        [
          /write\s+(a|an)\s+(article|essay|post|blog|story|email)/i,
          /draft\s+(a|an)/i,
          /compose/i,
          /rewrite/i,
          /paraphrase/i,
        ],
      ],
      [
        "summarization",
        [
          /summarize/i,
          /tldr/i,
          /give\s+(me\s+)?a\s+summary/i,
          /brief(ly)?\s+(explain|describe)/i,
          /in\s+a\s+nutshell/i,
        ],
      ],
      [
        "translation",
        [
          /translate/i,
          /in\s+(spanish|french|german|chinese|japanese)/i,
          /convert\s+to\s+(spanish|french|german)/i,
        ],
      ],
      [
        "multimodal",
        [/image/i, /picture/i, /photo/i, /visual/i, /diagram/i, /chart/i],
      ],
    ]);
  }

  detect(prompt: string): TaskType {
    for (const [taskType, patterns] of this.patterns) {
      if (patterns.some((p) => p.test(prompt))) {
        return taskType;
      }
    }
    return "general";
  }

  taskTypeToCategory(taskType: TaskType): ModelCategory {
    const mapping: Record<TaskType, ModelCategory> = {
      code_generation: "coding",
      code_review: "coding",
      debugging: "coding",
      reasoning: "reasoning",
      math: "reasoning",
      writing: "writing",
      summarization: "speed",
      translation: "writing",
      multimodal: "multimodal",
      general: "writing",
    };
    return mapping[taskType];
  }

  getAllPatterns(): Map<TaskType, RegExp[]> {
    return new Map(this.patterns);
  }
}

export const createTaskDetector = (): TaskTypeDetector => {
  return new TaskTypeDetector();
};
