import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";

const ROOT = new URL("../", import.meta.url);
const insightsPath = new URL("data/insights.json", ROOT);
const maxItems = Number(process.env.DAILYBLOG_INSIGHT_MAX_ITEMS || 4);
const force = process.env.DAILYBLOG_INSIGHT_FORCE === "1";
const dryRun = process.env.DAILYBLOG_INSIGHT_DRY_RUN === "1";
const shouldCommit = process.env.DAILYBLOG_INSIGHT_COMMIT === "1";
const shouldPush = process.env.DAILYBLOG_INSIGHT_PUSH === "1";
const todayKey = process.env.INSIGHT_UPDATE_DATE || dateKeyInShanghai();
const compactDate = todayKey.replaceAll("-", "");

const sources = [
  {
    name: "Anthropic Engineering",
    type: "company-technical-blog",
    url: "https://www.anthropic.com/engineering",
    priority: 35
  },
  {
    name: "Anthropic News",
    type: "company-news",
    url: "https://www.anthropic.com/news",
    priority: 30
  },
  {
    name: "Anthropic Research",
    type: "company-research",
    url: "https://www.anthropic.com/research",
    priority: 30
  },
  {
    name: "OpenAI News",
    type: "company-news",
    url: "https://openai.com/news/",
    priority: 24
  },
  {
    name: "Google DeepMind Blog",
    type: "company-research-blog",
    url: "https://deepmind.google/discover/blog/",
    priority: 22
  },
  {
    name: "Microsoft Research AI",
    type: "research-blog",
    url: "https://www.microsoft.com/en-us/research/research-area/artificial-intelligence/",
    priority: 22
  },
  {
    name: "Meta AI Blog",
    type: "company-research-blog",
    url: "https://ai.meta.com/blog/",
    priority: 18
  },
  {
    name: "Apple Machine Learning Research",
    type: "company-research-blog",
    url: "https://machinelearning.apple.com/",
    priority: 16
  },
  {
    name: "NVIDIA Technical Blog",
    type: "company-technical-blog",
    url: "https://developer.nvidia.com/blog/category/generative-ai/",
    priority: 16
  },
  {
    name: "xAI",
    type: "company-news",
    url: "https://x.ai/news",
    priority: 14
  },
  {
    name: "Neuralink",
    type: "bci-company-news",
    url: "https://neuralink.com/blog/",
    priority: 14
  },
  {
    name: "Tesla AI / Optimus",
    type: "embodied-ai-company",
    url: "https://www.tesla.com/AI",
    priority: 14
  }
];

const keywordGroups = {
  agent: ["agent", "agents", "tool use", "computer use", "mcp", "workflow", "automation", "coding", "claude code"],
  evaluation: ["evaluation", "eval", "benchmark", "safety", "alignment", "containment", "red team", "reliability", "assessment"],
  education: ["education", "learning", "student", "teacher", "child", "children", "developmental", "tutor"],
  health: ["mental health", "wellbeing", "clinical", "therapy", "support", "crisis"],
  accessibility: ["accessibility", "neurodiversity", "assistive", "disability", "inclusive"],
  social: ["social", "simulation", "multi-agent", "generative agents", "society", "moral", "trust"],
  embodied: ["robot", "robotics", "embodied", "optimus", "autonomous", "bci", "brain-computer", "neural interface", "neuralink"]
};

const aiTerms = [
  "ai",
  "artificial intelligence",
  "llm",
  "model",
  "generative",
  "agent",
  "machine learning",
  "robot",
  "claude",
  "gpt",
  "neural",
  "deep learning"
];

