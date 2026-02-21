# 后端工作进度

> 本文档是各阶段 Code Agent 的交接文档。每完成一个阶段后更新，供下一阶段 Agent 作为上下文参考。

---

## 当前状态总览

| 阶段 | 状态 | 说明 |
|---|---|---|
| **M0: Mock API + 地基** | ✅ 完成 | 全部 12 Mock 端点 + DB 种子数据 |
| **M1: 课程浏览（真实查询）** | ✅ 完成 | GET /api/courses 和 GET /api/courses/{id} 已替换为真实 DB 查询 |
| M2: 认证 + 选课（含冲突检测） | ⬜ 未开始 | |
| M3: 评价 + 推荐 | ⬜ 未开始 | |
| M4: 4 层架构重构 | ⬜ 未开始 | |
| M5: 测试 + 部署 | ⬜ 未开始 | |

---

## 已完成工作（M0）

### 1. 项目脚手架

- Python 3.14 虚拟环境: `backend/venv/`
- 依赖已安装并冻结: `backend/requirements.txt`
- 核心依赖: FastAPI, uvicorn, SQLAlchemy, pydantic, python-jose, bcrypt, python-multipart, httpx
- ⚠️ **不使用 passlib**（与 Python 3.14 不兼容），直接使用 `bcrypt` 库

### 2. 目录结构

```
backend/
├── server/
│   ├── src/
│   │   ├── I1_entry/
│   │   │   ├── __init__.py
│   │   │   ├── app.py              ← 当前全部 Mock 逻辑在此（383 行）
│   │   │   └── __main__.py         ← uvicorn 启动入口
│   │   ├── I2_coordinators/
│   │   │   ├── commander/          ← 只有 __init__.py（待实现路由拆分）
│   │   │   ├── data-officer/       ← 只有 __init__.py（待实现中间件）
│   │   │   ├── diplomat/           ← 只有 __init__.py（待实现 CORS）
│   │   │   └── api-docs/           ← 只有 __init__.py（待实现文档配置）
│   │   ├── I3_molecules/
│   │   │   ├── auth-service/       ← 只有 __init__.py
│   │   │   ├── course-service/     ← 已实现 course_service.py
│   │   │   ├── review-service/     ← 只有 __init__.py
│   │   │   └── schedule-service/   ← 只有 __init__.py
│   │   └── I4_atoms/
│   │       ├── db/                 ← 已实现 connection.py, models.py
│   │       ├── helpers/            ← 只有 __init__.py
│   │       ├── types/              ← 已实现 schemas.py（部分）
│   │       └── validators/         ← 只有 __init__.py
│   └── tests/                      ← 空
├── database/
│   ├── schema.sql                  ← 5 张表 DDL
│   ├── seed.py                     ← 从 JSON 种子数据（280 行）
│   ├── reset.sh                    ← 一键重置脚本
│   └── app.db                      ← SQLite 数据库文件（已种子）
├── requirements.txt
└── Backend_plan_CH.md              ← 完整开发计划
```

- **I2/I3/I4 子目录当前部分已实现**，其余等待后续阶段填充。
- 路由拆分、Service 层、原子层全部计划在 M1-M4 逐步填充。

### 3. Mock API（app.py）

全部 12 个端点已实现，返回硬编码 JSON。Mock 数据基于真实 LiU 6MICS 课程。

| 方法 | 路径 | 状态 | 认证 |
|---|---|---|---|
| `GET` | `/` | ✅ Mock | 否 |
| `GET` | `/api/courses` | ✅ **真实 DB** | 否 |
| `GET` | `/api/courses/{id}` | ✅ **真实 DB** | 否 |
| `POST` | `/api/auth/register` | ✅ Mock（返回固定用户） | 否 |
| `POST` | `/api/auth/login` | ✅ Mock（返回固定 token） | 否 |
| `GET` | `/api/auth/me` | ✅ Mock（检查 Header 存在） | 是 |
| `POST` | `/api/schedule/enroll/{course_id}` | ✅ Mock（course_id="TDDE" 触发 409 冲突） | 是 |
| `DELETE` | `/api/schedule/drop/{course_id}` | ✅ Mock | 是 |
| `GET` | `/api/schedule` | ✅ Mock（返回 2 门已选课） | 是 |
| `GET` | `/api/courses/{id}/reviews` | ✅ Mock | 否 |
| `POST` | `/api/courses/{id}/reviews` | ✅ Mock | 是 |
| `DELETE` | `/api/reviews/{id}` | ✅ Mock | 是 |
| `GET` | `/api/courses/{id}/recommend` | ✅ Mock | 否 |

**Mock 数据包含 7 门课**：TAMS11, TDDE80, TDDD38, TDDC17, TDDE01, TDTS06, TDDD37

