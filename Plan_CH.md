# 课程选择系统 — 24小时 Hackathon 开发计划

**技术栈**：React + TypeScript + Vite + Ant Design / FastAPI + SQLAlchemy + SQLite  
**认证方案**：JWT（用户名 + 密码，bcrypt hash）  
**状态管理**：React Context + useReducer  
**团队规模**：4–5 名 junior Web 开发者（Person A–E）  
**架构**：原子化重构 + 4 层架构（I1 入口层 → I2 协调层 → I3 分子层 → I4 原子层）

---

## 数据库设计

5 张核心表，位于 `database/` 目录下：

| 表名 | 关键字段 | 说明 |
|---|---|---|
| `users` | id, username, email, password_hash, role, created_at | 用户表 |
| `courses` | id, code, name, description, credits, instructor, department, capacity, enrolled_count | 课程表 |
| `time_slots` | id, course_id(FK), day_of_week, start_time, end_time, location | 时间段表 |
| `reviews` | id, user_id(FK), course_id(FK), rating(1-5), comment, created_at | 评价表 |
| `enrollments` | id, user_id(FK), course_id(FK), enrolled_at | 选课记录表 |

约束：`enrollments` 表 `(user_id, course_id)` 唯一索引；`reviews` 表同理，防止重复评价。

---

## 阶段 1：地基搭建（第 0–3 小时）— 全员协作

### 1.1 Monorepo 初始化
- 根目录 `package.json`（scripts: `dev:client`, `dev:server`）、`.gitignore`、`.env.example`

### 1.2 前端初始化（Person C + D）
- 在 `client/` 下执行 `npm create vite@latest . -- --template react-ts`
- 安装依赖：`antd`, `react-router-dom`, `@ant-design/icons`
- 配置 `client/vite.config.ts`（proxy → `localhost:8000`）、`client/tsconfig.json`（路径别名 `@/` → `src/`）