async function main() {
  await inspectContext();
  const library = JSON.parse(await fs.readFile(insightsPath, "utf8"));

  if (library.days?.[todayKey]?.length && !force) {
    console.log(`Insight for ${todayKey} already exists. Set DAILYBLOG_INSIGHT_FORCE=1 to overwrite.`);
    runCheck();
    return;
  }

  const existingUrls = new Set(
    Object.values(library.days || {})
      .flatMap((items) => items || [])
      .map((item) => normalizeUrl(item.url))
      .filter(Boolean)
  );

  const candidates = await collectCandidates();
  const selected = selectCandidates(candidates, existingUrls);
  if (!selected.length) {
    throw new Error("No non-duplicate AI-industry-centered Insight candidates were found.");
  }

  const insights = selected.slice(0, maxItems).map((candidate, index) => buildInsight(candidate, index));

  if (dryRun) {
    console.log(JSON.stringify({ date: todayKey, insights }, null, 2));
    return;
  }

  library.generatedAt = `${todayKey}T00:00:00+08:00`;
  library.days ||= {};
  library.days[todayKey] = insights;
  await fs.writeFile(insightsPath, `${JSON.stringify(library, null, 2)}\n`);
  runCheck();

  if (shouldCommit || shouldPush) {
    run("git", ["add", "data/insights.json", "docs/progress.md", "docs/issues.md"]);
    run("git", ["commit", "-m", `Update DailyBlog insights ${todayKey}`], { allowFailure: true });
  }
  if (shouldPush) run("git", ["push"]);

  console.log(`Updated ${todayKey} with ${library.days[todayKey].length} Insight item(s).`);
}

async function inspectContext() {
  console.log(run("git", ["status", "--short", "--branch"], { allowFailure: true }).stdout.trim());
  for (const path of ["docs/progress.md", "docs/issues.md"]) {
    const content = await fs.readFile(new URL(path, ROOT), "utf8");
    const notes = content
      .split("\n")
      .filter((line) => /insight|resource|automation|refresh/i.test(line))
      .slice(-8);
    if (notes.length) console.log(`\n${path}\n${notes.join("\n")}`);
  }
}

async function collectCandidates() {
  const results = [];
  const pageResults = await Promise.allSettled(sources.map((source) => collectFromPage(source)));
  for (const result of pageResults) {
    if (result.status === "fulfilled") results.push(...result.value);
    else console.error(`Source failed: ${result.reason?.message || result.reason}`);
  }

  results.push(...(await collectFromArxiv()));
  results.push(...(await collectFromHackerNews()));
  results.push(...(await collectFromGithub()));
  return results;
}

async function collectFromPage(source) {
  const html = await fetchText(source.url);
  const links = extractLinks(html, source.url);
  return links
    .filter((link) => looksRelevant(`${link.title} ${link.url}`))
    .slice(0, 12)
    .map((link) => ({
      title: cleanTitle(link.title),
      url: link.url,
      sourceName: source.name,
      sourceType: source.type,
      publishedAt: extractDate(`${link.title} ${link.url}`) || todayKey,
      priority: source.priority,
      rawText: link.title
    }));
}

async function collectFromArxiv() {
  const query = encodeURIComponent('cat:cs.AI AND (agent OR evaluation OR "multi-agent" OR safety OR education OR robot)');
  const url = `https://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=12`;
  try {
    const xml = await fetchText(url);
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => {
      const entry = match[1];
      const title = decodeXml(readXml(entry, "title")).replace(/\s+/g, " ").trim();
      const link = entry.match(/<link[^>]+href="([^"]+)"/)?.[1] || "";
      const publishedAt = readXml(entry, "published").slice(0, 10) || todayKey;
      return {
        title,
        url: link,
        sourceName: "arXiv",
        sourceType: "paper",
        publishedAt,
        priority: 20,
        rawText: decodeXml(readXml(entry, "summary"))
      };
    }).filter((item) => item.title && item.url && looksRelevant(`${item.title} ${item.rawText}`));
  } catch (error) {
    console.error(`arXiv failed: ${error.message}`);
    return [];
  }
}

