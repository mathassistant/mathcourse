# TeachAny 课程生成规范

> 活文档 — 每开一门新课发现新规律就更新此文档。
> 生成新课程时默认遵循本规范，无需额外指令。

---

## 1. 文件结构

```
community/{课程目录名}/
├── manifest.json          # 课程元信息
├── index.html             # 课程页面（含播放列表 + Canvas + TeachAnySync）
├── narration.json         # 旁白文本（供 TTS 参考）
├── assets/                # 静态资源（SVG、图片等）
│   └── hero-infographic.svg
└── tts/                   # TTS 音频文件
    ├── manifest.json      # TTS 音频清单
    ├── s01-hero.mp3
    ├── s02-xxx.mp3
    └── ...
```

**课程目录命名：** 使用中文名称（如 `面积与周长对比讲解`），与 `manifest.json` 中的 `name` 保持一致。

---

## 2. manifest.json

```json
{
  "id": "课程目录名",
  "course_id": "课程目录名",
  "node_id": "知识图谱节点ID",
  "name": "中文课程名",
  "name_en": "English Name",
  "subject": "math",
  "grade": "3",
  "stage": "elementary",
  "domain": "geometry",
  "lesson_type": "inquiry-project",
  "status": "community",
  "author": "TeachAny",
  "version": "0.1.0",
  "curriculum": "人教版",
  "description": "一句话描述课程内容",
  "tags": ["小学数学", "几何", "..."],
  "learning_objectives": ["目标1", "目标2", "..."],
  "has_tts": true,
  "has_video": false,
  "has_images": true,
  "has_hero": true,
  "has_canvas": true,
  "has_knowledge_graph": true,
  "free_mode": true,
  "created_at": "YYYY-MM-DD",
  "updated_at": "YYYY-MM-DD"
}
```

**关键字段说明：**

| 字段 | 说明 |
|------|------|
| `has_tts` | 必须设为 `true` |
| `has_canvas` | 有 Canvas 动画时设为 `true` |
| `version` | 初始 `0.1.0`，每次大改递增 |

---

## 3. index.html 结构

### 3.1 页面骨架

```html
<div class="teachany-course">
  <!-- ① 音频播放列表（JSON） -->
  <script type="application/json" data-teachany-audio-playlist>
  [
    {"id":"s01-hero","src":"tts/s01-hero.mp3","label":"开场","target":"hero"},
    {"id":"s02-concept","src":"tts/s02-concept.mp3","label":"概念","target":"concept"},
    ...
  ]
  </script>
</div>

<!-- ② 课程 Section（按播放顺序排列） -->
<section id="hero" class="section" data-tts="s01-hero" data-tsh="开场引入">
  <!-- hero 内容 -->
</section>

<section id="concept" class="section" data-tts="s02-concept" data-tsh="核心概念">
  <!-- 概念内容 -->
</section>

<!-- ... 更多 section ... -->

<!-- ③ Canvas 脚本 -->
<script>
// Canvas 初始化
// TeachAnySync.register(...)
</script>
```

### 3.2 Section 标记规则

每个参与 TTS 旁白的 section 必须标记：

```html
<section id="unique-id" class="section" data-tts="sXX-label" data-tsh="侧边栏显示名称">
```

- `id`：与播放列表中 `target` 字段对应
- `data-tts`：与 `narration.json` 中 `id` 对应
- `data-tsh`：TTS 侧边栏导航中显示的名称

**⚠️ 关键规则：DOM 中 section 的顺序必须与播放列表顺序一致！** 旁白系统按 DOM 顺序构建播放队列，顺序错乱会导致音画错位。

---

## 4. 音频播放列表（Playlist JSON）

在 `index.html` 的 `<script type="application/json" data-teachany-audio-playlist>` 中定义：

```json
[
  {
    "id": "s01-hero",
    "src": "tts/s01-hero.mp3",
    "label": "开场引入",
    "target": "hero"
  },
  {
    "id": "s02-discovery",
    "src": "tts/s02-discovery.mp3",
    "label": "探究实验",
    "target": "discovery",
    "syncConfig": {
      "type": "canvas-step",
      "canvasId": "my-canvas",
      "totalSteps": 4
    }
  },
  {
    "id": "s03-animation",
    "src": "tts/s03-animation.mp3",
    "label": "动画演示",
    "target": "animation-section",
    "syncConfig": {
      "type": "timeline-events",
      "events": [
        {"t": 0, "action": "startAnimation"},
        {"t": 5000, "action": "highlightPoint"}
      ]
    }
  }
]
```

### syncConfig 两种类型

#### 4.1 canvas-step（Canvas 步骤同步）

用于 Canvas 动画按步骤推进，与音频时间轴绑定的场景：

```json
"syncConfig": {
  "type": "canvas-step",
  "canvasId": "canvas-id",
  "totalSteps": 4
}
```

系统会将音频时长均分为 `totalSteps` 段，每段触发 `setStep(n)`。

#### 4.2 timeline-events（时间线事件同步）