**启动方式**：
```bash
cd backend
source venv/bin/activate
python -m server.src.I1_entry
# 或: uvicorn server.src.I1_entry.app:app --host 0.0.0.0 --port 8000 --reload
# Swagger UI: http://localhost:8000/docs
```

### 4. 数据库

**Schema**（5 张表）：
- `users` — id, username, email, password_hash, role, created_at
- `courses` — id, code, name, description, credits, instructor, department, capacity
- `time_slots` — id, course_id(FK), period(INT 1-8), slot(INT 1-4, CHECK), UNIQUE(course_id, period, slot)
- `reviews` — id, user_id(FK), course_id(FK), rating(1-5, CHECK), comment, created_at, UNIQUE(user_id, course_id)
- `enrollments` — id, user_id(FK), course_id(FK), finished_status(BOOL), enrolled_at, UNIQUE(user_id, course_id)

**种子数据统计**：
| 表 | 行数 | 说明 |
|---|---|---|
| users | 4 | testuser1, testuser2 (密码 password123) + student3, student4 |
| courses | 77 | 全部来自 `data/liu_6mics_courses.json`（LiU 6MICS 硕士项目真实课程） |
| time_slots | 106 | 从 JSON offerings 的 semester+period+time_module 映射而来 |
| enrollments | 22 | 随机生成 |
| reviews | 12 | 随机生成（rating 1-5, 中文评论） |

**时间段映射规则**：
- `period_id = (semester_number - 1) * 2 + period_num` → 值域 1-8
  - Semester 1 Period 1 → 1, Semester 1 Period 2 → 2
  - Semester 2 Period 1 → 3, ...
  - Semester 4 Period 2 → 8
- `slot = time_module` → 值域 1-4（非数字的 time_module 如 "-" 已跳过）

**冲突对数**：238 组自然冲突（同 period + 同 slot 的不同课程对），可用于测试冲突检测。

**重置命令**：
```bash
cd backend && bash database/reset.sh
# 或: cd backend && python database/seed.py
```

### 5. 数据来源

- 文件：`data/liu_6mics_courses.json`（项目根目录）
- 内容：LiU 6MICS 硕士项目课程，77 门课，183 个 offerings
- JSON 路径（seed.py 中）：`BASE_DIR.parent.parent / "data" / "liu_6mics_courses.json"`
- 字段映射：
  - `course_code` → courses.code
  - `course_name` → courses.name
  - `detail.examiner` → courses.instructor
  - `detail.department` → courses.department
  - `credits`（字符串，取第一个数字）→ courses.credits
  - `capacity` → 随机 30-150（JSON 中无此字段）
  - `description` → 随机中文描述（JSON 中无此字段）

---

## 已完成工作（M1 — 课程浏览：真实数据库查询）

> 对应 `Backend_plan_CH.md` 阶段 2 — Person A 部分（数据库连接 + ORM + 课程查询）

### 1. I4 原子层：数据库连接 + ORM 模型 + Pydantic Schemas

- **`I4_atoms/db/connection.py`**（41 行）✅
  - SQLAlchemy `create_engine` + `SessionLocal` + `get_db` FastAPI 依赖
  - SQLite 路径：通过相对路径定位 `backend/database/app.db`
  - `check_same_thread=False` 配置（SQLite + FastAPI 必需）
  - `Base`（DeclarativeBase）供 ORM 模型继承
  - 含 `if __name__ == "__main__"` 自测代码

- **`I4_atoms/db/models.py`**（97 行）✅
  - ORM 映射全部 5 张表：`User`, `Course`, `TimeSlot`, `Review`, `Enrollment`
  - 使用 SQLAlchemy 2.0 风格（`Mapped` + `mapped_column`）
  - 关系配置完整：
    - Course ↔ TimeSlot (1:N, cascade delete-orphan)
    - Course ↔ Enrollment (1:N)
    - Course ↔ Review (1:N)
    - User ↔ Enrollment (1:N)
    - User ↔ Review (1:N)
  - 约束：UniqueConstraint + CheckConstraint 与 schema.sql 保持一致
  - 含 `if __name__ == "__main__"` 自测代码

- **`I4_atoms/types/schemas.py`**（57 行）✅ — 目前仅课程相关部分
  - `TimeSlotResponse` — period + slot，`from_attributes=True`
  - `CourseResponse` — 含 time_slots, enrolled_count, avg_rating，带 `json_schema_extra` Swagger 示例
  - `CourseListResponse` — courses 数组 + total
  - ⚠️ **待后续阶段补充**：`UserRegister`/`UserLogin`/`UserResponse`/`ScheduleResponse`/`EnrollmentResponse`/`ReviewResponse` 等

