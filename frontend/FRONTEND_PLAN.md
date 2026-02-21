# 前端开发方案

> 目标：将后端 13 个 API 端点的能力完整体现在前端交互中，最终产品是一个课程选择网站（支持选课、推荐、成绩、趣味功能）。
> 本方案按开发进度分段，每段结束附带测试方法。语言：中文。

---

## 0. 现状分析（开工前必读）

### 0.1 后端 API 端点（全部 13 个，100% 真实 DB）

| # | 方法 | 路径 | 认证 | 返回结构 |
|---|------|------|------|----------|
| 1 | GET | `/` | 否 | `{ status, message }` |
| 2 | GET | `/api/courses` | 否 | `{ courses: CourseResponse[], total: int }` |
| 3 | GET | `/api/courses/{id}` | 否 | `CourseResponse`（含 time_slots, avg_rating, enrolled_count）|
| 4 | POST | `/api/auth/register` | 否 | `UserResponse`（201）|
| 5 | POST | `/api/auth/login` | 否 | `{ access_token, token_type, user: UserResponse }` |
| 6 | GET | `/api/auth/me` | Bearer | `UserResponse` |
| 7 | POST | `/api/schedule/enroll/{course_id}` | Bearer | `{ message, enrollment: {...} }` 或 409 冲突 |
| 8 | DELETE | `/api/schedule/drop/{course_id}` | Bearer | `{ message }` |
| 9 | GET | `/api/schedule` | Bearer | `{ schedule: ScheduleEntry[], total_credits }` |
| 10 | GET | `/api/courses/{id}/reviews` | 否 | `{ reviews: ReviewResponse[], avg_rating, total }` |
| 11 | POST | `/api/courses/{id}/reviews` | Bearer | `ReviewResponse`（201）|
| 12 | DELETE | `/api/reviews/{id}` | Bearer | `{ message }` |
| 13 | GET | `/api/courses/{id}/recommend` | 否 | `{ course_id, recommendations: RecommendedCourse[] }` |

### 0.2 前端已有资产

| 类别 | 已有内容 | 状态 |
|------|----------|------|
| API 层 | auth.ts, courses.ts, enrollment.ts, reviews.ts, recommendations.ts | 函数签名已写，但 **auth.ts 路径错误 + Token 不完整 + index.ts 只导出 courses** |
| 页面 | HomePage, AllCoursesPage, CoursePage, CourseSelectionPage, GradePage, CourseTierListPage, DebugPage | 大部分只拉取课程列表做展示，**enroll/drop 只改本地状态未调 API** |
| 趣味组件 | 骰子游戏（Three.js 物理模拟）| ✅ 完成 |
| 趣味组件 | 转盘选课（react-custom-roulette）| ✅ 完成，但选课结果未提交后端 |
| 趣味组件 | Tier List | ✅ 完成，随机分配课程（可改为按 avg_rating 分级） |
| 趣味组件 | PanicButton（随机借口）| ✅ 完成 |
| 类型 | Course, TimeSlot | 基本对齐，**但缺少 enrolled/score 的后端对应关系** |
| 状态管理 | 无全局状态 | 每个页面独立 useState |

### 0.3 核心问题清单（必须修复）

| ID | 问题 | 影响 | 归属阶段 |
|----|------|------|----------|
| BUG-1 | `auth.ts` 路径用 `/auth/*` 无 BASE_URL，Vite 无代理配置 → 请求发到 Vite dev server → 404 | 认证完全不可用 | P1 |
| BUG-2 | `DEV_AUTH_TOKEN` 后半段被注释（`.mock_token_for_frontend`），与后端 `MOCK_TOKEN` 不匹配 | MOCK 认证失败 | P1 |
| BUG-3 | `api/index.ts` 只 `export * from './courses'`，其他模块均未导出 | 统一 import 路径不可用 | P1 |
| BUG-4 | courses.ts 的 `extraFilterCourse` 将 period/slot 做 `% 2 + 1` 变换 → 时间段数据失真 | 时间冲突判断不准 | P1 |
| GAP-1 | AllCoursesPage / CoursePage 的 enroll/drop 只 `setCourses` 本地状态，未调 `enrollInCourse()`/`dropCourse()` API | 选课不持久化 | P2 |
| GAP-2 | `getSchedule()` 返回的后端结构是 `{ schedule: ScheduleEntry[], total_credits }` 但前端 enrollment.ts 解构为 `data.courses` | 课表数据解析错误 | P2 |
| GAP-3 | 前端 `Course` 类型有 `enrolled: boolean` 和 `score?: string`，后端 `CourseResponse` 无这两个字段 | 需要从 schedule API 推导 enrolled 状态 | P2 |
| GAP-4 | 无登录/注册 UI 页面 | 用户无法获取真实 JWT | P2 |
| GAP-5 | 无评价 UI（查看/提交/删除）| reviews API 完全闲置 | P3 |
| GAP-6 | 无推荐 UI | recommend API 完全闲置 | P3 |
| GAP-7 | Tier List 随机分配课程，未利用 avg_rating | 无数据驱动 | P4 |
| GAP-8 | 转盘选课结果不提交后端 | 趣味功能与真实选课脱节 | P3 |

