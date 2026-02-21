# 前端开发进度

## P1: 基础设施修复 ✅ 已完成

### 修复清单

#### P1-1: 修复 auth.ts 请求路径 + Token
- **文件**: `src/api/auth.ts`
- **问题**: 所有 fetch 路径用 `/auth/*` 无 BASE_URL，请求发到 Vite dev server → 404；`DEV_AUTH_TOKEN` 后半段被注释，与后端 `MOCK_TOKEN` 不匹配
- **修复**:
  - 导入 `BASE_URL`，所有路径改为 `${BASE_URL}/auth/*`
  - Token 恢复完整值: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend`
  - `getAuthToken()` 优先从 `localStorage` 读取，fallback 到 `DEV_AUTH_TOKEN`

#### P1-2: 修复 api/index.ts 导出
- **文件**: `src/api/index.ts`
- **问题**: 只导出 `courses`，其他模块均未导出
- **修复**: 新增导出 `auth`、`enrollment`、`reviews`、`recommendations`

#### P1-3: 修复 courses.ts extraFilterCourse
- **文件**: `src/api/courses.ts`
- **问题**: `extraFilterCourse` 对 period/slot 做 `% 2 + 1` 变换，将 24 种不同时段压缩为 4 种，导致虚假冲突和展示失真
- **根因分析**:
  - 后端 period 范围 1-6、slot 范围 1-4（共 24 种组合）
  - 取模后 period 和 slot 都变为 1-2（仅 4 种组合）
  - 每个取模后的组合对应 6 种不同原始时段，冲突判断完全失效
- **修复**: 移除取模逻辑，原样传递后端数据

#### P1-4: 修复 enrollment.ts 响应解构
- **文件**: `src/api/enrollment.ts`
- **问题**: `getSchedule()` 解构为 `data.courses`，但后端返回 `{ schedule, total_credits }`
- **修复**:
  - 返回完整 `ScheduleResponse` 对象
  - 新增类型: `ScheduleEntry`、`ScheduleResponse`、`EnrollResponse`、`ConflictDetail`
  - `enrollInCourse`/`dropCourse` 增加错误信息解析（status code + error data）

#### 附加: 更新 TimeSlot 类型注释
- **文件**: `src/types/course.ts`
- **修复**: `period` 注释从 `1, 2, 3, or 4` 改为 `1-6`（匹配后端实际数据）

### 测试结果

测试脚本: `frontend/test_frontend.sh` — **15/15 通过**

| # | 测试项 | 结果 |
|---|--------|------|
| T1 | `GET /` 健康检查 | ✅ |
| T2 | `GET /api/courses` 返回 77 门课程 | ✅ |
| T3 | `GET /api/courses/1` time_slots 未被篡改 | ✅ |
| T4 | `GET /api/auth/me` 完整 MOCK_TOKEN 认证 | ✅ |
| T5 | 残缺 Token 正确返回 401/403 | ✅ |
| T6 | `POST /api/auth/login` 返回 token + user | ✅ |
| T7 | `GET /api/schedule` 响应含 schedule + total_credits | ✅ |
| T8 | `GET /api/courses/1/reviews` 响应结构正确 | ✅ |
| T9 | `GET /api/courses/1/recommend` 响应结构正确 | ✅ |
| T10 | 选课/退课往返测试 | ✅ |

### TypeScript 编译
- `npx tsc --noEmit` → 零错误

---

## 后续阶段

| 阶段 | 状态 | 说明 |
|------|------|------|
| P1 基础设施修复 | ✅ 完成 | API 层全部可用 |
| P2 核心选课闭环 | ✅ 完成 | 登录/注册 UI、选课接通后端、课表页 |
| P3 评价+推荐+趣味增强 | ✅ 完成 | 评价 CRUD、推荐展示、转盘接通后端、Course Battle |
| P4 数据驱动+体验打磨 | 🔄 部分完成 | AllCoursesPage 分页、CourseCard 雷达图 (Tier List 数据化、筛选、课表网格待做) |
| P6 六边形雷达图可视化 | ✅ 完成 | CourseRadarChart 组件、BattleCard + CourseCard 均集成雷达图 |
| P5 Demo 准备 | ⬜ 未开始 | 错误边界、UI 一致性、Demo 走查 |

---

## P6: 六边形雷达图可视化 ✅ 已完成

### 功能更新

#### P6-1: Course Radar Chart 组件
- **文件**: `src/components/CourseRadarChart.tsx`
- **功能**:
  - 基于 Recharts 实现 6 维度雷达图 (Workload, Difficulty, Practicality, Grading, Teaching, Interest)
  - 处理空数据状态，自适应尺寸
  - 自定义 Tooltip 格式

#### P6-2: Course Battle 体验优化
- **文件**: `src/components/CourseBattle/BattleCard.tsx`
- **功能**:
  - **雷达图集成**: 有评分数据的课程在卡片中直接展示雷达图，直观对比
  - **布局优化**: 调整卡片宽度和间距，适配图表显示
  - **信息层级调整**: 简介改为默认收起 ("Show description")，避免占用过多空间
  - **空状态处理**: 无评分课程显示 "No ratings" 标签，并自动展开文本简介作为替代

#### P6-3: CourseCard 雷达图集成 + 卡片体验重构
- **文件**: `src/components/CourseCard.tsx`
- **问题**:
  - 原先使用 `course.avg_rating` 字段，但后端 `/api/courses` 不返回该字段（只返回 6 个维度 `avg_workload` 等），导致所有课程显示 "No ratings yet"
  - 简介使用 Ant Design `Paragraph ellipsis={{ expandable: true }}` 展开后无法收缩
- **修复**:
  - 评分计算: 改用 `computeOverallAvg()` 从 6 个维度计算综合评分
  - **雷达图集成**: 仿照 BattleCard 设计，有评分数据时在卡片中直接渲染 `CourseRadarChart`(190px)
  - **可收缩简介**: 有雷达图时简介默认收起显示 "Show description"，点击展开后可点 "less" 收回；无评分时显示 3 行截断简介作为替代
  - **评分标签**: 用 `Tag` 显示 ★ 综合评分 + 学分，无评分显示 "No ratings" 标签
  - **元信息**: 底部显示 instructor 和 department
  - **API 修复**: `bodyStyle` 改为 `styles={{ body: ... }}`（修复 Ant Design 5.x 废弃 API 警告）

#### P6-4: AllCoursesPage 分页
- **文件**: `src/components/CourseList.tsx`
- **改动**:
  - 新增 Ant Design `Pagination` 组件，每页 12 门课程
  - 翻页后自动平滑滚动到页面顶部
  - 底部显示 "Total N courses" 总数
  - 课程总数 ≤ 12 时不显示分页控件

#### P6-5: Course 类型补充 avg_rating
- **文件**: `src/types/course.ts`
- **改动**: Course 接口新增 `avg_rating: number | null` 字段（后端实际返回但前端未声明）
- **注意**: 后端 `/api/courses` 列表接口返回的 `avg_rating` 实际为 null（6 维度分数存在于 `avg_workload` 等字段），`computeOverallAvg()` 是前端计算综合分的正确方式

### 变更文件总览

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/components/CourseCard.tsx` | 重构 | BattleCard 风格: 雷达图 + 可收缩简介 + Tag 评分 |
| `src/components/CourseList.tsx` | 增强 | 分页 (12/页) + 滚动到顶部 |
| `src/types/course.ts` | 扩展 | 新增 `avg_rating` 字段 |