### 2. I3 分子层：课程业务逻辑

- **`I3_molecules/course-service/course_service.py`**（87 行）✅
  - `_build_course_response(course, db)` — 内部辅助函数，构建含计算字段的 CourseResponse：
    - `enrolled_count`：`SELECT COUNT(*) FROM enrollments WHERE course_id = ?`（实时计算，无冗余字段）
    - `avg_rating`：`SELECT AVG(rating) FROM reviews WHERE course_id = ?`（四舍五入 2 位小数）
    - `time_slots`：从 ORM relationship 直接读取
  - `list_courses(db, keyword?, department?, credits?)` — 带筛选的课程列表查询
    - keyword 模糊匹配 name、description、code（ilike）
    - department 精确匹配
    - credits 精确匹配
    - 按 code 排序
  - `get_course(db, course_id)` — 课程详情，不存在时 raise `LookupError`
  - 含 `if __name__ == "__main__"` 自测代码

- **`I3_molecules/course-service/__init__.py`** ✅
  - 使用 `importlib` 动态加载（因目录含连字符 `course-service` 不能直接 import）
  - 重导出 `list_courses` 和 `get_course`

### 3. I1 入口层：app.py 更新

- **`I1_entry/app.py`** 已更新（版本 0.2.0）：
  - `GET /api/courses` — ✅ **真实 DB 查询**（替换 Mock）
  - `GET /api/courses/{id}` — ✅ **真实 DB 查询**（替换 Mock）
  - 使用 `Depends(get_db)` 注入数据库会话
  - 使用 `importlib` 动态导入 course-service（绕过连字符目录名限制）
  - `LookupError` → `HTTPException(404)`
  - 其余 10 个端点保持 Mock 不变
  - MOCK 数据仍保留在文件中（供 Mock 端点使用）

### 4. 当前端点状态

| 方法 | 路径 | 状态 | 认证 |
|---|---|---|---|
| `GET` | `/` | ✅ Mock | 否 |
| `GET` | `/api/courses` | ✅ **真实 DB** | 否 |
| `GET` | `/api/courses/{id}` | ✅ **真实 DB** | 否 |
| `POST` | `/api/auth/register` | ✅ Mock | 否 |
| `POST` | `/api/auth/login` | ✅ Mock | 否 |
| `GET` | `/api/auth/me` | ✅ Mock | 是 |
| `POST` | `/api/schedule/enroll/{course_id}` | ✅ Mock | 是 |
| `DELETE` | `/api/schedule/drop/{course_id}` | ✅ Mock | 是 |
| `GET` | `/api/schedule` | ✅ Mock | 是 |
| `GET` | `/api/courses/{id}/reviews` | ✅ Mock | 否 |
| `POST` | `/api/courses/{id}/reviews` | ✅ Mock | 是 |
| `DELETE` | `/api/reviews/{id}` | ✅ Mock | 是 |
| `GET` | `/api/courses/{id}/recommend` | ✅ Mock | 否 |

### 5. I4 原子层（Person B 部分）— 尚未完成

以下文件在 M1 计划中属于 Person B 职责，**当前仍为空**（仅 `__init__.py`），待 M2 实现：
- `I4_atoms/helpers/password.py` — `hash_password` + `verify_password`
- `I4_atoms/helpers/jwt_helper.py` — `create_token` + `decode_token`
- `I4_atoms/validators/schedule_validator.py` — `check_slot_conflict`
- `I4_atoms/validators/review_validator.py` — `validate_rating` + `validate_comment`

### M1 验证结果
- ✅ `GET /api/courses` 返回 77 门课程（来自数据库）
- ✅ `GET /api/courses?keyword=machine` 返回匹配课程
- ✅ `GET /api/courses/1` 返回课程详情，含 time_slots 数组、avg_rating、enrolled_count
- ✅ 其余 Mock 端点不受影响

---

## 下一步工作（M2: 认证 + 选课 — 含冲突检测）

> 对应 `Backend_plan_CH.md` 阶段 3（第 4-8 小时）— **生死线里程碑**

### 目标
完成核心闭环：注册 → 登录 → 浏览 → 选课（含同 period 内 slot 冲突检测）→ 查看课表 → 退课

### 具体任务

#### 1. I4 原子层：认证基础设施（Person B 遗留 + 补充 schemas）

- **`I4_atoms/helpers/password.py`**（~25 行）
  - `hash_password(plain)` → bcrypt hash
  - `verify_password(plain, hashed)` → bool
  - ⚠️ 使用 `import bcrypt` 直接调用，**不用 passlib**（Python 3.14 不兼容）