用于需要在音频特定时间点触发动作的场景：

```json
"syncConfig": {
  "type": "timeline-events",
  "events": [
    {"t": 0, "action": "startDrawing"},
    {"t": 3000, "action": "showLabel"}
  ]
}
```

- `t`：毫秒，相对于音频起始点
- `action`：传递给 Canvas 的 `doAction(actionName)` 参数

#### 4.3 无 syncConfig

纯文字/图片 section 不需要 `syncConfig`，旁白系统只做滚动定位。

---

## 5. narration.json

供 TTS 参考的旁白文本。每个 section 一段：

```json
[
  {
    "id": "s01-hero",
    "label": "hero",
    "segments": [
      {
        "target": "hero",
        "text": "旁白文本内容..."
      }
    ]
  },
  {
    "id": "s02-concept",
    "label": "concept",
    "segments": [
      {
        "target": "concept",
        "text": "旁白文本内容..."
      }
    ]
  }
]
```

- `id`：与 `data-tts` 对应
- `label`：简短的英文标签
- `segments[].target`：对应的 section id
- `segments[].text`：旁白全文

---

## 6. TTS 音频生成

### 6.1 工具

使用 `edge-tts`（Python 库）：

```bash
edge-tts --voice zh-CN-XiaoxiaoNeural \
  --text "旁白文本" \
  --write-media tts/s01-hero.mp3
```

### 6.2 固定参数

| 参数 | 值 |
|------|-----|
| 语音 | `zh-CN-XiaoxiaoNeural` |
| 格式 | MP3 |
| 语速 | 默认（不调） |

### 6.3 命名规范

```
tts/s{XX}-{label}.mp3
```

- `s01-hero.mp3`、`s02-concept.mp3`、...
- 与 `narration.json` 的 `id` 一致

### 6.4 中文路径处理

edge-tts 在中文路径下可能失败。生成脚本应从**不含中文的父目录**执行。

### 6.5 TTS manifest

`tts/manifest.json` 记录所有音频文件：

```json
{
  "voice": "zh-CN-XiaoxiaoNeural",
  "files": ["s01-hero.mp3", "s02-concept.mp3", "..."],
  "generated_at": "YYYY-MM-DD"
}
```

---

## 7. Canvas 同步实现

每个有 Canvas 动画的 section，必须在 Canvas 脚本中注册同步对象。

### 7.1 canvas-step 模式的 Canvas

```javascript
window.TeachAnySync.register('canvas-id', {
  currentStep: 0,
  maxSteps: 4,
  setStep: function(n) {
    this.currentStep = n;
    // 根据 n 切换 Canvas 状态
    if (n === 0) { drawInitial(); }
    else if (n === 1) { drawStep1(); }
    else if (n === 2) { drawStep2(); }
    else if (n === 3) { drawStep3(); }
  },
  reset: function() {
    this.currentStep = 0;
    drawInitial();
  },
  getMaxSteps: function() {
    return this.maxSteps;
  }
});
```

**setStep 实现方式（三选一）：**

| 方式 | 适用场景 | 示例 |
|------|---------|------|
| 直接调用状态函数 | 自适应 Canvas，直接控制 | `drawStep1()`, `drawStep2()` |
| 模拟按钮点击 | 已有按钮控制 UI 的 Canvas | `document.getElementById('btn-step').click()` |
| 更新滑块/输入值 | 参数驱动的 Canvas | `slider.value = newVal; updateCanvas()` |

**⚠️ setStep 必须是同步函数。** 不需要处理异步动画（音频时间轴已匹配）。

### 7.2 timeline-events 模式的 Canvas

```javascript
window.TeachAnySync.register('canvas-id', {
  doAction: function(action) {
    switch(action) {
      case 'startDrawing': startDrawing(); break;
      case 'showLabel': showLabel(); break;
    }
  }
});
```

### 7.3 用户手动操作时的协调

当用户手动拖动滑块或点击按钮时，通知同步系统：

```javascript
window.TeachAnySync.notifyManualInteraction('canvas-id');
```

这会暂停自动步骤推进，避免与用户操作冲突。

---

## 8. 课程注册

### 8.1 加入 courses.js

在 `community/courses.js` 中将课程 ID 加入注册表：

```javascript
var COURSE_REGISTRY = ["point-line-plane", "array-to-area", "新课程目录名"];
```

使用**课程目录名**（不是 `manifest.json` 中的 `id`），与目录名一致。

### 8.2 生成 manifests.js（主页课程数据）

修改 `courses.js` 后，**必须运行构建脚本**重新生成 `manifests.js`：

```bash
cd teachany-courseware/community
python build-manifests.py
```

该脚本扫描 `courses.js` 中所有已注册课程，读取各自的 `manifest.json`，拼成 `manifests.js` 中的 `ALL_MANIFESTS` 对象。**主页依赖此文件渲染课程列表，漏掉这一步新课程不会出现在主页上。**

---

## 9. 部署工作流

### 9.1 完整流程（新增课程）

