# 图片替换指南

所有占位图均使用 `.img-slot` 样式的虚线框标识，替换时只需将 `<div class="img-slot">` 内的占位内容替换为 `<img>` 标签即可。

## 占位图清单

### 1. 团队 / 服务全景展示图

- **位置**：CTDM 服务区块底部
- **HTML 搜索**：`img-banner img-slot`
- **推荐尺寸**：宽高比 21:6，建议 1260×360px
- **用途**：团队合影、办公环境、服务场景全景

### 2. 管理咨询场景图

- **位置**：管理咨询详情区，左侧图文混排
- **HTML 搜索**：`img-split` 下的第一个 `img-slot`
- **推荐尺寸**：宽高比 4:3，建议 600×450px
- **用途**：咨询会议、战略研讨等场景

### 3. 服务客户 / 项目现场图

- **位置**：服务案例区块底部
- **HTML 搜索**：`img-strip img-slot-dark`
- **推荐尺寸**：宽高比 21:7，建议 1260×420px
- **用途**：项目交付现场、客户签约、培训场景（深色背景）

### 4. 团队合作 / 交付场景图

- **位置**：差异化优势区块，左侧图片
- **HTML 搜索**：`img-pair` 下第一个 `img-slot`
- **推荐尺寸**：宽高比 16:9，建议 800×450px
- **用途**：团队协作、工作坊场景

### 5. 战略咨询 / 数字科技图

- **位置**：差异化优势区块，右侧图片（深色）
- **HTML 搜索**：`img-pair` 下 `img-slot-dark`
- **推荐尺寸**：宽高比 3:4，建议 450×600px
- **用途**：科技感、数字化场景（深色背景）

## 团队成员头像（7 位）

每位成员的 `.team-photo` 内目前是姓氏文字占位，替换为照片：

| 成员 | HTML 搜索关键词 | 头像尺寸 |
|------|----------------|---------|
| 戈云天 博士 | `team-photo">戈` | 96×96px（正方形，显示为圆形） |
| 胡鹏飞 教授 | `team-photo">胡` | 96×96px |
| 杜现平 博士 | `team-photo">杜` | 96×96px |
| 刘天翼 | `team-photo">刘` | 72×72px |
| 明德平 | `team-photo">明` | 72×72px |
| 王诚宇 | `team-photo">王` | 72×72px |
| 项泽逸 | `team-photo">项` | 72×72px |

### 陈卓教授照片

- **位置**：首席顾问区块，`.leader-photo`
- **推荐尺寸**：宽高比 3:4，建议 600×800px

## 替换方法

以「团队全景展示图」为例：

**替换前：**
```html
<div class="img-banner img-slot">
  <div class="img-slot-inner">
    <svg ...></svg>
    <span>团队 / 服务全景展示图</span>
  </div>
</div>
```

**替换后：**
```html
<div class="img-banner img-slot">
  <img src="images/team-panorama.jpg" alt="Dr. Leader 团队全景">
</div>
```

以「戈云天头像」为例：

**替换前：**
```html
<div class="team-photo">戈</div>
```

**替换后：**
```html
<div class="team-photo"><img src="images/ge-yuntian.jpg" alt="戈云天"></div>
```

## 图片优化建议

1. **格式**：优先使用 WebP（兼容性已足够），备选 JPEG
2. **压缩**：使用 [Squoosh](https://squoosh.app/) 在线压缩，质量 80% 左右
3. **文件大小**：单张不超过 200KB，横幅图不超过 300KB
4. **命名**：使用英文小写+连字符，如 `team-panorama.webp`、`ge-yuntian.jpg`
5. **存放目录**：在项目根目录创建 `images/` 文件夹存放
