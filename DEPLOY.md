# Dr. Leader 官网部署指南

## 前置条件

需要以下工具，逐一检查是否已安装：

### 1. Node.js

打开终端，输入：
```bash
node -v
```

- 如果显示 `v18.x.x` 或更高 → 已安装，跳过
- 如果显示 `command not found` → 访问 https://nodejs.org/ 下载 LTS 版本安装

### 2. Git

```bash
git --version
```

- 如果显示版本号 → 已安装，跳过
- 如果显示 `command not found` → 访问 https://git-scm.com/downloads 安装

### 3. Vercel CLI

```bash
vercel --version
```

- 如果未安装：`npm i -g vercel`

---

## 第一步：初始化 Git 仓库

在项目根目录执行：

```bash
cd /Users/muse/Documents/CLAUDE\ CODE/projects/drleader
git init
git add .
git commit -m "初始提交：Dr. Leader 官网"
```

---

## 第二步：创建 GitHub 仓库并推送

### 方式 A：使用 GitHub CLI（推荐）

1. 安装 gh CLI：
   ```bash
   brew install gh
   ```

2. 登录 GitHub：
   ```bash
   gh auth login
   ```
   - 选择 `GitHub.com`
   - 选择 `HTTPS`
   - 浏览器会弹出登录页面，点击 Authorize

3. 创建仓库并推送：
   ```bash
   gh repo create drleader --public --source=. --push
   ```

### 方式 B：手动创建

1. 打开 https://github.com/new
2. Repository name 填 `drleader`
3. 选择 Public
4. 不要勾选 "Add a README"
5. 点击 Create repository
6. 回到终端执行：
   ```bash
   git remote add origin https://github.com/你的用户名/drleader.git
   git branch -M main
   git push -u origin main
   ```

---

## 第三步：Vercel 部署

### 3.1 连接 GitHub 仓库

1. 打开 https://vercel.com/login ，用 GitHub 账号登录
2. 点击 **Add New...** → **Project**
3. 在列表中找到 `drleader` 仓库，点击 **Import**

### 3.2 配置项目

在部署配置页面：

1. **Framework Preset**：选择 `Other`
2. **Root Directory**：保持默认（`.`）
3. **Build Command**：留空
4. **Output Directory**：留空

### 3.3 添加环境变量（关键步骤）

在同一页面下方 **Environment Variables** 区域：

1. Name 填：`ANTHROPIC_API_KEY`
2. Value 填：你的 Anthropic API Key（以 `sk-ant-` 开头）
3. 点击 **Add**
4. 确认添加后，点击 **Deploy**

部署大约需要 30-60 秒。

### 3.4 获取部署地址

部署成功后，Vercel 会分配一个地址，格式为：
`https://drleader-xxx.vercel.app`

打开这个地址，检查页面是否正常。

---

## 第四步：验证功能

### 页面检查

- [ ] 导航栏各锚点跳转正常
- [ ] CTDM 四位一体展示正常
- [ ] 首席顾问介绍正常
- [ ] 管理咨询服务详情正常
- [ ] 核心团队 7 人展示正常
- [ ] 服务案例三个标签切换正常
- [ ] 差异化优势展示正常
- [ ] 页脚信息正确
- [ ] 移动端响应式正常（缩小浏览器窗口测试）

### AI 对话检查

- [ ] 输入问题后能正常收到回复
- [ ] 点击建议问题按钮能正常对话
- [ ] 连续对话上下文连贯

---

## 第五步（可选）：绑定自定义域名

### 5.1 购买域名

推荐注册商：
- **阿里云**（万网）：https://wanwang.aliyun.com/ （.cn 域名首选）
- **腾讯云**：https://dnspod.cloud.tencent.com/
- **Namecheap**：https://www.namecheap.com/ （.com 域名性价比高）

### 5.2 在 Vercel 添加域名

1. 进入 Vercel 项目 → **Settings** → **Domains**
2. 输入你的域名（如 `drleader.com`），点击 **Add**
3. Vercel 会显示需要配置的 DNS 记录

### 5.3 配置 DNS

到域名注册商的 DNS 管理页面，添加以下记录：

**方式 A（推荐）：CNAME**
| 类型 | 名称 | 值 |
|------|------|-----|
| CNAME | @ | cname.vercel-dns.com |
| CNAME | www | cname.vercel-dns.com |

**方式 B：A 记录**
| 类型 | 名称 | 值 |
|------|------|-----|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

### 5.4 SSL 证书

Vercel 自动为所有域名申请免费 SSL 证书，无需手动操作。DNS 生效后（通常几分钟到几小时），访问 `https://你的域名` 即可。

---

## 日常更新流程

修改代码后：

```bash
git add .
git commit -m "描述改了什么"
git push
```

Vercel 自动部署，30 秒内生效。

---

## 常见问题

### Q: AI 对话返回"网络异常"
1. 检查 Vercel 环境变量 `ANTHROPIC_API_KEY` 是否正确设置
2. 在 Vercel Dashboard → Functions 日志中查看错误详情
3. 确认 API Key 有效且有余额

### Q: 页面样式错乱
1. 确认 `style.css` 和 `script.js` 与 `index.html` 在同一目录
2. 清除浏览器缓存（Cmd+Shift+R 强制刷新）

### Q: Vercel 部署失败
1. 检查 `vercel.json` 格式是否正确
2. 在 Vercel Dashboard 查看构建日志
3. 确认 `api/chat.js` 语法无误

### Q: 域名无法访问
1. DNS 生效需要时间，最长 48 小时（通常几分钟）
2. 用 `nslookup 你的域名` 检查 DNS 是否已指向 Vercel
3. 确认域名未备案拦截（.cn 域名使用国内 DNS 可能需要备案）