async function collectFromHackerNews() {
  const queries = ["AI agent evaluation", "Claude agent safety", "LLM education mental health", "robotics AI"];
  const results = [];
  for (const query of queries) {
    const url = `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=5&query=${encodeURIComponent(query)}`;
    try {
      const data = JSON.parse(await fetchText(url));
      for (const hit of data.hits || []) {
        if (!hit.title || !hit.url) continue;
        results.push({
          title: hit.title,
          url: hit.url,
          sourceName: "Hacker News",
          sourceType: "technical-forum",
          publishedAt: (hit.created_at || todayKey).slice(0, 10),
          priority: 18,
          rawText: hit.title
        });
      }
    } catch (error) {
      console.error(`Hacker News failed: ${error.message}`);
    }
  }
  return results.filter((item) => looksRelevant(item.title));
}

async function collectFromGithub() {
  const query = encodeURIComponent("ai agent evaluation pushed:>=" + daysAgoKey(14));
  const url = `https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=10`;
  try {
    const data = JSON.parse(await fetchText(url, { Accept: "application/vnd.github+json" }));
    return (data.items || []).map((repo) => ({
      title: `${repo.full_name}: ${repo.description || "AI repository"}`,
      url: repo.html_url,
      sourceName: "GitHub Search",
      sourceType: "open-source-trend",
      publishedAt: (repo.pushed_at || repo.updated_at || todayKey).slice(0, 10),
      priority: 16,
      rawText: `${repo.full_name} ${repo.description || ""}`
    })).filter((item) => looksRelevant(`${item.title} ${item.rawText}`));
  } catch (error) {
    console.error(`GitHub Search failed: ${error.message}`);
    return [];
  }
}