### TypeScript 编译
- `npx tsc --noEmit` → 零错误

---

## P2: 核心选课闭环 ✅ 已完成

### 修复清单

#### P2-1: 全局认证状态管理 (AuthContext)
- **新建文件**: `src/context/AuthContext.tsx`
- **技术**: React Context + useReducer
- **功能**:
  - 状态: `user`, `token`, `isAuthenticated`, `loading`
  - Actions: `LOGIN_SUCCESS`, `SET_USER`, `LOGOUT`, `SET_LOADING`
  - 启动时自动验证 localStorage 中的 token (通过 `/auth/me`)
  - 暴露 `useAuth()` hook: `{ user, token, isAuthenticated, login, register, logout }`
  - `login()` → 调 API → 存 token 到 localStorage → dispatch LOGIN_SUCCESS
  - `register()` → 注册后自动登录
  - `logout()` → 清除 localStorage → dispatch LOGOUT

#### P2-2: 登录/注册页面
- **新建文件**: `src/pages/LoginPage.tsx`
- **路由**: `/login`
- **功能**:
  - Tab 切换: Login / Register
  - 登录表单: username + password
  - 注册表单: username + email + password (带邮箱格式验证、密码长度验证)
  - "Dev Login" 快捷按钮 → 用 testuser1/password123 一键登录
  - 成功后 navigate 到 `/courses`
  - 错误提示: Ant Design message