---

## P1: 基础设施修复（预计 1-2h）

> **目标**：修复所有 API 层 Bug，确保前端能正确调用后端全部 13 个端点。本阶段不改 UI。

### 任务列表

#### P1-1: 修复 auth.ts 请求路径 + Token

```
文件: src/api/auth.ts
改动:
  1. import BASE_URL（或直接用 "http://localhost:8000/api"）
  2. 所有 fetch 路径从 '/auth/*' → '${BASE_URL}/auth/*'
  3. DEV_AUTH_TOKEN 取消注释后半段 → 完整值:
     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend"
```

#### P1-2: 修复 api/index.ts 导出

```
文件: src/api/index.ts
改动:
  export * from './courses';
  export * from './auth';        // 新增
  export * from './enrollment';  // 新增
  export * from './reviews';     // 新增
  export * from './recommendations'; // 新增
```

#### P1-3: 修复 courses.ts 的 extraFilterCourse

```
文件: src/api/courses.ts
改动: 删除或替换 extraFilterCourse 中对 period/slot 的 % 2 + 1 变换。
      后端 period 值域 1-8、slot 值域 1-4，前端应原样使用。
      如果此函数用于前端展示简化（如只显示 2 列），改为在 UI 层做映射，不修改原始数据。
```

#### P1-4: 修复 enrollment.ts 响应解构

```
文件: src/api/enrollment.ts
改动:
  getSchedule() 中:
    旧: return data.courses
    新: return data  // 返回完整 { schedule: ScheduleEntry[], total_credits }
         // 或: return data.schedule.map(entry => entry.course) 如果仍想返回 Course[]
  
  需同步新增 TypeScript 类型:
    interface ScheduleEntry {
      enrollment_id: number;
      course: Course;
      enrolled_at: string;
      finished_status: boolean;
      score: number | null;
    }
    interface ScheduleResponse {
      schedule: ScheduleEntry[];
      total_credits: number;
    }
```

### P1 测试方法

```
测试类型: 手动 + 控制台验证
前置条件: 后端运行在 localhost:8000

1. 打开浏览器 DevTools → Network 面板
2. 访问 AllCoursesPage → 确认 GET /api/courses 返回 200 + 77 门课程
3. 控制台执行:
   - import { getCurrentUser } from './api/auth'
   - await getCurrentUser() → 应返回 { id:1, username:"testuser1", ... }
4. 控制台执行:
   - import { getSchedule } from './api/enrollment'
   - await getSchedule() → 应返回 { schedule: [...], total_credits: N }
5. 确认所有 Network 请求目标为 localhost:8000（非 Vite dev server）
6. 确认无 CORS 错误
```

---

## P2: 核心选课闭环（预计 3-4h）

> **目标**：打通 **注册/登录 → 浏览课程 → 选课/退课 → 查看课表** 完整用户流程。这是 Demo 的核心路径。

### 任务列表

#### P2-1: 全局认证状态管理

```
新建文件: src/context/AuthContext.tsx
技术: React Context + useReducer

状态:
  {
    user: UserResponse | null,   // 当前登录用户
    token: string | null,        // JWT token
    isAuthenticated: boolean,
    loading: boolean,
  }

Actions:
  - LOGIN_SUCCESS(token, user)  → 存 token 到 localStorage + 设置 user
  - LOGOUT                      → 清除 localStorage + 重置状态
  - SET_USER(user)              → 更新用户信息

暴露 hooks:
  - useAuth() → { user, token, isAuthenticated, login, logout, register }

对 API 层的影响:
  - auth.ts 的 getAuthToken() 改为从 localStorage 读取（开发模式 fallback DEV_AUTH_TOKEN）
  - 所有需认证的 API 调用自动附加 Bearer token
```

