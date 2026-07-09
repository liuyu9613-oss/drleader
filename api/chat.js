const SYSTEM_PROMPT = `你是"Dr. Leader AI 顾问"，代表 Dr. Leader 团队的专业 AI 助手。你的职责是用专业、友善的语气回答访客关于团队的提问。

【团队简介】
Dr. Leader 是高成长企业的"战略·合规·数智化"全周期合作伙伴，口号"智创价值 数造未来"。

【CTDM 四位一体服务体系】
C - 管理咨询（导航系统）：战略顶层设计、组织架构、IPO合规、供应链优化
T - 人才发展（加速引擎）：胜任力建模、场景化培训、智能化在线学习平台
D - 数字科技（基础设施）：AI落地咨询、大模型本地部署、多智能体系统、RAG知识库
M - 传媒营销（扩音器）：品牌战略、数字全域营销、公关活动

【核心专家团队】
- 戈云天博士（首席咨询师）：美国伊利诺伊大学博士，10年管理咨询，MBB顶尖咨询公司背景
- 胡鹏飞教授（首席技术专家）：山东大学博士生导师，AI安全专家
- 杜现平博士（海洋工程专家）：中山大学"百人计划"副教授
- 刘天翼（高级咨询师）：前世界500强高级经理，8年运营管理
- 明德平（投资并购顾问）：注册税务师，资产重组专家
- 王诚宇（数字化技术顾问）：资深Java工程师，AI系统架构
- 项泽逸（组织发展顾问）：美世认证组织发展官

【部分服务案例】
管理咨询：某中国500强城市国资平台战略规划、珠海航空城发展集团十四五规划、某大型国有港口集团战略转型、多家企业IPO合规辅导
人才发展：上海银行、汇丰银行高管培训、多家政府机关数字化培训、制造业新管理者赋能
数字科技：青岛城投企业大模型部署、山东港口智能巡检、律师事务所法律文书AI审查、电商AI客服系统

【差异化优势】
1. "产学研"双模智库：理论高度与实战深度并重
2. 四位一体生态协同：一站式全链条方案
3. 咨询引领的科技底座：先想清楚业务，再交付技术

回答要求：用自然流畅的中文段落回答，禁止使用任何Markdown格式符号（#、*、**、-、>、\`等），禁止使用项目符号或编号列表，像一位顾问在当面交流一样表达。每次回答不少于300个中文字符，通常控制在300至500个中文字符之间；如果问题较复杂，可以适当延展，但仍要保持专业、具体、易读。如访客问到具体项目合作，引导联系预约咨询。

重要：只输出最终给访客看的回答，不要输出分析、推理过程、草稿、检查过程或标签。`;

const API_BASE = process.env.LLM_API_BASE || 'https://llm.chudian.site/v1';
const MODEL = process.env.LLM_MODEL || 'minimax-m2.7';
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 1200);
const MIN_REPLY_CHARS = 300;
const MAX_REPLY_CHARS = 700;
const REQUEST_TIMEOUT = 12_000;

const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;
const ipRequests = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const record = ipRequests.get(ip) || { count: 0, start: now };
  if (now - record.start > RATE_WINDOW) {
    record.count = 1;
    record.start = now;
  } else {
    record.count++;
  }
  ipRequests.set(ip, record);
  return record.count > RATE_LIMIT;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务端未配置 API Key' });
  }

  let body;
  try {
    body = req.body;
  } catch {
    return res.status(400).json({ error: '请求格式错误' });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  // Cap history to last 20 messages to control cost
  const trimmed = messages.slice(-20);

  try {
    const first = await requestCompletion(apiKey, trimmed, false);
    let raw = extractReply(first.data);

    if (first.error) {
      console.error('LLM API error:', first.error);
      const second = await requestCompletion(apiKey, trimmed, true);
      if (second.error) {
        console.error('LLM retry error:', second.error);
        return res.status(200).json({ reply: fallbackReply(trimmed) });
      }
      raw = extractReply(second.data);
    }

    if (!raw || isBadReply(raw)) {
      console.error('LLM unusable first response:', JSON.stringify(redactForLog(first.data)).slice(0, 1000));
      const second = await requestCompletion(apiKey, trimmed, true);
      raw = extractReply(second.data);
      if (second.error) {
        console.error('LLM retry error:', second.error);
        return res.status(200).json({ reply: fallbackReply(trimmed) });
      }
    }

    const reply = cleanReply(raw) || fallbackReply(trimmed);
    return res.status(200).json({ reply });
  } catch (e) {
    console.error('Proxy error:', e);
    return res.status(200).json({ reply: fallbackReply(trimmed) });
  }
}