```
1. 创建课程目录 + 文件
2. 编辑 courses.js 注册课程
3. 运行 build-manifests.py  ← 关键！否则主页不会有新课程
4. 同步到 deploy 目录
5. git commit & push
```

### 9.2 同步到部署目录

在 `teachany-courseware/community/{课程名}/` 下开发完成后，同步以下内容到 `teachany-deploy/`：

```bash
# 新课程目录
cp -r teachany-courseware/community/{课程名}/ teachany-deploy/{课程名}/

# 共享脚本（如有变更）
cp teachany-courseware/community/teachany-*.js teachany-deploy/

# 课程注册与主页数据（每次新增/修改课程必须同步）
cp teachany-courseware/community/courses.js teachany-deploy/
cp teachany-courseware/community/manifests.js teachany-deploy/
```

> **⚠️ 路径修正：** 源文件在 `community/{课程名}/` 下开发时，`<script src="../../scripts/...">` 是正确的（`community/ → 上级 → 上级 → scripts/`）。但同步到 deploy 根目录后，路径应改为 `../scripts/`。**同步后务必检查并修正 `index.html` 中的脚本/CSS 引用路径！**

### 9.3 Git 提交

```bash
cd teachany-deploy
git add {课程名}/ scripts/ courses.js manifests.js
git commit -m "feat: add {课程名} v0.1.0"
```

### 9.3 部署地址

- Gitee Pages: `https://mathassistant.gitee.io/mathcourses`
- GitHub Pages: `https://mathassistant.github.io/mathcourse`

推送后自动部署。

---

## 10. 课程 Section 设计规范

### 10.1 推荐 8 段式结构

| 序号 | 类型 | 说明 | syncConfig |
|------|------|------|-----------|
| s01 | hero | 开场引入，情境激发兴趣 | 无 |
| s02 | concept | 核心概念讲解 | canvas-step（如有动画） |
| s03 | discovery | 探究/实验环节 | canvas-step |
| s04 | formula | 规律总结/公式 | 无（或 canvas-step） |
| s05 | conceptTest | 概念辨析 | 无 |
| s06 | practice | 分级练习 | 无 |
| s07 | synthesis | 综合挑战 | timeline-events（如有动画） |
| s08 | summary | 课堂小结 | 无 |

### 10.2 变体

- 纯讲解课（无 Canvas）：`syncConfig` 全部省略
- 多用 Canvas 课：更多 section 使用 `canvas-step`

---

## 11. 常见问题与排查清单

### 11.1 音画不同步

| 检查项 | 说明 |
|--------|------|
| DOM 中 section 顺序 == 播放列表顺序？ | 旁白系统按 DOM 顺序读取 `data-tts` 构建队列 |
| 每个 Canvas section 的 `data-tts` 正确？ | 与播放列表 `id` 一致 |
| `syncConfig.totalSteps` 与 `setStep()` 步骤数匹配？ | 多了或少了都会导致步进异常 |
| Canvas 的 `setStep(n)` 实现正确？ | 检查 `n` 从 0 开始，0 是初始状态 |
| `scrollLock` 够长？ | 现为 1800ms，section 间距过大时可能不够 |

### 11.2 音频不播放

| 检查项 | 说明 |
|--------|------|
| `tts/` 目录下 MP3 文件存在？ | 检查文件名与播放列表 `src` 一致 |
| `courses.js` 中已注册？ | 课程目录名必须在 `COURSE_REGISTRY` 中 |
| `manifest.json` 中 `has_tts: true`？ | 否则旁白系统不启动 |
| 浏览器控制台有无 404？ | 检查 MP3 路径是否正确 |

### 11.3 Canvas 动画不跟随

| 检查项 | 说明 |
|--------|------|
| `TeachAnySync.register()` 调用了吗？ | 必须在 Canvas 脚本中注册 |
| `canvasId` 与 `syncConfig` 中一致？ | 大小写敏感 |
| `setStep` 函数存在且是同步的？ | 检查是否有语法错误 |

### 11.4 主页不显示新课程

| 检查项 | 说明 |
|--------|------|
| `build-manifests.py` 运行了？ | 未运行则 `manifests.js` 中没有新课程数据 |
| `manifests.js` 同步到 deploy 了？ | deploy 目录中的主页依赖此文件 |
| `courses.js` 同步到 deploy 了？ | 播放系统依赖此文件查找课程 |
| 浏览器缓存？ | Ctrl+Shift+R 强制刷新，或开无痕窗口验证 |
| Git push 成功了？ | 检查 GitHub/Gitee Pages 是否已更新 |

---

## 12. 版本记录

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-06-02 | 初始版本，基于 5 门已完成课程提炼 |
| 1.1.0 | 2026-06-03 | 第 8 章增加 `build-manifests.py` 步骤；第 9 章补全 `courses.js` + `manifests.js` 同步；第 11 章增加"主页不显示"排查清单 |
| 1.1.1 | 2026-06-03 | 第 9 章增加路径修正警告：同步到 deploy 后 `../../scripts/` 需改为 `../scripts/` |