#### P2-2: 登录/注册页面

```
新建文件: src/pages/LoginPage.tsx
路由: /login

UI 结构:
  - Tab 切换: 登录 | 注册
  - 登录表单: username + password + Submit
  - 注册表单: username + email + password + Submit
  - 错误提示: Ant Design message 组件
  - 成功后: navigate('/courses')

调用 API:
  - login(username, password) → 拿到 { access_token, user } → AuthContext.login()
  - register(username, email, password) → 自动调 login

快捷登录:
  - "Dev Login" 按钮 → 用 testuser1/password123 一键登录（Hackathon Demo 便利）
```

#### P2-3: Navbar 增加用户状态展示

```
文件: src/components/Navbar.tsx
改动:
  - 右侧显示: 未登录 → "Login" 按钮(链接 /login)
  - 已登录 → 用户名 + "My Schedule" 链接 + "Logout" 按钮
  - Logout 调用 AuthContext.logout()
```

#### P2-4: 选课/退课接通后端 API

```
涉及文件:
  - src/pages/AllCoursesPage.tsx
  - src/pages/CoursePage.tsx
  - src/components/CourseCard.tsx
  - src/components/CourseDetail.tsx

改动要点:
  1. onEnroll(courseId) → 调 enrollInCourse(courseId)
     - 成功 → message.success + 更新本地 enrolled 状态
     - 409 冲突 → 解析 conflicts 数组，弹窗显示冲突课程信息
       "时间冲突: Period X, Slot Y 与 [课程名] 冲突"
     - 404 → message.error("课程不存在")
  2. onDrop(courseId) → 调 dropCourse(courseId)
     - 成功 → message.success + 更新本地 enrolled 状态
     - 404 → message.error("未选该课程")
  3. enrolled 状态来源:
     - 方案 A（简单）: 页面加载时调 getSchedule()，生成 enrolledCourseIds: Set<number>
     - 方案 B（精确）: 在 AuthContext 中维护 enrolledCourseIds，每次 enroll/drop 后更新
     → 推荐方案 A（P2 阶段快速实现），P4 再升级为方案 B
```

#### P2-5: 课表页面（My Schedule）

```
新建文件: src/pages/SchedulePage.tsx
路由: /schedule

UI 结构:
  - 标题: "My Schedule"
  - 总学分数显示: "Total Credits: {total_credits}"
  - 课程列表: 用 CourseCard 渲染（增加 enrolled_at、finished_status 展示）
  - 每张卡片有 "Drop Course" 按钮
  - 空课表: "No courses enrolled yet. Browse courses →"
  - 时间冲突网格（可选）:
    8 periods × 4 slots 的网格表，已选课程填充到对应单元格
    可视化展示当前课表占用情况

调用 API:
  - getSchedule() → 渲染 schedule 列表
  - dropCourse(courseId) → 刷新课表

Navbar 新增:
  - "My Schedule" 菜单项（仅已登录时显示）
```

#### P2-6: 前端 Course 类型适配

```
文件: src/types/course.ts
改动:
  1. Course 接口与后端 CourseResponse 对齐:
     - 移除 enrolled 字段（改由 schedule API 推导）
     - 移除 score 字段（改从 ScheduleEntry 获取）
  2. 新增类型:
     interface ScheduleEntry {
       enrollment_id: number;
       course: Course;
       enrolled_at: string;
       finished_status: boolean;
       score: number | null;
     }
     interface ScheduleResponse {
       schedule: ScheduleEntry[];
       total_credits: number;
     }
     interface UserResponse {
       id: number;
       username: string;
       email: string;
       role: string;
       created_at: string;
     }
     interface TokenResponse {
       access_token: string;
       token_type: string;
       user: UserResponse;
     }
     interface ConflictDetail {
       period: number;
       slot: number;
       conflicting_course_id: number;
       conflicting_course_name: string;
     }
```

### P2 测试方法

