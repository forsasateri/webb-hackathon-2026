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
| P3 评价+推荐+趣味增强 | ⬜ 未开始 | 评价 CRUD、推荐展示、转盘接通后端 |
| P4 数据驱动+体验打磨 | ⬜ 未开始 | Tier List 数据化、筛选、课表网格 |
| P5 Demo 准备 | ⬜ 未开始 | 错误边界、UI 一致性、Demo 走查 |

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
