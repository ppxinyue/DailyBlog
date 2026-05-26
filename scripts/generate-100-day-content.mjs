import fs from "node:fs/promises";

const startDate = new Date(2026, 4, 26);
const totalDays = 100;
const output = new URL("../data/content-library.json", import.meta.url);

const topics = [
  ["Arrays & Hashing", ["two-sum", "contains-duplicate", "valid-anagram"], ["hash map", "set", "frequency counter"]],
  ["Two Pointers", ["valid-palindrome", "3sum", "container-with-most-water"], ["left pointer", "right pointer", "sorted scan"]],
  ["Sliding Window", ["best-time-to-buy-and-sell-stock", "longest-substring-without-repeating-characters", "permutation-in-string"], ["window", "frequency map", "shrink"]],
  ["Stack", ["valid-parentheses", "daily-temperatures", "largest-rectangle-in-histogram"], ["monotonic stack", "push", "pop"]],
  ["Binary Search", ["binary-search", "search-in-rotated-sorted-array", "find-minimum-in-rotated-sorted-array"], ["mid", "left boundary", "right boundary"]],
  ["Linked List", ["reverse-linked-list", "merge-two-sorted-lists", "linked-list-cycle"], ["dummy node", "slow fast", "pointer rewrite"]],
  ["Trees BFS/DFS", ["maximum-depth-of-binary-tree", "invert-binary-tree", "binary-tree-level-order-traversal"], ["recursion", "queue", "base case"]],
  ["Binary Search Tree", ["validate-binary-search-tree", "kth-smallest-element-in-a-bst", "lowest-common-ancestor-of-a-binary-search-tree"], ["bounds", "inorder", "ancestor"]],
  ["Heap / Priority Queue", ["top-k-frequent-elements", "kth-largest-element-in-an-array", "merge-k-sorted-lists"], ["heap", "priority", "k"]],
  ["Backtracking", ["subsets", "combination-sum", "word-search"], ["choice", "path", "undo"]],
  ["Graphs", ["number-of-islands", "clone-graph", "course-schedule"], ["visited", "adjacency", "cycle"]],
  ["Advanced Graphs", ["network-delay-time", "reconstruct-itinerary", "min-cost-to-connect-all-points"], ["dijkstra", "union find", "mst"]],
  ["Dynamic Programming 1D", ["climbing-stairs", "house-robber", "coin-change"], ["state", "transition", "base case"]],
  ["Dynamic Programming 2D", ["unique-paths", "longest-common-subsequence", "edit-distance"], ["grid", "table", "subproblem"]],
  ["Greedy", ["maximum-subarray", "jump-game", "gas-station"], ["local choice", "running best", "feasible"]],
  ["Intervals", ["insert-interval", "merge-intervals", "non-overlapping-intervals"], ["sort", "overlap", "merge"]],
  ["Math & Geometry", ["rotate-image", "spiral-matrix", "set-matrix-zeroes"], ["matrix", "coordinates", "in-place"]],
  ["Bit Manipulation", ["single-number", "number-of-1-bits", "counting-bits"], ["xor", "mask", "shift"]],
];