```
测试类型: 端到端手动测试（按 Demo 路径执行）

前置条件: 后端运行 + DB 已 seed

流程 1 — 登录 + 浏览 + 选课:
  1. 访问 /login → 点击 "Dev Login"（testuser1/password123）
  2. Navbar 显示 "testuser1" + "My Schedule" + "Logout"
  3. 访问 /courses → 显示 77 门课程
  4. 点击任一课程卡片 → 进入详情页 → 点击 "Take Course"
  5. Network 面板确认 POST /api/schedule/enroll/{id} 返回 200
  6. message.success 弹出
  7. 访问 /schedule → 看到刚选的课程 + 正确学分

流程 2 — 冲突检测:
  1. 选一门已占用 Period 1 Slot 2 的课
  2. 再选另一门同样 Period 1 Slot 2 的课
  3. 应弹出冲突提示，显示冲突课程名称
  4. Network 面板确认 409 响应

流程 3 — 退课:
  1. 在 /schedule 页面点 "Drop Course"
  2. Network 面板确认 DELETE 返回 200
  3. 课程从列表消失，学分减少

流程 4 — 注册新用户:
  1. 登出 → 访问 /login → 切换 "注册" Tab
  2. 填写 newstudent / newstudent@liu.se / password123 → Submit
  3. 自动登录 → Navbar 显示 "newstudent"
  4. 访问 /schedule → 空课表

流程 5 — 回归:
  1. 首页 PanicButton 仍可点击 + 弹借口
  2. 课程选择转盘 (/selection) 仍可转动
  3. 成绩页 (/grade) 骰子仍可投掷
```

---

## P3: 评价 + 推荐 + 趣味增强（预计 3-4h）

> **目标**：接入 reviews 和 recommendations API，完善 CoursePage 详情页为"一站式课程信息中心"。将转盘选课结果接通后端。

### 任务列表

#### P3-1: CoursePage 集成评价系统

```
文件: src/pages/CoursePage.tsx + 新组件

改动要点:
  CoursePage 详情页新增两个区域:

  1. 评价列表区域:
     - 调用 getCourseReviews(courseId) 获取数据
     - 展示: 用户名、评分（星星）、评论内容、创建时间
     - 平均评分展示（已有 avg_rating 字段）
     - 如果评论是当前用户的 → 显示 "Delete" 按钮
     - Delete → deleteCourseReview(courseId, reviewId) → 刷新列表

  2. 提交评价表单:
     - 前置条件: 已登录（未登录显示 "Login to review"）
     - 评分: 1-5 星（Ant Design Rate 组件）
     - 评论: TextArea（可选）
     - Submit → addCourseReview(courseId, rating, comment)
     - 409 重复评价 → message.warning("你已经评价过这门课")
     - 成功 → 刷新评价列表

新建组件:
  src/components/ReviewSection.tsx  — 评价列表 + 提交表单
  src/components/ReviewCard.tsx     — 单条评价卡片
```

#### P3-2: CoursePage 集成推荐系统

```
文件: src/pages/CoursePage.tsx + 新组件

改动要点:
  CoursePage 详情页新增 "选了这门课的人还选了" 区域:
  - 调用 getCourseRecommendations(courseId)
  - 展示推荐课程卡片列表（code、name、credits、co_enroll_count）
  - 每张卡片可点击跳转到对应课程详情页
  - co_enroll_count 展示为 "N 人同时选了这门课"
  - 无推荐时显示 "暂无推荐数据"

新建组件:
  src/components/RecommendationSection.tsx — 推荐课程列表
```

#### P3-3: 转盘选课接通后端

```
文件: src/components/rouletteSelection/CourseRoulette.tsx

改动要点:
  当前: 转盘选中课程后只加入本地 selectedCourses 状态
  改为:
    1. 初始状态优化（新增）:
       - 一开始不加载所有课程到转盘（避免过于密集）
       - 显示 "Generate Random Courses" 按钮
       - 点击后随机从有效课程中选择 12-15 门课程作为转盘候选池
       - 这些课程显示在转盘上供用户选择
       - 用户可以重新生成不同的随机子集
    
    2. 转盘停止 → 弹出确认框 "选中了 [课程名]，确认选课？"
    
    3. 确认 → enrollInCourse(courseId)
       - 200 → message.success + 加入 selectedCourses
       - 409 冲突 → 显示冲突信息 + 不加入列表（但保留在可选池中让用户知道）
       - 需登录提示: 未登录时点 SPIN → 弹出 "请先登录"
    
    4. selectedCourses 同步从 getSchedule() 获取初始值（页面加载时）

额外改进:
  - filterValidCourses 逻辑已在前端实现时间冲突判断（保留）
  - 后端也做冲突检测（双重保险）
  - 随机子集大小可配置（默认 12-15 门）
```