async function requestCompletion(apiKey, messages, isRetry) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const apiMessages = [
    {
      role: 'system',
      content: isRetry
        ? `${SYSTEM_PROMPT}\n\n上一次模型没有返回符合要求的正式回答。本次必须直接输出最终中文回答，不要输出任何分析、思考、草稿或前置说明，并确保正文不少于300个中文字符。`
        : SYSTEM_PROMPT,
    },
    ...messages,
  ];

  try {
    const response = await fetch(`${API_BASE.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: Math.max(MAX_TOKENS, 1800),
        temperature: 0.4,
        stream: false,
        do_sample: false,
        thinking: { type: 'disabled' },
        messages: apiMessages,
      }),
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return { error: redactForLog(data), status: response.status, data };
    }
    return { data, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join('\n').trim();
  }
  if (typeof value === 'object') {
    return extractText(value.text || value.content || value.output_text);
  }
  return String(value).trim();
}

function extractReply(data) {
  const choice = data?.choices?.[0];
  return extractText(choice?.message?.content)
    || extractText(choice?.delta?.content)
    || extractText(choice?.text)
    || extractText(data?.output_text)
    || extractText(data?.message?.content)
    || extractText(data?.response)
    || extractText(data?.result)
    || extractText(data?.output);
}

function cleanReply(value) {
  const text = extractText(value)
    .replace(/<think[\s\S]*?<\/think>\s*/gi, '')
    .replace(/^(最终回答|回复|答案)[:：]\s*/i, '')
    .trim();
  if (!text || isBadReply(text)) return '';
  return countReadableChars(text) > MAX_REPLY_CHARS ? `${text.slice(0, MAX_REPLY_CHARS)}。` : text;
}

function isBadReply(text) {
  const value = extractText(text);
  if (!value) return true;
  if (countReadableChars(value) < MIN_REPLY_CHARS) return true;
  return /分析请求|起草回复|格式检查|润色|用户要求|角色设定|限制条件|思考过程|草稿/i.test(value);
}

function fallbackReply(messages) {
  const question = messages.filter((m) => m.role === 'user').at(-1)?.content || '';
  if (/CTDM|四位一体|服务体系|服务/.test(question)) {
    return 'CTDM 是 Dr. Leader 团队提出的四位一体服务体系，核心是把企业发展中经常被割裂的四类能力放在同一张蓝图里协同推进。C 代表管理咨询，帮助企业先把战略方向、组织结构、增长路径和合规要求想清楚，避免一上来就陷入零散执行。T 代表人才发展，通过胜任力模型、场景化培训和在线学习平台，让战略能够被团队理解、承接和持续执行。D 代表数字科技，围绕 AI 落地、大模型部署、知识库和多智能体系统，把咨询成果沉淀为可复用的数字能力。M 代表传媒营销，通过品牌战略、数字营销和公关传播，把企业价值更清晰地传递给市场、客户和资本伙伴。简单说，CTDM 不是单点服务，而是一套从导航、赋能、工具到声量的全周期陪伴方案。它适合那些既需要看清方向，又希望把能力真正落到组织、流程、系统和市场反馈中的企业。';
  }
  if (/团队|专家|顾问|成员/.test(question)) {
    return 'Dr. Leader 的核心专家团队覆盖管理咨询、人工智能、产业研究、投资并购、组织发展和数字化系统建设等多个方向，强调用跨学科能力共同解决企业的真实问题。团队中既有具备博士背景和高校科研资源的专家，也有来自头部咨询公司、世界五百强企业、产业平台和技术一线的顾问成员，能够同时理解战略设计、组织落地、资本合规和技术实施之间的关系。对客户来说，这意味着沟通不会停留在概念层面，而是会结合企业所处行业、发展阶段、治理结构、人才基础和数字化现状，形成更贴近业务现场的方案。Dr. Leader 更适合需要长期陪伴、系统升级和跨部门协同的企业，而不是只想要一份短期报告的项目。团队会根据客户议题灵活组合专家，让战略、技术、人才和传播能力在同一个项目里形成配合。';
  }
  if (/合作|联系|预约|咨询/.test(question)) {
    return '如果您希望进一步合作，可以通过页面中的预约咨询入口与 Dr. Leader 团队取得联系。初次沟通时，我们通常会先了解企业所处行业、当前发展阶段、正在面对的关键问题，以及您希望优先解决的是战略方向、组织能力、数字化工具、合规资本，还是品牌增长。随后团队会根据问题类型安排相应专家参与诊断，帮助您判断哪些事项需要立即处理，哪些可以分阶段推进。对于复杂项目，我们更建议从一次聚焦的需求访谈开始，先把目标、边界、预算、时间表和内部协同机制梳理清楚，再设计后续服务方案。这样合作会更高效，也更容易形成可落地、可衡量、可持续迭代的成果。正式合作前，双方也可以先明确交付物、会议机制和阶段验收方式，让每一步推进都有清晰依据。';
  }
  return '您好，我是 Dr. Leader AI 顾问，可以围绕团队服务体系、专家背景、典型案例和合作方式为您提供说明。Dr. Leader 主要服务处在成长、转型、合规升级或数智化建设阶段的企业，关注的问题不只是做一份咨询报告，而是帮助客户把战略判断、组织执行、数字工具和市场表达连接起来。如果您正在考虑企业发展方向、组织效率、AI 落地、资本合规、品牌增长或人才培养，都可以直接告诉我当前的业务场景和困惑。我会先基于 Dr. Leader 的 CTDM 四位一体方法给出初步分析，再提示哪些问题适合进一步预约专家沟通。若涉及具体项目、预算和实施周期，建议通过预约咨询入口进入正式诊断流程。您提供的信息越具体，我给出的建议就越能贴近企业真实处境。';
}

function countReadableChars(text) {
  return extractText(text).replace(/\s/g, '').length;
}

function redactForLog(value) {
  if (Array.isArray(value)) return value.map(redactForLog);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key,
      /key|token|authorization|secret/i.test(key) ? '[redacted]' : redactForLog(val),
    ])
  );
}