function selectCandidates(candidates, existingUrls) {
  const seen = new Set(existingUrls);
  return candidates
    .filter((candidate) => candidate.title && candidate.url)
    .map((candidate) => ({ ...candidate, url: normalizeUrl(candidate.url), tags: inferTags(candidate), score: scoreCandidate(candidate) }))
    .filter((candidate) => candidate.score > 0)
    .filter((candidate) => isRecent(candidate.publishedAt))
    .filter((candidate) => {
      if (seen.has(candidate.url)) return false;
      seen.add(candidate.url);
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

function buildInsight(candidate, index) {
  const tags = candidate.tags;
  const focus = primaryFocus(tags);
  return {
    id: `insight-${compactDate}-${String(index + 1).padStart(3, "0")}`,
    title: candidate.title,
    sourceName: candidate.sourceName,
    sourceType: candidate.sourceType,
    publishedAt: candidate.publishedAt,
    url: candidate.url,
    tags,
    zhSummary: summaryFor(candidate, focus),
    starSummary: starFor(candidate, focus),
    detailedSummary: detailedFor(candidate, focus),
    whyItMatters: whyFor(candidate, focus)
  };
}

function summaryFor(candidate, focus) {
  return `${candidate.sourceName} 的这条信号围绕「${candidate.title}」，体现了 ${focus.label} 正在从概念讨论进入产品、工程或评测实践。`;
}

function starFor(candidate, focus) {
  return {
    situation: focus.situation,
    task: focus.task,
    action: focus.action,
    result: focus.result
  };
}

function detailedFor(candidate, focus) {
  return `这条来自 ${candidate.sourceName} 的候选项被选入每日 Insight，是因为它同时具备 AI 行业相关性和可转化的评测价值。对你的方向，重点不是追逐新闻本身，而是把它拆成可以观察的产品问题：用户是否正确理解系统边界，agent 是否会越权，教育或心理健康场景是否有足够的转介与监督，或者多 agent/机器人/BCI 系统是否暴露出新的社会和认知风险。`;
}

function whyFor(candidate, focus) {
  return focus.why;
}

function primaryFocus(tags) {
  if (tags.includes("agent-evaluation")) {
    return {
      label: "agent 评测与工具边界",
      situation: "AI 产品越来越多地让 agent 调用工具、长期执行任务并接触真实用户数据。",
      task: "需要评估 agent 是否守住授权范围、能否解释行动依据，并在不确定时停止或请求确认。",
      action: "把候选信号转成权限、工具调用、回滚、审计和越界行为的测试用例。",
      result: "每日 Insight 应优先沉淀可复用的 agent 评测指标，而不是只记录产品发布。",
      why: "它能直接服务业务场景 agent 评测，尤其是安全边界、工具可靠性和用户信任校准。"
    };
  }
  if (tags.includes("education-ai") || tags.includes("child-development")) {
    return {
      label: "教育、儿童与发展性 AI",
      situation: "学习型 AI 正进入儿童、学生和教师工作流，但不同发展阶段的风险和收益不同。",
      task: "需要评估学习迁移、依赖、家长/教师在环、隐私和年龄适配。",
      action: "把产品信号转成课堂、家庭学习和发展心理场景中的具体观察任务。",
      result: "教育 AI 评测应同时覆盖效果、安全和发展阶段适配。",
      why: "它连接你的 developmental psychology 背景和真实教育 AI 产品设计。"
    };
  }
  if (tags.includes("mental-health-ai") || tags.includes("neurodiversity")) {
    return {
      label: "心理健康、神经多样性与支持边界",
      situation: "AI 支持工具容易被用户当作稳定陪伴或专业建议来源。",
      task: "需要评估系统是否避免过度承诺，并在危机、不确定或高风险场景中正确转介。",
      action: "设计信任校准、危机识别、边界表达和人工介入的测试任务。",
      result: "敏感人群 AI 产品必须把安全边界和可解释支持方式作为核心指标。",
      why: "它能把 mental health AI 与 neurodiversity 支持转成可测的产品质量标准。"
    };
  }
  if (tags.includes("social-simulation")) {
    return {
      label: "社会模拟与多 agent 行为",
      situation: "多个 LLM agent 组合后可能产生单体模型评测看不到的群体行为。",
      task: "需要评估协作、竞争、信任、操纵、信息传递和集体决策风险。",
      action: "把行业信号转成多轮交互、资源冲突和角色分工的模拟任务。",
      result: "多 agent 产品评测应覆盖群体动态，而不只看单次任务成功率。",
      why: "它直接连接 social simulation 背景和多 agent 产品落地风险。"
    };
  }
  if (tags.includes("embodied-ai") || tags.includes("bci")) {
    return {
      label: "具身智能、机器人与 BCI",
      situation: "AI 正从屏幕内任务扩展到机器人、脑机接口和真实物理环境。",
      task: "需要评估感知、控制、用户意图、错误恢复和人机安全边界。",
      action: "把机器人或 BCI 信号拆成可观测的行为、权限和安全评测。",
      result: "具身 AI 评测必须关注真实世界后果，而不是只看模型回答质量。",
      why: "它把 xAI、Neuralink、Tesla AI / Optimus 等信号纳入 AI 行业和认知科学交叉视角。"
    };
  }
  return {
    label: "AI 行业产品与应用研究",
    situation: "AI 行业信号快速变化，单纯新闻记录难以支持长期判断。",
    task: "需要筛出能转化为产品、评测或用户研究问题的高信号更新。",
    action: "围绕实现方式、用户边界、评测指标和应用场景做结构化总结。",
    result: "每日 Insight 应把行业变化沉淀为可复用的研究和产品判断框架。",
    why: "它保持每日 Insight 的行业中心，同时能接入认知科学和用户研究背景。"
  };
}

function inferTags(candidate) {
  const text = `${candidate.title} ${candidate.rawText || ""} ${candidate.sourceName}`.toLowerCase();
  const tags = new Set();
  if (hasAny(text, keywordGroups.agent) || hasAny(text, keywordGroups.evaluation)) tags.add("agent-evaluation");
  if (hasAny(text, keywordGroups.education)) tags.add("education-ai");
  if (text.includes("child") || text.includes("children") || text.includes("developmental")) tags.add("child-development");
  if (hasAny(text, keywordGroups.health)) tags.add("mental-health-ai");
  if (hasAny(text, keywordGroups.accessibility)) tags.add("neurodiversity");
  if (hasAny(text, keywordGroups.social)) tags.add("social-simulation");
  if (hasAny(text, keywordGroups.embodied)) {
    tags.add(/bci|brain-computer|neural interface|neuralink/.test(text) ? "bci" : "embodied-ai");
  }
  if (candidate.sourceName.toLowerCase().includes("anthropic")) tags.add("anthropic");
  if (candidate.sourceName.toLowerCase().includes("github")) tags.add("open-source");
  if (candidate.sourceName.toLowerCase().includes("hacker news")) tags.add("technical-forum");
  return [...tags].length ? [...tags] : ["ai-industry"];
}

function scoreCandidate(candidate) {
  const text = `${candidate.title} ${candidate.rawText || ""} ${candidate.sourceName}`.toLowerCase();
  if (!hasAny(text, aiTerms)) return 0;
  let score = candidate.priority || 0;
  for (const terms of Object.values(keywordGroups)) {
    if (hasAny(text, terms)) score += 8;
  }
  if (/anthropic|claude/.test(text)) score += 10;
  if (/forum|hacker news|reddit|github|hugging face/.test(text)) score += 5;
  if (/neuroscience(?!.*ai)|biology(?!.*ai)/.test(text)) score -= 8;
  return score;
}

function looksRelevant(text) {
  const lower = text.toLowerCase();
  return hasAny(lower, aiTerms) && Object.values(keywordGroups).some((terms) => hasAny(lower, terms));
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

async function fetchText(url, headers = {}) {
  const requestHeaders = {
    "User-Agent": "DailyBlogInsightUpdater/1.0",
    ...headers
  };
  try {
    const response = await fetch(url, {
      headers: requestHeaders,
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
    return response.text();
  } catch (error) {
    const args = ["-L", "-sS", "--max-time", "15"];
    for (const [key, value] of Object.entries(requestHeaders)) {
      args.push("-H", `${key}: ${value}`);
    }
    args.push(url);
    const curl = spawnSync("curl", args, {
      cwd: new URL(".", ROOT),
      env: process.env,
      encoding: "utf8"
    });
    if (curl.status === 0 && curl.stdout) return curl.stdout;
    throw new Error(`${error.message}; curl fallback failed: ${curl.stderr || curl.status}`);
  }
}

function extractLinks(html, baseUrl) {
  const links = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const text = stripHtml(match[2]);
    if (!href || !text || text.length < 8) continue;
    try {
      links.push({ title: text, url: new URL(href, baseUrl).href });
    } catch {
      // Ignore malformed links.
    }
  }
  return links;
}

function extractDate(text) {
  const numeric = text.match(/20\d{2}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])/);
  if (numeric) {
    const [year, month, day] = numeric[0].split(/[-/]/);
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const named = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),\s+(20\d{2})\b/i);
  if (!named) return "";
  const months = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12"
  };
  const month = months[named[1].slice(0, 3).toLowerCase()];
  return `${named[3]}-${month}-${named[2].padStart(2, "0")}`;
}

function isRecent(dateKey) {
  const date = new Date(`${dateKey}T00:00:00+08:00`);
  if (Number.isNaN(date.valueOf())) return false;
  const today = new Date(`${todayKey}T00:00:00+08:00`);
  const ageDays = Math.floor((today - date) / 86400000);
  return ageDays >= 0 && ageDays <= 92;
}

function daysAgoKey(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_|^ref$|^source$/.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.href.replace(/\/$/, "");
  } catch {
    return url;
  }
}

function cleanTitle(title) {
  return stripHtml(title)
    .replace(/^Featured\s+/i, "")
    .replace(/\s+As agents\b[\s\S]*$/i, "")
    .replace(/\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+20\d{2}\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function stripHtml(value) {
  return decodeXml(String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function readXml(xml, tag) {
  return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() || "";
}

function decodeXml(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function dateKeyInShanghai() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function runCheck() {
  run("node", ["scripts/check-insights.mjs"], { env: { ...process.env, INSIGHT_CHECK_DATE: todayKey } });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: new URL(".", ROOT),
    env: options.env || process.env,
    encoding: "utf8"
  });
  if (result.error && !options.allowFailure) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout || ""}\n${result.stderr || ""}`);
  }
  return { stdout: result.stdout || "", stderr: result.stderr || "", status: result.status };
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