#### P3-4: 成绩页（GradePage）接通后端

```
文件: src/pages/GradePage.tsx + src/components/CourseGrade.tsx

改动要点:
  当前: 过滤 courses 中 enrolled=true 的课程显示成绩
  改为:
    1. 调 getSchedule() 获取已选课程列表
    2. 过滤 finished_status=true 的课程
    3. 成绩来源: ScheduleEntry.score（后端 0-100 整数）
    4. 转换为瑞典等级: 0-49→U, 50-69→3, 70-84→4, 85-100→5
    5. 骰子游戏逻辑不变（用随机成绩模拟"改命"的趣味体验）
    6. 如果 score 为 null（未完成课程）→ 显示 "In Progress"
```

#### P3-5: 趣味选课：课程二选一对决 (Course Battle)

```
新建文件: src/pages/CourseBattlePage.tsx + src/components/CourseBattle/BattleCard.tsx
路由: /battle

改动要点:
  新增一种类似 Tinder/对决 的趣味选课方式:
  1. 初始状态: 随机从课程列表中选出两门课程展示在左右两张卡片上。
  2. 交互: 用户点击选择其中一张更喜欢的课程（胜者）。
  3. 推荐补充: 
     - 淘汰未被选中的课程。
     - 调用 getCourseRecommendations(胜者课程ID) 获取与胜者相似的推荐课程。
     - 从推荐列表中选出一门未出现过的课程，作为新的挑战者，补充到空缺的卡片位置。
     - 如果推荐列表为空或已耗尽，则随机补充一门新课程。
  4. 轮次机制: 设定一个总轮次（例如 5 轮或 10 轮）。
  5. 最终结果: 达到指定轮次后，最后留下的课程即为"用户最喜欢的课程"。
  6. 选课操作: 结果页展示最终胜出的课程，并提供 "Enroll Now" 按钮，点击后调用 enrollInCourse(courseId)。
     - 成功 → message.success
     - 冲突 → 提示冲突信息

Navbar 新增:
  - "Course Battle" 菜单项（趣味选课入口）
```

### P3 测试方法

```
测试类型: 功能测试 + API 响应验证

流程 1 — 评价 CRUD:
  1. 登录 testuser1 → 访问任一课程详情 /course/1
  2. 评价列表加载: Network 确认 GET /api/courses/1/reviews 返回 200
  3. 如有历史评价 → 评价卡片展示正确（用户名、星级、评论、时间）
  4. 提交新评价: 选 4 星 + 写评论 → Submit
     - Network 确认 POST /api/courses/1/reviews 201
     - 列表刷新，新评价出现在顶部
  5. 再次提交 → 409 → message.warning
  6. 删除自己的评价 → Network 确认 DELETE /api/reviews/{id} 200
     - 评价从列表消失

流程 2 — 推荐:
  1. 访问已有选课记录的课程详情
  2. "选了这门课的人还选了" 区域加载
  3. Network 确认 GET /api/courses/{id}/recommend 200
  4. 推荐课程卡片可点击跳转

流程 3 — 转盘选课:
  1. 登录 → 访问 /selection
  2. 初始状态: 显示 "Generate Random Courses" 按钮（转盘不可见或为空）
  3. 点击 "Generate Random Courses" → 转盘显示 12-15 门随机课程
  4. 验证转盘课程数量在合理范围内（不会过于密集）
  5. SPIN → 停止 → 确认框弹出
  6. 确认 → Network POST /api/schedule/enroll → 200 → message.success
  7. 再转 → 选到时间冲突的课 → 409 → 显示冲突信息
  8. 测试重新生成: 点击 "Generate Random Courses" 再次生成不同的课程子集
  9. 未登录时 SPIN → 提示登录

流程 4 — 成绩页:
  1. 登录 → 选几门课 → 访问 /grade
  2. Network 确认 GET /api/schedule 200
  3. 仅显示 finished_status=true 的课程（如有 seed 数据）
  4. 骰子游戏仍可玩

流程 5 — 课程二选一对决 (Course Battle):
  1. 登录 → 访问 /battle
  2. 页面展示两门初始课程卡片。
  3. 点击选择其中一门，另一门被替换为新课程。
  4. Network 确认调用了 GET /api/courses/{id}/recommend 获取推荐。
  5. 连续选择达到设定轮次（如 5 轮）。
  6. 页面展示最终胜出的课程，并显示 "Enroll Now" 按钮。
  7. 点击 Enroll → Network POST /api/schedule/enroll → 200 → message.success。

回归测试:
  - /courses 列表加载正常
  - /course/:id 详情页包含新增的评价区域和推荐区域
```

