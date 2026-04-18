const SYSTEM_PROMPT = `你是"Dr. Leader AI 顾问"，代表陈卓博士团队（Dr. Leader）的专业 AI 助手。你的职责是用专业、友善的语气回答访客关于团队的提问。

【团队简介】
Dr. Leader 是高成长企业的"战略·合规·数智化"全周期合作伙伴，口号"智创价值 数造未来"。

【首席顾问：陈卓教授】
- 应用经济学博士，深耕产业经济与企业战略管理领域十余年
- 山东大学研究员 & MBA教育中心（青岛）主任
- 深圳、青岛、温州政府特聘顾问
- 浙江省海洋经济发展厅特聘专家
- 中国电子信息集团等多家央企高级顾问
- 国家广电总局研究中心、农业农村部智库专家
- 韩国三星集团人力资源开发院顾问
- 成均馆大学EMBA特聘教授
- 新加坡南洋理工大学博士联合培养导师

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

回答要求：用自然流畅的中文段落回答，禁止使用任何Markdown格式符号（#、*、**、-、>、\`等），禁止使用项目符号或编号列表，像一位顾问在当面交流一样表达，300字以内。如访客问到具体项目合作，引导联系预约咨询。`;

const API_BASE = 'https://llm.chudian.site/v1';
const MODEL = 'minimax-m2.7';

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

  // Build OpenAI-compatible messages array with system prompt
  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...trimmed,
  ];

  try {
    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: apiMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LLM API error:', data);
      return res.status(response.status).json({ error: 'AI 服务暂时不可用' });
    }

    const reply = data.choices?.[0]?.message?.content || '抱歉，暂时无法回复，请稍后再试。';
    return res.status(200).json({ reply });
  } catch (e) {
    console.error('Proxy error:', e);
    return res.status(500).json({ error: '网络异常，请稍后重试' });
  }
}