### 1.3 后端初始化（Person A + B）
- 在 `server/` 下创建 `pyproject.toml` 或 `requirements.txt`
- 依赖：`fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `python-jose[cryptography]`, `passlib[bcrypt]`, `python-multipart`
- 创建虚拟环境 `python -m venv venv`

### 1.4 数据库（Person E）
- 在 `database/schema.sql` 中编写建表 SQL
- 在 `database/seed.py` 中编写种子数据脚本（15–20 门课程、预设时间段、2 个测试用户）
- SQLite 数据库文件位于 `database/app.db`

**交付物**：`npm run dev:client` 能看到 Vite 默认页面，`uvicorn` 能启动并返回 `{"status": "ok"}`，种子数据可导入。

---

## 阶段 2：原子层 I4（第 3–8 小时）— 并行开发

> **核心规则**：每个原子文件约 80 行，形成完整功能。原子之间**禁止相互 import**。

### Server I4_atoms（Person A + Person B）

| 文件 | 职责 | 负责人 |
|---|---|---|
| `server/src/I4_atoms/db/connection.py` | SQLAlchemy engine、`SessionLocal` 工厂、`get_db` 依赖注入 | A |
| `server/src/I4_atoms/db/models.py` | ORM 模型：`User`, `Course`, `TimeSlot`, `Review`, `Enrollment` | A |
| `server/src/I4_atoms/types/schemas.py` | Pydantic 模型：请求体（`CourseCreate`, `ReviewCreate`, `UserRegister`, `UserLogin`）、响应体（`CourseResponse`, `ReviewResponse`, `UserResponse`, `ScheduleResponse`） | A |
| `server/src/I4_atoms/types/enums.py` | 枚举：`DayOfWeek`, `UserRole`, `SortOption` | A |
| `server/src/I4_atoms/helpers/password.py` | `hash_password(plain)` → str, `verify_password(plain, hashed)` → bool | B |
| `server/src/I4_atoms/helpers/jwt_helper.py` | `create_token(user_id, username)` → str, `decode_token(token)` → dict | B |
| `server/src/I4_atoms/helpers/response.py` | `success_response(data, msg)`, `error_response(msg, code)` 标准 JSON 包装 | B |
| `server/src/I4_atoms/validators/course_validator.py` | `validate_course_code(code)`, `validate_credits(n)` 纯函数 | B |
| `server/src/I4_atoms/validators/review_validator.py` | `validate_rating(r)`, `validate_comment(text)` 纯函数 | B |
| `server/src/I4_atoms/validators/schedule_validator.py` | `check_time_conflict(slot_a, slot_b)` → bool 纯函数 | B |

### Client I4_atoms（Person C + Person D）

| 文件 | 职责 | 负责人 |
|---|---|---|
| `client/src/I4_atoms/types/course.ts` | `Course`, `TimeSlot`, `Enrollment` 接口定义 | C |
| `client/src/I4_atoms/types/user.ts` | `User`, `AuthState`, `LoginRequest`, `RegisterRequest` | C |
| `client/src/I4_atoms/types/review.ts` | `Review`, `ReviewCreate`, `ReviewStats` | C |
| `client/src/I4_atoms/types/api.ts` | `ApiResponse<T>`, `PaginatedResponse<T>`、错误类型 | C |
| `client/src/I4_atoms/utils/api-client.ts` | `fetchApi<T>(url, options)` — fetch 封装，自动附加 JWT header、JSON 解析、错误处理 | C |
| `client/src/I4_atoms/utils/time-utils.ts` | `formatTimeSlot(slot)`, `hasConflict(slotA, slotB)`, `groupByDay(slots)` | C |
| `client/src/I4_atoms/utils/storage.ts` | `getToken()`, `setToken(t)`, `removeToken()`, `getUser()` | C |
| `client/src/I4_atoms/hooks/useAuth.ts` | `AuthContext` + `useAuth()` hook — login/logout/register/currentUser | D |
| `client/src/I4_atoms/hooks/useCourses.ts` | `useCourses(filters?)` — 获取课程列表，支持搜索/筛选 | D |
| `client/src/I4_atoms/hooks/useSchedule.ts` | `useSchedule()` — 获取/添加/移除已选课程 | D |
| `client/src/I4_atoms/hooks/useReviews.ts` | `useReviews(courseId)` — 获取/提交评价 | D |
| `client/src/I4_atoms/ui/StarRating.tsx` | 星级评分组件（展示 + 输入模式），封装 Ant Design `Rate` | D |
| `client/src/I4_atoms/ui/TimeSlotBadge.tsx` | 时间段标签（如 "Mon 09:00-10:30 Room A"），封装 `Tag` | D |
| `client/src/I4_atoms/ui/ConflictAlert.tsx` | 冲突警告横幅，封装 `Alert` | D |
| `client/src/I4_atoms/ui/LoadingSpinner.tsx` | 加载状态组件，封装 `Spin` | D |

### Person E：种子数据 + 开发工具
- 完善 `database/seed.py`，确保数据真实可用（课程涵盖不同学院、不同时间段、部分课程有冲突）
- 编写 `database/reset.sh` 一键重置数据库脚本
- 开始编写 API 手动测试用的 HTTP 文件或 Postman collection

**交付物**：所有原子文件可独立 import，每个文件有 `__init__.py`（Python）或明确 export（TS），可被上层消费。

---

## 阶段 3：分子层 I3（第 8–14 小时）— 并行开发

> **核心规则**：分子只能 import I4 原子。分子之间**禁止相互 import/依赖**。

### Server I3_molecules（Person A + Person B）

| 文件 | 职责 | 调用的原子 | 负责人 |
|---|---|---|---|
| `server/src/I3_molecules/auth-service/auth_service.py` | `register(db, data)`, `login(db, data)`, `get_current_user(db, user_id)` | `models`, `schemas`, `password`, `jwt_helper` | A |
| `server/src/I3_molecules/course-service/course_service.py` | `list_courses(db, filters)`, `get_course(db, id)`, `search_courses(db, keyword)` | `models`, `schemas`, `course_validator` | A |
| `server/src/I3_molecules/review-service/review_service.py` | `create_review(db, user_id, data)`, `get_reviews(db, course_id)`, `get_avg_rating(db, course_id)`, `delete_review(db, review_id, user_id)` | `models`, `schemas`, `review_validator` | B |
| `server/src/I3_molecules/schedule-service/schedule_service.py` | `enroll(db, user_id, course_id)`, `drop(db, user_id, course_id)`, `get_schedule(db, user_id)`, `check_conflicts(db, user_id, course_id)` | `models`, `schemas`, `schedule_validator` | B |

### Client I3_molecules（Person C + Person D）

| 文件 | 职责 | 调用的原子 | 负责人 |
|---|---|---|---|
| `client/src/I3_molecules/auth-form/AuthForm.tsx` | 登录/注册切换表单，使用 Ant Design `Form`, `Input`, `Button`；调用 `useAuth` | `useAuth`, `User` types | C |
| `client/src/I3_molecules/search-filter/SearchFilter.tsx` | 关键词搜索 + 学院/学分/时间筛选栏，使用 `Input.Search`, `Select`, `Slider` | `Course` types | C |
| `client/src/I3_molecules/course-card/CourseCard.tsx` | 课程卡片：名称、教师、学分、平均评分、时间段预览、选课按钮 | `StarRating`, `TimeSlotBadge`, `Course` types | D |
| `client/src/I3_molecules/course-detail/CourseDetail.tsx` | 课程完整信息：描述、所有时间段、容量、选课操作、评价入口 | `StarRating`, `TimeSlotBadge`, `ConflictAlert`, types | D |
| `client/src/I3_molecules/review-panel/ReviewPanel.tsx` | 评价列表 + 提交新评价表单，使用 `List`, `Form`, `Rate` | `StarRating`, `useReviews`, `Review` types | C |
| `client/src/I3_molecules/schedule-grid/ScheduleGrid.tsx` | 周视图课表网格（Mon–Fri × 8:00–20:00），已选课程以色块显示 | `TimeSlotBadge`, `time-utils`, `Enrollment` types | D |

### Person E：集成测试 + API 文档
- 使用 FastAPI 内置 `/docs` 页面验证每个完成的 endpoint
- 编写 `server/src/I2_coordinators/api-docs/api_spec.py` 自定义 OpenAPI metadata
- 对已完成的 service 编写基本测试

**交付物**：所有业务逻辑和 UI 组件独立可用。Server 端可通过单元测试验证，Client 端组件可在临时页面中预览。

---

## 阶段 4：协调层 I2 + 入口层 I1（第 14–18 小时）— 全员集成

### Server I2_coordinators（Person A + Person B）

| 文件 | 角色 | 职责 |
|---|---|---|
| `server/src/I2_coordinators/commander/auth_router.py` | 指挥官 | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| `server/src/I2_coordinators/commander/course_router.py` | 指挥官 | `GET /api/courses`, `GET /api/courses/{id}`, `GET /api/courses/search` |
| `server/src/I2_coordinators/commander/review_router.py` | 指挥官 | `POST /api/courses/{id}/reviews`, `GET /api/courses/{id}/reviews`, `DELETE /api/reviews/{id}` |
| `server/src/I2_coordinators/commander/schedule_router.py` | 指挥官 | `GET /api/schedule`, `POST /api/schedule/enroll/{course_id}`, `DELETE /api/schedule/drop/{course_id}` |
| `server/src/I2_coordinators/data-officer/auth_middleware.py` | 数据员 | `get_current_user` FastAPI Depends — 解析 JWT → user_id |
| `server/src/I2_coordinators/data-officer/error_handler.py` | 数据员 | 全局异常处理器，统一错误响应格式 |
| `server/src/I2_coordinators/diplomat/cors_config.py` | 外交官 | CORS 中间件配置（允许 `localhost:5173`） |
| `server/src/I2_coordinators/api-docs/openapi_config.py` | API文档 | OpenAPI title/description/tags 自定义 |

### Server I1_entry（Person A）

| 文件 | 职责 |
|---|---|
| `server/src/I1_entry/app.py` | FastAPI 实例、挂载所有 router（prefix）、注册中间件（CORS/error）、`on_startup` 事件建表 |
| `server/src/I1_entry/__main__.py` | `uvicorn.run(app, host, port)` |

### Client I2_coordinators（Person C + Person D）

| 文件 | 角色 | 职责 |
|---|---|---|
| `client/src/I2_coordinators/commander/Router.tsx` | 指挥官 | React Router 配置：`/` → 课程列表, `/course/:id` → 详情, `/schedule` → 我的课表, `/auth` → 登录 |
| `client/src/I2_coordinators/commander/HomePage.tsx` | 指挥官 | 组装 `SearchFilter` + `CourseCard` 列表，使用 Ant Design `Layout`, `Row`, `Col` |
| `client/src/I2_coordinators/commander/CourseDetailPage.tsx` | 指挥官 | 组装 `CourseDetail` + `ReviewPanel`，获取路由参数 |
| `client/src/I2_coordinators/commander/SchedulePage.tsx` | 指挥官 | 组装 `ScheduleGrid`，展示已选课程统计 |
| `client/src/I2_coordinators/commander/AuthPage.tsx` | 指挥官 | 组装 `AuthForm`，登录成功后跳转 |
| `client/src/I2_coordinators/data-officer/AuthProvider.tsx` | 数据员 | `AuthContext.Provider` 包裹整个应用，管理全局认证状态 |
| `client/src/I2_coordinators/data-officer/ProtectedRoute.tsx` | 数据员 | 路由守卫，未登录时跳转到 `/auth` |
| `client/src/I2_coordinators/diplomat/api.ts` | 外交官 | API endpoints 常量定义 + 各接口调用函数（`loginApi`, `fetchCourses`, `submitReview` 等） |
| `client/src/I2_coordinators/diplomat/interceptors.ts` | 外交官 | 401 自动跳转登录、网络错误 toast 提示 |
| `client/src/I2_coordinators/api-docs/api-types.ts` | API文档 | 与后端 Pydantic 模型对应的 TS 接口（可复用 I4 types 或独立维护） |

### Client I1_entry（Person C）

| 文件 | 职责 |
|---|---|
| `client/src/I1_entry/main.tsx` | `ReactDOM.createRoot` + `<App />` |
| `client/src/I1_entry/App.tsx` | `<AuthProvider>` → `<Router>` → `<Layout>`（Ant Design 外壳） |

**交付物**：前后端完整联通。浏览器可访问所有页面，API 调用正常，登录 → 浏览课程 → 选课 → 评价完整闭环。

---

## 阶段 5：打磨 + 错误处理（第 18–22 小时）

### 5.1 UI 美化（Person C + D）
- Ant Design 主题定制（品牌色）
- 响应式布局适配（`Row gutter` + `Col xs/sm/md`）
- 空状态、加载状态、错误状态全覆盖
- 课表网格的颜色区分（不同课程用不同色块）

### 5.2 边界用例（Person A + B）
- 选课满员处理（`enrolled_count >= capacity`）
- 时间冲突阻止选课 + 友好提示
- 重复评价阻止
- 退课后 `enrolled_count` 递减
- 输入校验错误消息国际化

### 5.3 体验优化（Person E）
- 选课/退课操作的即时反馈（Ant Design `message.success`）
- 课程列表分页或虚拟滚动
- 搜索防抖（300ms debounce）

---

## 阶段 6：部署 + Demo 准备（第 22–24 小时）

### 6.1 部署
- 后端：打包 FastAPI 为单一服务，部署到 Railway / Render
- 前端：`npm run build` → 静态文件部署到 Vercel / Netlify
- 数据库：SQLite 随后端一起部署

### 6.2 Demo 准备
- 准备 2 个测试账号（在种子数据中）
- 准备演示脚本：注册 → 浏览 → 搜索 → 选课（展示冲突检测）→ 查看课表 → 提交评价 → 退课
- 录制 30 秒 GIF 作为备用

---

## 人员分配总览

| 角色 | 主要焦点 | 覆盖文件（按阶段） |
|---|---|---|
| **Person A** | Server 数据层 + Auth/Course | db, models, schemas, enums → auth-service, course-service → auth_router, course_router → app.py |
| **Person B** | Server 工具层 + Review/Schedule | password, jwt, response, validators → review-service, schedule-service → review_router, schedule_router |
| **Person C** | Client 类型/工具 + Auth/Review UI | types, utils, api-client → AuthForm, SearchFilter, ReviewPanel → pages, diplomat, entry |
| **Person D** | Client Hooks/UI + Course/Schedule UI | hooks, UI atoms → CourseCard, CourseDetail, ScheduleGrid → pages, providers |
| **Person E** | 数据/质量/部署 | 种子数据、测试、API 文档、集成验证、部署 |

---

## 验证清单

1. **原子层独立性验证**：每个 I4 文件可被单独 import 且不触发其他 I4 文件的导入（Python: `python -c "from I4_atoms.helpers.password import hash_password"`；TS: 无循环依赖）
2. **分子层独立性验证**：grep 确认 I3 文件中没有 `from I3_molecules` 的交叉 import
3. **API 冒烟测试**：通过 `curl` 或 FastAPI `/docs` 页面逐一测试所有 endpoint
4. **端到端流程**：注册 → 登录 → 搜索课程 → 查看详情 → 选课（含冲突检测）→ 查看课表 → 提交评价 → 退课
5. **文件行数检查**：`wc -l server/src/I4_atoms/**/*.py` 确认原子文件在 60–100 行范围内

---

## 关键决策说明

- **FastAPI 而非 Flask**：自动生成 OpenAPI 文档与 4 层架构的 api-docs 层天然契合；Pydantic 提供免费的请求体验证
- **SQLite 而非 PostgreSQL**：24 小时 hackathon 零配置优先；SQLAlchemy 抽象层保证未来可切换
- **Ant Design 而非 Tailwind**：开箱即用的 `Table`, `Form`, `Card`, `Rate`, `Tag` 组件大幅减少 junior 的 CSS 工作量
- **Context + useReducer 而非 Zustand**：零额外依赖，junior 更容易理解 React 内置状态管理模式
- **每个 service 一个文件（非类）**：纯函数风格，junior 更容易测试和理解，避免 OOP 复杂性