---

## P4: 数据驱动增强 + 体验打磨（预计 2-3h）

> **目标**：将剩余趣味功能用真实数据驱动，完善全站体验，为 Demo 做最终准备。

### 任务列表

#### P4-1: Tier List 数据驱动

```
文件: src/components/tierlist/Tierlist.tsx

改动要点:
  当前: useEffect 中 Math.random() 分配课程到 S-F 等级
  改为: 根据 avg_rating 分级
    - S: avg_rating >= 4.5
    - A: avg_rating >= 4.0
    - B: avg_rating >= 3.5
    - C: avg_rating >= 3.0
    - D: avg_rating >= 2.5
    - E: avg_rating >= 2.0
    - F: avg_rating < 2.0 或 null（无评价）
  
  交互增强（可选）:
    - 拖拽排序（用户自定义 Tier 排名）
    - 点击课程代码 → 跳转详情页
```

#### P4-2: AllCoursesPage 筛选增强

```
文件: src/pages/AllCoursesPage.tsx

改动要点:
  后端支持 5 种筛选参数: keyword, department, credits, period, slot
  前端添加筛选 UI:
    - 搜索框: keyword（Input.Search，防抖 300ms）
    - 下拉筛选: department（Ant Design Select，选项从课程列表 distinct 提取）
    - 数字筛选: credits（Select: 6/8/12/All）
    - Period 筛选: 1-8 多选
    - Slot 筛选: 1-4 多选
  
  调用方式:
    GET /api/courses?keyword=machine&period=2&slot=1
    所有筛选参数拼接为 query string 传给后端
```

#### P4-3: DebugPage 功能实现

```
文件: src/pages/DebugPage.tsx

改动:
  - "Reset User State" → logout + 清除 localStorage
  - "Assign Random Courses" → 随机从课程列表选 3 门 → 依次调 enrollInCourse()
  - 新增 "Reset Database" 按钮（可选，调后端 reset 脚本 — 需后端配合）
  - 新增 "API Health Check" → 调 GET / 显示连接状态
  - 显示当前 Token、用户信息、已选课程数等调试信息
```

#### P4-4: 全局 enrolled 状态管理（升级）

```
文件: src/context/AuthContext.tsx（或新建 src/context/ScheduleContext.tsx）

改动:
  P2 阶段方案 A（每次页面加载都调 getSchedule）升级为方案 B:
  - ScheduleContext 维护 enrolledCourseIds: Set<number>
  - 登录后自动调 getSchedule() 初始化
  - enroll 成功 → add(courseId)
  - drop 成功 → delete(courseId)
  - 所有页面/组件通过 useSchedule() 获取 enrolled 状态
  - CourseCard 根据 enrolledCourseIds.has(id) 显示 enrolled 标记

好处:
  - 避免每个页面重复调 getSchedule()
  - enroll/drop 后全站即时反映（无需刷新）
```

#### P4-5: 课表可视化（时间网格）

```
新建文件: src/components/ScheduleGrid.tsx
集成到: src/pages/SchedulePage.tsx

UI:
  8 行（Period 1-8）× 4 列（Slot 1-4）的网格表
  已选课程填充到对应单元格:
    - 背景色: getColorForCourse(course)
    - 显示: 课程代码
    - 点击: 跳转课程详情
  空槽: 灰色虚线
  视觉效果: 一目了然的课表时间分布
```

### P4 测试方法

```
测试类型: 功能验证 + Demo 走查

1. Tier List 验证:
   - 访问 /tiers → 课程按 avg_rating 分级
   - 高评分课程在 S/A 层级，低评分在 D/E/F
   - 点击课程代码可跳转详情

2. 筛选功能验证:
   - /courses 页面输入 "machine" → 只显示包含 machine 的课程
   - Network 确认 query string 传递给后端
   - 多条件组合筛选正确

3. DebugPage 验证:
   - Reset User State → 登出 + Navbar 恢复未登录状态
   - Assign Random Courses → 3 门课选入 → /schedule 能看到

4. 全局状态验证:
   - /courses 选课 → 不刷新访问 /selection → 转盘已排除刚选的课的时间冲突
   - /schedule 退课 → 返回 /courses → 卡片 enrolled 标记消失

5. 课表网格验证:
   - /schedule 页面展示 8×4 网格
   - 已选课程在正确的 period-slot 位置显示
   - 颜色与 CourseCard 一致
```