#### P2-3: Navbar 增加用户状态展示
- **文件**: `src/components/Navbar.tsx`
- **改动**:
  - 已登录: 显示用户名 + "My Schedule" 菜单项 + Logout 按钮
  - 未登录: 显示 Login 按钮 (跳转 /login)
  - Debug 按钮改为独立 Button (不再用 Menu.Item)
  - 导入 useAuth, useNavigate

#### P2-4: 选课/退课接通后端 API
- **文件**: `AllCoursesPage.tsx`, `CoursePage.tsx`, `CourseCard.tsx`, `CourseList.tsx`
- **改动**:
  - `AllCoursesPage`: 页面加载时调 `getSchedule()` 获取 enrolledIds Set，合并到 courses 的 enrolled 字段
  - `CoursePage`: 通过 `getSchedule()` 判断当前课程 enrolled 状态，enroll/drop 调真实 API
  - `CourseCard`: 新增 `onEnroll` prop，未选课显示 "Take Course" 按钮，已选显示 "Enrolled" + "Drop Course"
  - `CourseList`: 新增 `onEnroll` prop 透传给 CourseCard
  - 409 冲突时解析 conflicts 数组并显示冲突课程信息
  - 未登录时点选课 → message.warning 提示登录

#### P2-5: 课表页面 (SchedulePage)
- **新建文件**: `src/pages/SchedulePage.tsx`
- **路由**: `/schedule`
- **功能**:
  - 调 `getSchedule()` → 展示课程卡片列表
  - 显示总学分 Tag
  - 每张卡片: 课程信息 + enrolled_at + finished_status Tag + Drop 按钮
  - 空课表: Empty 组件 + "Browse Courses" 引导
  - 未登录: 提示登录

#### P2-6: 前端 Course 类型适配
- **文件**: `src/types/course.ts`
- **新增类型**: `UserResponse`, `TokenResponse`, `ScheduleEntry`, `ScheduleResponse`, `ConflictDetail`

#### 附加: CourseDetail 改进
- **文件**: `src/components/CourseDetail.tsx`
- 新增展示: Credits, Instructor, Department, Capacity, Average Rating
- 移除旧的 Grade 显示 (改由 ScheduleEntry 提供)

#### 路由 & 导出
- `App.tsx`: 包裹 `<AuthProvider>`, 新增 `/login` 和 `/schedule` 路由
- `pages/index.ts`: 导出 `LoginPage`, `SchedulePage`
- `auth.ts`: 增加 `setAuthToken()`, `clearAuthToken()` 辅助函数

### 测试结果

测试脚本: `frontend/test_p2.sh` — **51/51 通过**

| Flow | 测试项 | 数量 | 结果 |
|------|--------|------|------|
| Flow 1 | Login (testuser1) + token 验证 | 5 | ✅ |
| Flow 2 | Register 新用户 + 空课表验证 + 重复注册拒绝 | 6 | ✅ |
| Flow 3 | 课程列表 (77门) + 单课程详情 + 字段完整性 | 5 | ✅ |
| Flow 4 | 选课 + 课表验证 + 学分验证 + 字段完整性 | 7 | ✅ |
| Flow 5 | 时间冲突检测 (409 + conflicts 信息) | 2 | ✅ |
| Flow 6 | 退课 + 课表同步 + 非法退课 404 + 重选 | 4 | ✅ |
| Flow 7 | 未认证访问保护端点 (401/403) | 4 | ✅ |
| Flow 8 | TypeScript 编译 (npx tsc --noEmit) | 1 | ✅ |
| Flow 9 | P2 文件结构验证 | 3 | ✅ |
| Flow 10 | 模块导出 + 关键导入检查 | 14 | ✅ |

### TypeScript 编译
- `npx tsc --noEmit` → 零错误
---

## P3: 评价 + 推荐 + 趣味增强 ✅ 已完成

### 修复清单

#### P3-1: CoursePage 集成评价系统
- **新建文件**: `src/components/ReviewCard.tsx`, `src/components/ReviewSection.tsx`
- **修改文件**: `src/pages/CoursePage.tsx`, `src/api/reviews.ts`
- **功能**:
  - `ReviewSection`: 评价列表 + 提交表单，集成到每个课程详情页底部
  - `ReviewCard`: 单条评价卡片，展示用户名、星级(Ant Design Rate)、评论、创建时间
  - 已登录用户可提交评价(1-5星 + 可选评论)，409 重复评价有 warning 提示
  - 自己的评价显示 Delete 按钮，支持删除后刷新列表
  - 未登录用户看到 "Login to write a review" 提示
  - `reviews.ts` 新增 `ReviewResponse`、`ReviewsData` 类型，`getCourseReviews` 返回完整响应(含 avg_rating、total)
  - `deleteCourseReview` 参数从 `(courseId, reviewId)` 简化为 `(reviewId)`

