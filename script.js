const casesData = {
  consulting: {
    title: '战略 · 组织 · 资本',
    items: [
      { c: '某中国500强城市国资平台', s: '企业战略规划综合咨询' },
      { c: '珠海航空城发展集团', s: '十四五发展规划' },
      { c: '青岛环海湾投资发展集团', s: '管理咨询' },
      { c: '某地市轨道交通集团', s: '十四五战略与组织变革' },
      { c: '某大型国有港口集团', s: '战略转型与业务重组咨询' },
      { c: '某新材料科技企业（上市筹备）', s: '公司治理规范化与IPO合规' },
      { c: '某医疗器械企业', s: '引入战略投资人及Pre-IPO辅导' },
      { c: '某电缆上市企业', s: '产业链整合' },
    ]
  },
  talent: {
    title: '培训 · 赋能 · 人才体系',
    items: [
      { c: '上海银行', s: '中高管领导力培训' },
      { c: '汇丰银行', s: '高管工作坊' },
      { c: '太平洋保险某分公司', s: '销售团队赋能与客户经营培训' },
      { c: '青岛某市属国企', s: '中层干部战略与管理能力提升' },
      { c: '某地级市政府机关', s: '公务员数字化能力提升培训' },
      { c: '某省级党校', s: '十五五规划专题培训' },
      { c: '卡拉罗（Carraro）', s: '员工培训' },
      { c: '某新能源制造企业', s: '新晋管理者赋能训练营' },
    ]
  },
  digital: {
    title: 'AI 落地 · 数字科技交付',
    items: [
      { c: '青岛某城投企业', s: '大模型本地部署与多智能体开发' },
      { c: '山东某港口', s: '智能巡检系统开发' },
      { c: '某工程咨询企业', s: '标书制作智能体开发' },
      { c: '青岛某设计院', s: '数字化协同平台开发' },
      { c: '某化工制造企业', s: '生产数据分析与质量管控智能体' },
      { c: '某民营律师事务所', s: '法律文书智能审查与合同生成系统' },
      { c: '某连锁医药零售企业', s: '库存预测与智能补货系统' },
      { c: '某中小电商企业', s: 'AI客服与商品描述自动生成系统' },
    ]
  }
};

function switchTab(el, key) {
  document.querySelectorAll('.cases-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const d = casesData[key];
  document.getElementById('cases-content').querySelector('.cases-content-title').textContent = d.title;
  document.getElementById('cases-items').innerHTML = d.items.map(i => `
    <div class="case-item">
      <div style="flex:1">
        <div class="case-client">${i.c}</div>
        <div class="case-service">${i.s}</div>
      </div>
    </div>
  `).join('');
}

switchTab(document.querySelector('.cases-tab'), 'consulting');

// ─── AI CHAT ───
const history = [];
let isLoading = false;

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function sendSuggestion(el) {
  document.getElementById('chat-input').value = el.textContent;
  document.getElementById('suggestions').style.display = 'none';
  sendMessage();
}

function appendMsg(role, text, loading) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  const isUser = role === 'user';
  div.className = 'hmsg ' + (isUser ? 'hmsg-user' : 'hmsg-ai');
  div.innerHTML = `
    <div class="hmsg-label">${isUser ? '您' : 'Dr. Leader 助手'}</div>
    <div class="hmsg-text">${loading ? '<span class="dots"><span></span><span></span><span></span></span>' : escapeHtml(text)}</div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div.querySelector('.hmsg-text');
}

function stripMd(s) {
  return s
    .replace(/<think[\s\S]*?<\/think>\s*/gi, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^[\s]*[-•]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/>\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(s) {
  return stripMd(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  isLoading = true;
  document.getElementById('send-btn').disabled = true;
  document.getElementById('suggestions').style.display = 'none';
  input.value = '';
  input.style.height = 'auto';

  appendMsg('user', text);
  history.push({ role: 'user', content: text });
  const aiEl = appendMsg('ai', '', true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    const reply = data.reply || '抱歉，暂时无法回复，请稍后再试。';
    history.push({ role: 'assistant', content: reply });
    aiEl.innerHTML = escapeHtml(reply);
    document.getElementById('chat-messages').scrollTop = 9999;
  } catch(e) {
    aiEl.innerHTML = '网络异常，请稍后重试。';
  }

  isLoading = false;
  document.getElementById('send-btn').disabled = false;
  input.focus();
}

// Scroll reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.ctdm-card, .service-card, .team-card, .why-card, .case-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  observer.observe(el);
});