---

## P5: Demo 准备 + 最终集成测试（预计 1-2h）

> **目标**：确保 Demo 路径流畅，修复发现的 Bug，准备展示环境。

### 任务列表

#### P5-1: Demo 路径脚本化

```
准备一份 Demo 流程:
  1. 首页展示 → "Welcome to Better LISAM" + PanicButton
  2. 登录(Dev Login) → Navbar 变化
  3. 浏览课程(/courses) → 搜索 "Machine Learning"
  4. 课程详情 → 评价区(星级+评论) + 推荐区("选了这门课的人还选了...")
  5. 选课 → 成功弹窗
  6. 再选一门冲突课 → 冲突弹窗("Period 2, Slot 1 与 Machine Learning 冲突！")
  7. 课表页 → 8×4 网格可视化
  8. 转盘选课 → SPIN → 确认 → 自动选课
  9. Tier List → 数据驱动的课程排名
  10. 成绩页 → 骰子改命
  11. PanicButton → 随机借口

确保每个步骤无 loading 卡顿、无 console error。
```

#### P5-2: 错误边界 + 空状态处理

```
全局:
  - 后端不可用时 → 友好错误提示（而非空白页）
  - API 超时 → Retry / 提示用户
  
页面级:
  - /schedule 空课表 → "No courses yet" + 引导跳转
  - /course/:id 无评价 → "Be the first to review!"
  - /course/:id 无推荐 → "No recommendations yet"
  - /tiers 无评分数据 → 全部归入 F 层 + 提示 "Add reviews to see ratings"
```

#### P5-3: UI 一致性检查

```
- 所有页面配色一致（当前全局背景 #80dcf3 天蓝色）
- 加载状态: 统一用 LoadingSpinner
- 错误提示: 统一用 Ant Design message
- 按钮风格: 统一 Ant Design Button
- 响应式: 确认移动端可用（Ant Design Grid xs/sm/md/lg）
```

### P5 测试方法

```
测试类型: 完整 Demo 走查 × 3 遍

走查 1 — 正常路径:
  严格按 P5-1 的 Demo 流程执行，记录任何卡顿或错误

走查 2 — 异常路径:
  - 未登录访问受保护功能
  - 选课 → 退课 → 再选同一门课
  - 大量快速操作（连续 SPIN 转盘 5 次）
  - 刷新页面后状态是否保留

走查 3 — 后端关闭:
  - 停止后端 → 前端每个页面是否有友好提示
  - 重启后端 → 前端是否自动恢复

验收标准:
  ✅ 13 个后端 API 至少在前端有 1 处调用点
  ✅ Demo 路径 0 error、0 卡顿
  ✅ 3 个趣味功能可展示（转盘、骰子、Panic）
  ✅ 数据驱动（非硬编码）
```

---

## P6: 六边形雷达图可视化 (Hexagon Radar Chart Visualization)

> **目标**：将课程的评价数据从单一的星级扩展为 6 个维度，并使用六边形雷达图进行直观展示，方便用户对比课程。

### 任务列表

#### P6-1: 更新前端类型定义

```
文件: src/types/course.ts
改动:
  1. Course 接口新增 6 个维度的平均分字段:
     avg_workload?: number;
     avg_difficulty?: number;
     avg_practicality?: number;
     avg_grading?: number;
     avg_teaching_quality?: number;
     avg_interest?: number;
  2. ReviewResponse 和 ReviewCreate 接口新增这 6 个维度的评分字段 (1-5)。
```

#### P6-2: 引入图表库并创建雷达图组件

```
新建文件: src/components/CourseRadarChart.tsx
技术: recharts (或 @ant-design/charts)
改动:
  1. npm install recharts
  2. 创建 CourseRadarChart 组件，接收 Course 对象作为 prop。
  3. 将 6 个维度的平均分映射为雷达图的数据格式。
  4. 渲染 RadarChart，设置合适的颜色、网格和标签。
  5. 处理空数据状态（如无评价时显示占位图或提示）。
```