#### P3-2: CoursePage 集成推荐系统
- **新建文件**: `src/components/RecommendationSection.tsx`
- **修改文件**: `src/api/recommendations.ts`
- **功能**:
  - 课程详情页新增 "Students who took this course also took" 区域
  - 展示推荐课程卡片(code、name、credits、co_enroll_count)
  - 每张卡片可点击跳转到对应课程详情页
  - 无推荐时显示 "No recommendations yet"
  - `recommendations.ts` 新增 `RecommendedCourse`、`RecommendationsData` 类型
  - 后端实际返回字段为 `id`(非 `course_id`)，已修正类型定义

#### P3-3: 转盘选课接通后端
- **修改文件**: `src/components/rouletteSelection/CourseRoulette.tsx`, `CourseWheel.tsx`
- **功能**:
  - 转盘停止后弹出确认 Modal "Confirm Enrollment"，而非直接加入列表
  - 确认后调 `enrollInCourse(courseId)` → 200 成功弹窗 / 409 冲突显示详情
  - 未登录时点击确认 → "Please login first" warning
  - 页面加载时从 `getSchedule()` 读取已选课程，初始化 selectedCourses
  - `CourseWheel` 的 `setSelectedCourses` 从 `React.Dispatch` 改为普通回调函数

#### P3-4: 成绩页（GradePage）接通后端
- **状态**: P2 阶段已完成
- GradePage 已调 `getSchedule()` 获取课程列表，过滤 `finished_status=true`
- 成绩转换: 0-49→U, 50-69→3, 70-84→4, 85-100→5
- 骰子游戏保持不变

#### P3-5: 趣味选课：课程二选一对决 (Course Battle)
- **新建文件**: `src/pages/CourseBattlePage.tsx`, `src/components/CourseBattle/BattleCard.tsx`
- **路由**: `/battle`
- **功能**:
  - 三阶段流程: init → battle → result
  - 初始阶段: 展示介绍文案 + "Start Battle!" 按钮
  - 对决阶段: 左右两张课程卡片，用户点击选择喜欢的课程
    - 胜者留下，败者被替换为推荐系统推荐的相似课程(或随机新课)
    - 调用 `getCourseRecommendations(winnerId)` 获取推荐，优先选未出现过的
    - 进度条显示当前轮次 / 总轮次(默认 7 轮)
    - 加载新挑战者时有 Spin + "Finding next challenger..." 提示
  - 结果阶段: 展示 Trophy + 最终胜出课程 + "Enroll Now" / "Play Again" 按钮
  - `BattleCard`: 课程卡片组件，显示 code、name、credits、rating、description、时间、instructor
    - 确定性颜色(基于 `getColorForCourse`)
    - 选中动画和胜者高亮

#### 路由 & 导航
- `App.tsx`: 新增 `/battle` 路由 → `<CourseBattlePage />`
- `Navbar.tsx`: 新增 "Course Battle" 菜单项(⚡ ThunderboltOutlined 图标)
- `pages/index.ts`: 导出 `CourseBattlePage`
- `components/index.ts`: 导出 `ReviewCard`, `ReviewSection`, `RecommendationSection`

### 测试结果

测试脚本: `frontend/test_p3.sh` — **64/64 通过**

| Flow | 测试项 | 数量 | 结果 |
|------|--------|------|------|
| Flow 1 | Reviews CRUD (GET/POST/DELETE + 409 重复 + 401 未认证) | 12 | ✅ |
| Flow 2 | Recommendations (结构验证 + 字段完整性) | 8 | ✅ |
| Flow 3 | Roulette 选课 (enroll + schedule 验证 + 冲突检测) | 10 | ✅ |
| Flow 4 | GradePage (schedule 数据 + score/finished_status 字段) | 4 | ✅ |
| Flow 5 | Course Battle (API paths + recommend + enroll) | 7 | ✅ |
| Flow 6 | TypeScript 编译 (npx tsc --noEmit) | 1 | ✅ |
| Flow 7 | P3 文件结构验证 (5 new files) | 5 | ✅ |
| Flow 8 | 模块导出 + 关键导入检查 | 17 | ✅ |

### TypeScript 编译
- `npx tsc --noEmit` → 零错误