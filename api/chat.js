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

回答要求：用自然流畅的中文段落回答，禁止使用任何Markdown格式符号（#、*、**、-、>、\`等），禁止使用项目符号或编号列表，像一位顾问在当面交流一样表达，150字以内，简明扼要。如访客问到具体项目合作，引导联系预约咨询。

重要：只输出最终给访客看的回答，不要输出分析、推理过程、草稿、检查过程或标签。`;

const API_BASE = process.env.LLM_API_BASE || 'https://llm.chudian.site/v1';
const MODEL = process.env.LLM_MODEL || 'minimax-m2.7';
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 1200);
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
        ? `${SYSTEM_PROMPT}\n\n上一次模型没有返回可展示的正式回答。本次必须直接输出最终中文回答，不要输出任何分析、思考、草稿或前置说明。`
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
        max_tokens: Math.max(MAX_TOKENS, 1200),
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
  return text.length > 320 ? `${text.slice(0, 320)}。` : text;
}

function isBadReply(text) {
  const value = extractText(text);
  if (!value) return true;
  if (value.length < 18) return true;
  return /分析请求|起草回复|格式检查|润色|用户要求|角色设定|限制条件|思考过程|草稿/i.test(value);
}

function fallbackReply(messages) {
  const question = messages.filter((m) => m.role === 'user').at(-1)?.content || '';
  if (/CTDM|四位一体|服务体系|服务/.test(question)) {
    return 'CTDM 是 Dr. Leader 的四位一体服务体系，以管理咨询明确方向，以人才发展强化执行，以数字科技沉淀能力，以传媒营销放大价值，帮助企业完成从战略设计到落地增长的全周期升级。';
  }
  if (/团队|专家|顾问|成员/.test(question)) {
    return 'Dr. Leader 汇聚管理咨询、人工智能、产业研究、投资并购与组织发展等方向的专家，为企业提供战略、合规、数智化和人才发展的综合支持。';
  }
  if (/合作|联系|预约|咨询/.test(question)) {
    return '您可以通过页面中的预约咨询入口联系我们，我们会结合企业所处阶段、核心问题和目标场景，安排专家进一步沟通合作方案。';
  }
  return '您好，我是 Dr. Leader AI 顾问，可以为您介绍我们的服务体系、专家团队、典型案例和合作方式。您也可以直接告诉我企业目前遇到的问题，我会尽量给出简明建议。';
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