#### P6-3: 课程详情页集成雷达图

```
文件: src/components/CourseDetail.tsx (或 src/pages/CoursePage.tsx)
改动:
  1. 引入 CourseRadarChart 组件。
  2. 在课程详情的显著位置（如右上角或单独的卡片区域）展示雷达图。
  3. 替换或优化原有的复杂文本统计信息，使界面更简洁直观。
```

#### P6-4: 评价表单支持 6 维度打分

```
文件: src/components/ReviewSection.tsx
改动:
  1. 修改提交评价的表单，将单一的 Rate 组件扩展为 6 个维度的 Rate 组件（或滑动条）。
  2. 增加每个维度的说明标签（如：工作量、难度、实用性等）。
  3. 提交时将 6 个维度的分数打包发送给后端。
```

#### P6-5: 评价卡片展示维度分数

```
文件: src/components/ReviewCard.tsx
改动:
  1. 在单条评价卡片中，除了展示评论文本，还可以用紧凑的方式（如微型雷达图、进度条或标签）展示该用户对 6 个维度的具体打分。
```

---

## 阶段依赖关系

```
P1 (基础设施修复)
 │
 ▼
P2 (核心选课闭环)  ←── 这是 Demo 最小可展示版本
 │
 ├──→ P3 (评价 + 推荐 + 趣味增强)
 │
 ├──→ P4 (数据驱动 + 体验打磨)  ← P3, P4 可并行
 │
 └──→ P6 (六边形雷达图可视化)  ← 依赖 P3 的评价系统和后端的 P5
       │
       ▼
      P5 (Demo 准备)
```

**最小可演示版本 = P1 + P2 完成后（约 5h）**：用户能 登录→浏览→选课→退课→看课表。

**完整功能版本 = P1-P4, P6 全部完成后（约 14h）**：加上评价、推荐、Tier List 数据化、筛选、课表网格、六边形雷达图。

---

## 文件变更总览

| 阶段 | 新建文件 | 修改文件 |
|------|----------|----------|
| P1 | — | api/auth.ts, api/index.ts, api/courses.ts, api/enrollment.ts |
| P2 | context/AuthContext.tsx, pages/LoginPage.tsx, pages/SchedulePage.tsx, types/course.ts(扩展) | App.tsx, Navbar.tsx, AllCoursesPage.tsx, CoursePage.tsx, CourseCard.tsx, CourseDetail.tsx |
| P3 | components/ReviewSection.tsx, components/ReviewCard.tsx, components/RecommendationSection.tsx, pages/CourseBattlePage.tsx, components/CourseBattle/BattleCard.tsx | CoursePage.tsx, CourseRoulette.tsx, GradePage.tsx, CourseGrade.tsx, App.tsx, Navbar.tsx |
| P4 | components/ScheduleGrid.tsx, context/ScheduleContext.tsx | Tierlist.tsx, AllCoursesPage.tsx, DebugPage.tsx |
| P6 | components/CourseRadarChart.tsx | types/course.ts, CourseDetail.tsx, ReviewSection.tsx, ReviewCard.tsx |
| P5 | — | 全站 Bug 修复 |

---

## 后端 API → 前端调用点 映射（终态）

| 后端端点 | 前端调用位置 |
|----------|-------------|
| GET `/` | DebugPage（健康检查） |
| GET `/api/courses` | AllCoursesPage, CourseSelectionPage, GradePage, CourseTierListPage |
| GET `/api/courses/{id}` | CoursePage |
| POST `/api/auth/register` | LoginPage（注册 Tab） |
| POST `/api/auth/login` | LoginPage（登录 Tab + Dev Login） |
| GET `/api/auth/me` | AuthContext（初始化已登录用户） |
| POST `/api/schedule/enroll/{id}` | CoursePage, CourseRoulette, DebugPage |
| DELETE `/api/schedule/drop/{id}` | CoursePage, SchedulePage |
| GET `/api/schedule` | SchedulePage, GradePage, AuthContext/ScheduleContext |
| GET `/api/courses/{id}/reviews` | CoursePage → ReviewSection |
| POST `/api/courses/{id}/reviews` | CoursePage → ReviewSection |
| DELETE `/api/reviews/{id}` | CoursePage → ReviewSection |
| GET `/api/courses/{id}/recommend` | CoursePage → RecommendationSection, CourseBattlePage |

**13/13 端点全部有前端调用点 ✅**