- **`I4_atoms/helpers/jwt_helper.py`**（~40 行）
  - `create_token(user_id, username)` → JWT string
  - `decode_token(token)` → payload dict
  - 使用 `python-jose`

- **`I4_atoms/validators/schedule_validator.py`**（~30 行）
  - `check_slot_conflict(existing_slots, new_slots) → list[conflict]`
  - 纯函数：同 period 内 slot 相同即冲突

- **`I4_atoms/types/schemas.py`** 追加：
  - `UserRegister` / `UserLogin` / `UserResponse`
  - `ScheduleResponse` / `EnrollmentResponse`

#### 2. I3 分子层：认证 + 选课业务逻辑

- **`I3_molecules/auth-service/auth_service.py`**
  - `register(db, data)` → 检查用户名唯一 → 哈希密码 → 插入 → 返回用户信息
  - `login(db, data)` → 查用户 → 验证密码 → 生成 JWT → 返回 token

- **`I3_molecules/schedule-service/schedule_service.py`**
  - `enroll(db, user_id, course_id)` → 课程存在检查 → 重复选课检查 → 容量检查(COUNT) → **slot 冲突检测** → INSERT
  - `drop(db, user_id, course_id)` → DELETE + 确认
  - `get_schedule(db, user_id)` → JOIN 查询课程信息 + period-slot 列表

#### 3. I2 中间件 + 替换 Mock

- `auth_middleware.py`（或直接在 app.py 中）— `get_current_user` 依赖（Bearer token → user_id）
- 替换 app.py 中全部 6 个认证 + 选课 Mock 端点为真实逻辑

### 验证标准（9 步交叉验证 — 必须全部通过）
1. 注册 `newuser` → 201
2. 登录 `newuser` → 拿到 JWT
3. Authorize 填入 JWT
4. 选课程（占某 period/slot）→ 成功 ✅
5. 再选同 period 内 slot 冲突课 → **409 + 冲突详情** ✅
6. 查看课表 → 含已选课程 ✅
7. 退课 → 成功 ✅
8. 查看课表 → 空 ✅
9. 再选之前冲突的课 → 成功（冲突已释放）✅

---

## 后续阶段提纲

### M3: 评价 + 推荐
- `review_service.py`（I3）— create/get/delete review
- 推荐 API — "选了这门课的人还选了什么"（一条 SQL）
- 全局错误处理（ValueError→400, LookupError→404, IntegrityError→409）
- **全部 12 个端点替换为真实逻辑**

### M4: 4 层架构重构
- 从 app.py 拆分路由到 I2 commander（auth_router, course_router, review_router, schedule_router）
- 抽取中间件到 I2 data-officer
- 抽取 CORS 到 I2 diplomat
- app.py 简化为纯入口（include_router + 注册中间件）
- 架构验证：I4 不 import 上层，I3 只 import I4，无交叉依赖

### M5: 测试 + 部署
- smoke_test.py（Demo 路径自动化测试）
- 边界用例测试
- Dockerfile + 部署

---

## 关键注意事项（给下一阶段 Agent）

1. **不使用 passlib** — Python 3.14 下 passlib 与 bcrypt 不兼容（`AttributeError: module 'bcrypt' has no attribute '__about__'`），使用 `import bcrypt; bcrypt.hashpw()` 直接调用
2. **虚拟环境** — 先 `cd backend && source venv/bin/activate` 再执行任何 Python 命令
3. **启动服务器** — `cd backend && uvicorn server.src.I1_entry.app:app --reload`（工作目录必须是 `backend/`）
4. **数据库路径** — `backend/database/app.db`（SQLite）
5. **JSON 数据路径** — 从 backend/ 出发是 `../data/liu_6mics_courses.json`
6. **Python 包路径**：目录含连字符（如 `course-service`）不能直接 import，已通过 `importlib` 动态加载解决（参见 `course-service/__init__.py` 和 `app.py` 中的导入方式）
7. **当前 app.py 是单文件** — 课程端点已接真实 DB，其余 10 个端点仍为 Mock，后续阶段逐步替换，M4 再拆分文件
8. **种子数据中有 238 组时间冲突对** — 可直接用于测试冲突检测功能
9. **测试用户密码** — testuser1/testuser2 密码均为 `password123`（bcrypt hash 存储）
10. **已实现的 I4 文件**：`connection.py`、`models.py`、`schemas.py`（仅课程相关 schema）— 其余 I4 文件（password/jwt/validators）仍为空
11. **已实现的 I3 文件**：`course_service.py` — 其余 I3 文件（auth/schedule/review）仍为空
12. **app.py 版本号** 已更新为 `0.2.0`，MOCK 数据仍保留在文件顶部供其余 Mock 端点使用