const hot100 = [
  "two-sum", "add-two-numbers", "longest-substring-without-repeating-characters", "median-of-two-sorted-arrays",
  "longest-palindromic-substring", "regular-expression-matching", "container-with-most-water", "3sum", "letter-combinations-of-a-phone-number",
  "remove-nth-node-from-end-of-list", "valid-parentheses", "merge-two-sorted-lists", "generate-parentheses", "merge-k-sorted-lists",
  "next-permutation", "longest-valid-parentheses", "search-in-rotated-sorted-array", "find-first-and-last-position-of-element-in-sorted-array",
  "combination-sum", "first-missing-positive", "trapping-rain-water", "permutations", "rotate-image", "group-anagrams",
  "maximum-subarray", "jump-game", "merge-intervals", "unique-paths", "minimum-path-sum", "climbing-stairs", "edit-distance",
  "sort-colors", "minimum-window-substring", "subsets", "word-search", "largest-rectangle-in-histogram", "maximal-rectangle",
  "binary-tree-inorder-traversal", "unique-binary-search-trees", "validate-binary-search-tree", "symmetric-tree",
  "binary-tree-level-order-traversal", "maximum-depth-of-binary-tree", "construct-binary-tree-from-preorder-and-inorder-traversal",
  "flatten-binary-tree-to-linked-list", "best-time-to-buy-and-sell-stock", "binary-tree-maximum-path-sum", "longest-consecutive-sequence",
  "single-number", "word-break", "linked-list-cycle", "linked-list-cycle-ii", "lru-cache", "sort-list", "maximum-product-subarray",
  "min-stack", "intersection-of-two-linked-lists", "majority-element", "house-robber", "number-of-islands", "reverse-linked-list",
  "course-schedule", "implement-trie-prefix-tree", "kth-largest-element-in-an-array", "maximal-square", "invert-binary-tree",
  "palindrome-linked-list", "lowest-common-ancestor-of-a-binary-tree", "product-of-array-except-self", "sliding-window-maximum",
  "search-a-2d-matrix-ii", "meeting-rooms-ii", "perfect-squares", "move-zeroes", "find-the-duplicate-number", "serialize-and-deserialize-binary-tree",
  "longest-increasing-subsequence", "coin-change", "house-robber-iii", "counting-bits", "top-k-frequent-elements",
  "decode-string", "evaluate-division", "queue-reconstruction-by-height", "partition-equal-subset-sum", "path-sum-iii",
  "find-all-anagrams-in-a-string", "diameter-of-binary-tree", "subarray-sum-equals-k", "shortest-unsorted-continuous-subarray",
  "merge-two-binary-trees", "task-scheduler", "palindromic-substrings", "daily-temperatures", "minimum-window-subsequence",
  "shortest-bridge", "accounts-merge", "partition-labels", "decode-ways", "target-sum"
];

