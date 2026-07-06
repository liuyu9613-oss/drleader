# Dr. Leader 官网

Dr. Leader 企业官网 —— 智创价值 数造未来

## 本地预览

1. 安装 [Node.js](https://nodejs.org/)（v18+）
2. 安装 Vercel CLI：`npm i -g vercel`
3. 在项目根目录运行：`vercel dev`
4. 浏览器打开 `http://localhost:3000`

> 直接用浏览器打开 `index.html` 也可以预览页面，但 AI 对话功能需要 `vercel dev` 才能工作（因为需要 `/api/chat` 代理）。

## 项目结构

```
drleader/
├── index.html       # 主页面
├── style.css        # 样式
├── script.js        # 交互逻辑 + AI 对话
├── api/
│   └── chat.js      # Vercel Serverless Function（API 代理）
├── vercel.json      # Vercel 部署配置
├── .gitignore
├── IMAGES.md        # 图片替换指南
└── DEPLOY.md        # 详细部署步骤
```

## 修改内容

| 想改什么 | 改哪个文件 |
|---------|-----------|
| 页面文案 | `index.html` |
| 颜色/字体/布局 | `style.css`（修 `:root` 变量即可改全局配色） |
| AI 对话行为 | `api/chat.js` 中的 `SYSTEM_PROMPT` |
| 服务案例数据 | `script.js` 中的 `casesData` |
| 团队成员信息 | `index.html` 中 `<!-- TEAM -->` 区域 |
| 占位图 | 参考 `IMAGES.md` |

## 更新上线

```bash
git add .
git commit -m "更新说明"
git push
```

Vercel 会自动检测 push 并部署，通常 30 秒内生效。