const problemTitles = new Map(hot100.map((slug) => [slug, titleFromSlug(slug)]));
const llmTaskTemplates = [
  ["stable-softmax", "Implement numerically stable softmax", "Easy", "Numerics", "softmax"],
  ["cross-entropy", "Implement cross entropy from logits", "Easy", "Loss Functions", "logsumexp"],
  ["top-k", "Implement top-k filtering", "Easy", "Decoding", "top-k"],
  ["top-p", "Implement nucleus sampling filter", "Medium", "Decoding", "top-p"],
  ["temperature", "Apply temperature scaling to logits", "Easy", "Decoding", "temperature"],
  ["layernorm", "Implement LayerNorm forward pass", "Medium", "Normalization", "layer norm"],
  ["rmsnorm", "Implement RMSNorm forward pass", "Medium", "Normalization", "rms norm"],
  ["gelu", "Implement GELU activation", "Easy", "Activations", "gelu"],
  ["swiglu", "Implement SwiGLU activation", "Medium", "Activations", "swiglu"],
  ["dot-attention", "Implement scaled dot-product attention", "Medium", "Attention", "attention"],
  ["causal-mask", "Build a causal attention mask", "Medium", "Attention", "mask"],
  ["masked-softmax", "Implement masked softmax", "Medium", "Attention", "mask"],
  ["multi-head-shape", "Reshape tensors for multi-head attention", "Medium", "Attention", "reshape"],
  ["multi-head-attention", "Implement multi-head attention forward", "Hard", "Attention", "multi-head"],
  ["positional-encoding", "Implement sinusoidal positional encoding", "Medium", "Embeddings", "position"],
  ["rotary-embedding", "Apply rotary positional embedding", "Hard", "Embeddings", "rope"],
  ["embedding-lookup", "Implement token embedding lookup", "Easy", "Embeddings", "embedding"],
  ["kv-cache-append", "Append keys and values to KV cache", "Medium", "Inference", "cache"],
  ["kv-cache-attention", "Run one-token attention with KV cache", "Hard", "Inference", "cache"],
  ["beam-search-step", "Implement one beam search step", "Medium", "Decoding", "beam"],
  ["greedy-decode", "Implement greedy decoding loop", "Easy", "Decoding", "argmax"],
  ["perplexity", "Compute perplexity from token losses", "Easy", "Evaluation", "perplexity"],
  ["bleu-1", "Implement unigram BLEU score", "Medium", "Evaluation", "bleu"],
  ["rouge-l", "Implement ROUGE-L via LCS", "Medium", "Evaluation", "lcs"],
  ["cosine-similarity", "Compute cosine similarity matrix", "Easy", "Retrieval", "cosine"],
  ["vector-search", "Implement brute-force vector search", "Easy", "Retrieval", "nearest"],
  ["mrr", "Compute mean reciprocal rank", "Easy", "Evaluation", "rank"],
  ["ndcg", "Compute NDCG at k", "Medium", "Evaluation", "rank"],
  ["chunk-text", "Chunk text with overlap", "Easy", "RAG", "chunk"],
  ["rerank", "Merge retrieval scores with reranker scores", "Medium", "RAG", "rerank"],
  ["lora-forward", "Implement LoRA linear layer forward", "Medium", "Fine-tuning", "lora"],
  ["quantize-int8", "Implement simple int8 quantization", "Medium", "Optimization", "quant"],
  ["dequantize-int8", "Implement dequantization", "Easy", "Optimization", "quant"],
  ["gradient-clipping", "Implement global norm gradient clipping", "Medium", "Training", "clip"],
  ["adamw-step", "Implement AdamW optimizer step", "Hard", "Training", "adamw"],
  ["linear-forward", "Implement batched linear layer", "Easy", "Neural Nets", "matmul"],
  ["conv1d", "Implement simple 1D convolution", "Medium", "Neural Nets", "conv"],
  ["dropout", "Implement dropout forward pass", "Easy", "Training", "dropout"],
  ["batch-pad", "Pad token sequences into a batch", "Easy", "Data", "padding"],
  ["attention-complexity", "Estimate attention memory cost", "Medium", "Systems", "memory"],
];
const months = {};
const englishResources = {};
const readingResources = {};
const englishReadingResources = {};
const codingResources = {};

for (let day = 0; day < totalDays; day += 1) {
  const date = addDays(startDate, day);
  const dateKey = toDateKey(date);
  const monthKey = dateKey.slice(0, 7);
  const dayNumber = day + 1;
  const topic = topics[day % topics.length];
  const codingIds = buildCodingIds(day, topic);
  const englishReadingId = `en-reading-${String(dayNumber).padStart(3, "0")}`;
  const readingId = `zh-reading-${String(dayNumber).padStart(3, "0")}`;
  const englishId = day < 2 ? (day === 0 ? "eng-clear-speech-001" : "eng-news-tone-001") : `eng-reading-audio-pending-${String(dayNumber).padStart(3, "0")}`;

  months[monthKey] ||= { status: "100-day-seed", days: {} };
  months[monthKey].days[dateKey] = {
    english: englishId,
    englishReading: englishReadingId,
    reading: readingId,
    coding: codingIds,
  };

  englishReadingResources[englishReadingId] = buildEnglishReading(dayNumber, topic[0]);
  readingResources[readingId] = buildChineseReading(dayNumber, topic[0]);
  if (day >= 2) {
    englishResources[englishId] = buildPendingVideo(dayNumber, topic[0]);
  }
}

for (const slug of hot100) {
  const topic = topicForSlug(slug);
  codingResources[`lc-${slug}`] ||= buildCodingResource(slug, topic, true);
}

const library = {
  version: 2,
  generatedAt: "2026-05-26T00:00:00+08:00",
  timezone: "Asia/Shanghai",
  updatePolicy: {
    preloadWindow: "100-days",
    refreshOnLastDays: 3,
    dedupeScope: "100-day-plan",
    startDate: toDateKey(startDate),
    totalDays,
  },
  learningSources: [
    {
      name: "LeetCode 75",
      url: "https://leetcode.com/studyplan/leetcode-75/",
      note: "Official 1-3 month interview practice plan.",
    },
    {
      name: "NeetCode Roadmap",
      url: "https://neetcode.io/roadmap",
      note: "Pattern-first roadmap for coding interviews.",
    },
    {
      name: "Grind 75",
      url: "https://www.techinterviewhandbook.org/grind75",
      note: "Time-boxed interview study plan.",
    },
  ],
  months,
  englishResources: {
    "eng-clear-speech-001": buildDemoVideo("Daily English: Clear Speech Practice", "Day 1", "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"),
    "eng-news-tone-001": buildDemoVideo("Daily English: News Tone Practice", "Day 2", "https://media.w3.org/2010/05/sintel/trailer.mp4"),
    ...englishResources,
  },
  englishReadingResources,
  readingResources,
  codingResources,
};

await fs.writeFile(output, `${JSON.stringify(library, null, 2)}\n`);
console.log(`Generated ${totalDays} days into ${output.pathname}`);

function buildCodingIds(day, topic) {
  const primaryHot = hot100[day % hot100.length];
  const secondaryHot = hot100[(day + 50) % hot100.length];
  const dayNumber = day + 1;
  const ids = [
    `lc-${primaryHot}`,
    `lc-${secondaryHot}`,
    `llm-${String(dayNumber).padStart(3, "0")}`,
  ];
  for (const id of ids) {
    if (!codingResources[id]) {
      if (id.startsWith("lc-")) {
        const slug = id.replace(/^lc-/, "");
        codingResources[id] = buildCodingResource(slug, topicForSlug(slug), hot100.includes(slug));
      } else {
        codingResources[id] = buildLlmResource(id, dayNumber);
      }
    }
  }
  return ids;
}

function buildLlmResource(id, day) {
  const template = llmTaskTemplates[(day - 1) % llmTaskTemplates.length];
  const [slug, title, difficulty, topic, keyword] = template;
  const functionName = functionNameFromSlug(slug);
  return {
    title,
    slug: id,
    source: "Mimic LLM hand-coding drill",
    sourceUrl: "",
    track: "Python LLM Internals",
    topic,
    difficulty,
    hot100: false,
    category: "llm",
    promptNote: "Original LLM interview hand-coding drill. Implement with plain Python or NumPy-style reasoning.",
    starterCode: `def ${functionName}(x):\n    # TODO: implement ${title}\n    pass\n`,
    expectedSignature: `def ${functionName}`,
    keywords: [keyword, "shape", "edge case"],
    hints: [
      `State the expected tensor/list shape before writing ${functionName}.`,
      "Handle numerical stability, masking, or empty inputs when relevant.",
      "Write a tiny example and verify the output shape first.",
    ],
  };
}

function buildCodingResource(slug, topic, hot) {
  const title = problemTitles.get(slug) || titleFromSlug(slug);
  const functionName = functionNameFromSlug(slug);
  return {
    title,
    slug,
    source: "LeetCode",
    sourceUrl: `https://leetcode.com/problems/${slug}/`,
    track: "Python LeetCode",
    topic,
    difficulty: inferDifficulty(slug),
    hot100: hot,
    category: "leetcode",
    promptNote: "Open the source URL for the official problem statement. This library stores metadata, not copied LeetCode problem text.",
    starterCode: `class Solution:\n    def ${functionName}(self, nums):\n        # TODO: implement ${title}\n        pass\n`,
    expectedSignature: `def ${functionName}`,
    keywords: topics.find(([name]) => name === topic)?.[2] || ["state", "loop", "edge case"],
    hints: [
      `Identify the ${topic} pattern before coding.`,
      "Write down the invariant or state transition in one sentence.",
      "Test the smallest input, a typical input, and an edge case before submitting.",
    ],
  };
}

function buildEnglishReading(day, topic) {
  return {
    title: `English Reading Day ${day}: ${topic}`,
    label: `Day ${day}`,
    author: "Mimic Editorial",
    license: "original-demo",
    paragraphs: [
      `Today focuses on ${topic}. Read the passage slowly, then repeat the key sentence with clear stress and natural pauses.`,
      `A strong learner does not memorize every answer. A strong learner notices patterns, names the pattern, and explains why it works.`,
      `Before moving on, summarize the idea in your own words and say one example aloud.`,
    ],
    vocabulary: ["pattern", "invariant", "edge case"],
  };
}

function buildChineseReading(day, topic) {
  return {
    title: `中文阅读第 ${day} 天：${topic}`,
    label: `Day ${day}`,
    author: "Mimic 编辑部",
    license: "original-demo",
    paragraphs: [
      `今天的主题是 ${topic}。先慢读一遍，再用自己的话复述文章的中心。`,
      "学习算法和学习语言有相似之处：真正重要的不是背下答案，而是看见结构、说清原因、反复修正。",
      "当你遇到困难时，先把问题拆小。一个清楚的边界条件，常常比十行匆忙写下的代码更有价值。",
    ],
  };
}

function buildPendingVideo(day, topic) {
  return {
    title: `English Video Day ${day}: ${topic}`,
    label: `Day ${day}`,
    source: "Pending approved direct media",
    license: "pending-review",
    mediaUrl: "",
    durationSeconds: 0,
    subtitles: [],
    words: [],
  };
}

function buildDemoVideo(title, label, mediaUrl) {
  return {
    title,
    label,
    source: "Open media sample video for local recording compatibility",
    license: "demo-open-media",
    mediaUrl,
    durationSeconds: 16,
    subtitles: [
      { start: 0, end: 4, en: "Read the line, then repeat it with steady rhythm.", zh: "先读这一行，再用稳定节奏跟读。" },
      { start: 4, end: 8, en: "Focus on clarity before speed.", zh: "先追求清晰，再追求速度。" },
    ],
    words: [
      { word: "clarity", ipa: "/ˈklerəti/", note: "清晰度；跟读和表达的核心指标。" },
      { word: "rhythm", ipa: "/ˈrɪðəm/", note: "节奏；注意停顿和重音。" },
    ],
  };
}

function inferDifficulty(slug) {
  if (["median-of-two-sorted-arrays", "regular-expression-matching", "merge-k-sorted-lists", "largest-rectangle-in-histogram", "maximal-rectangle", "edit-distance", "sliding-window-maximum"].includes(slug)) return "Hard";
  if (slug.includes("two-sum") || slug.includes("valid-parentheses") || slug.includes("climbing-stairs") || slug.includes("single-number") || slug.includes("reverse-linked-list")) return "Easy";
  return "Medium";
}

function inferTopic(slug) {
  if (slug.includes("tree") || slug.includes("bst")) return "Trees BFS/DFS";
  if (slug.includes("linked-list") || slug.includes("list")) return "Linked List";
  if (slug.includes("window") || slug.includes("substring")) return "Sliding Window";
  if (slug.includes("interval")) return "Intervals";
  if (slug.includes("path") || slug.includes("coin") || slug.includes("robber")) return "Dynamic Programming 1D";
  return "Mixed Hot 100 Review";
}

function topicForSlug(slug) {
  return topics.find(([, slugs]) => slugs.includes(slug))?.[0] || inferTopic(slug);
}

function functionNameFromSlug(slug) {
  const parts = slug.split("-");
  return parts[0] + parts.slice(1).map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

function titleFromSlug(slug) {
  return slug.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")
    .replace(/\b3sum\b/i, "3Sum")
    .replace(/\bBst\b/g, "BST")
    .replace(/\bLru\b/g, "LRU");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
