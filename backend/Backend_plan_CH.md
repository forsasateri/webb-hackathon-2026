# 课程选择系统 — 24小时 Hackathon 后端开发计划

> **核心策略**：垂直切片（Vertical Slice）— 每 4 小时交付一个可演示的里程碑，而非 19 小时后才有第一个能跑的端点。先让系统跑起来，再按 4 层架构重构。

**技术栈**：FastAPI + SQLAlchemy + SQLite + Pydantic  
**认证方案**：JWT（用户名 + 密码，bcrypt hash）  
**Python 版本**：3.14（实际使用，注意 `passlib` 不兼容，直接用 `bcrypt` 库）  
**团队规模**：2 名 junior 开发者（Person A、Person B）  
**职责范围**：Backend API + Database（为前端团队提供完整 RESTful API）  
**架构**：原子化重构 + 4 层架构（I1 入口层 → I2 协调层 → I3 分子层 → I4 原子层）

---

## 目录结构

```
server/
  src/
    I1_entry/              # 入口层
      app.py               # FastAPI 实例，挂载路由/中间件
      __main__.py           # uvicorn 启动
    I2_coordinators/       # 协调层
      commander/           # 指挥官：路由定义
      data-officer/        # 数据员：中间件/异常处理
      diplomat/            # 外交官：CORS 等外部通信
      api-docs/            # API 文档配置
    I3_molecules/          # 分子层：业务逻辑
      auth-service/
      course-service/
      review-service/
      schedule-service/
    I4_atoms/              # 原子层：基础设施
      db/
      helpers/
      types/
      validators/
database/
  schema.sql               # 建表 DDL
  seed.py                  # 种子数据脚本
  reset.sh                 # 一键重置脚本
  app.db                   # SQLite 数据库文件
```

---

## 数据库设计

5 张核心表，位于 `database/` 目录下：

| 表名 | 关键字段 | 说明 |
|---|---|---|
| `users` | id, username, email, password_hash, role, created_at | 用户表 |
| `courses` | id, code, name, description, credits, instructor, department, capacity | 课程表 |
| `time_slots` | id, course_id(FK), period(INT), slot(ENUM 1-4) | 时间段表（一门课可占多个 period-slot 组合） |
| `reviews` | id, user_id(FK), course_id(FK), rating(1-5), comment, created_at | 评价表 |
| `enrollments` | id, user_id(FK), course_id(FK), finished_status(Bool, True represents completed), enrolled_at | 选课记录表 | score (0-100, optional, only for completed courses) |

约束：`enrollments` 表 `(user_id, course_id)` 唯一索引；`reviews` 表 `(user_id, course_id)` 唯一索引，防止重复评价；`time_slots` 表 `(course_id, period, slot)` 唯一索引。

> **关键设计决策 1**：**`time_slot` 是枚举（1/2/3/4），不是自由时间段**。
> - `slot` = 第几节课（1=第一节, 2=第二节, 3=第三节, 4=第四节），每个 slot 对应固定时间窗口
> - `period` = 时间段分组（如：1=周一上午, 2=周一下午, 3=周二上午...），代表一个具体的教学时段
> - **冲突检测极度简化**：同一 `period` 内，用户已选课程的 `slot` 不能与目标课程的 `slot` 重复
> - 不需要计算时间重叠，只需要 `WHERE period = ? AND slot = ?` 精确匹配
>
> **关键设计决策 2**：**删除 `enrolled_count` 冗余字段**。选课人数通过 `SELECT COUNT(*) FROM enrollments WHERE course_id = ?` 实时计算。原因：
> - 消除 `enrolled_count++/--` 的并发竞态条件（SQLite 并发写入尤其脆弱）
> - 数据永远一致，不会出现 count 和实际记录不匹配的 bug
> - hackathon Demo 时不会因并发操作暴露计数错误

---

## API 端点总览（供前端对接）

| 方法 | 路径 | 说明 | 认证 | 优先级 | 实际状态 |
|---|---|---|---|---|---|
| `GET` | `/api/courses` | 课程列表（支持 `?keyword=&department=&credits=&period=&slot=` 筛选） | 否 | P0 | ✅ 真实 DB |
| `GET` | `/api/courses/{id}` | 课程详情（含 period-slot 时间段、平均评分、选课人数） | 否 | P0 | ✅ 真实 DB |
| `POST` | `/api/auth/register` | 用户注册 | 否 | P0 | ✅ 真实 DB |
| `POST` | `/api/auth/login` | 用户登录，返回 JWT | 否 | P0 | ⚠️ 真实 DB（testuser/testuser1 仍走 MOCK_TOKEN 快捷路径）|
| `GET` | `/api/auth/me` | 获取当前用户信息 | 是 | P0 | ✅ 真实 DB |
| `POST` | `/api/schedule/enroll/{course_id}` | 选课（含同 period 内 slot 冲突检测 + 容量检查） | 是 | P0 | ✅ 真实 DB |
| `DELETE` | `/api/schedule/drop/{course_id}` | 退课 | 是 | P0 | ✅ 真实 DB |
| `GET` | `/api/schedule` | 获取当前用户已选课程 + 时间表 | 是 | P0 | ✅ 真实 DB |
| `GET` | `/api/courses/{id}/reviews` | 获取课程评价列表 | 否 | P1 | 🔶 Mock |
| `POST` | `/api/courses/{id}/reviews` | 提交课程评价 | 是 | P1 | 🔶 Mock |
| `DELETE` | `/api/reviews/{id}` | 删除自己的评价 | 是 | P2 | 🔶 Mock |
| `GET` | `/api/courses/{id}/recommend` | **杀手锏**：选了这门课的人还选了什么 | 否 | P1 | 🔶 Mock |

> **当前进度（M2.6 完成后）**：9/13 端点（含健康检查共 13 个路由）使用真实 DB，4 个 Mock（reviews × 3 + recommend × 1）。另有 `GET /` 健康检查端点。

> **P0** = 必须在第 8 小时前完成（核心演示流程）  
> **P1** = 第 14 小时前完成（完整功能）  
> **P2** = 锦上添花  

---

## 里程碑总览（黑客马拉松铁律：每 4 小时一个可演示版本）

| 时间 | 里程碑 | 可演示内容 |
|---|---|---|
| **第 1 小时** | M0: Mock API 就绪 | 前端拿到 API 契约 + 硬编码 JSON，立即开始开发 |
| **第 4 小时** | M1: 课程浏览可用 | 在 Swagger UI 中真实查询课程列表和详情 |
| **第 8 小时** | M2: 核心闭环可用 | 注册→登录→浏览→选课(含冲突检测)→查看课表→退课 |
| **第 14 小时** | M3: 完整功能可用 | 全部 12 个 API 端点可用，含评价和推荐 |
| **第 18 小时** | M4: 架构重构完成 | 代码从 "能跑" 重构为 4 层架构，通过架构验证 |
| **第 22 小时** | M5: 上线 + 文档 | 公网可访问，Swagger 文档完善，前端可对接 |

---

## 阶段 1：地基 + Mock API（第 0–1 小时）— 双人 Pair

> **目标**：1 小时内让前端团队拿到可对接的 API 契约，解放前端零等待。

### 双人协作（Pair Programming）

**前 30 分钟 — 项目搭建**：
- Person A 操作，Person B 盯屏 review：
  ```bash
  cd server && python -m venv venv && source venv/bin/activate
  pip install fastapi uvicorn[standard] sqlalchemy pydantic python-jose[cryptography] bcrypt python-multipart
  pip freeze > requirements.txt
  ```
- 创建所有目录 + `__init__.py`（一行脚本批量创建）
- 最小 `app.py`：FastAPI 实例 + CORS + 健康检查 `GET /`

**后 30 分钟 — Mock API + 数据库**：
- Person A：在 `app.py` 中写 **硬编码 Mock 端点**（返回静态 JSON），覆盖全部 11 个端点
  - 目的：前端团队第 1 小时就能拿到完整 API 契约（URL、请求/响应格式）
  - Mock 数据直接写在路由函数里，后续逐个替换成真实逻辑
  - **定义固定 MOCK_TOKEN**（如：`"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend"`），方便前端测试人员直接使用，无需每次登录
- Person B：编写 `database/schema.sql` + `database/seed.py`
  - 15–20 门课程（涵盖不同学院、不同学分）
  - 每门课 1-3 个 `(period, slot)` 组合（如：课程 A 占 period=1/slot=1 + period=2/slot=3）
  - **有意制造 2-3 组 slot 冲突**（如：课程 3 和课程 7 都占 period=1/slot=2，选了其中一门另一门就不能选）
  - 2 个测试用户 `testuser1` / `testuser2`，密码 `password123`
  - 编写 `database/reset.sh` 一键重置

**交付物（M0）**：
- ✅ `uvicorn` 启动，所有 11 个端点返回 Mock JSON
- ✅ 前端团队拿到 `http://localhost:8000/docs` 看到完整 API 契约
- ✅ `bash database/reset.sh` 生成含种子数据的 `app.db`
- ✅ 前端从此刻起不再被后端阻塞

---

## 阶段 2：第一个垂直切片 — 课程浏览（第 1–4 小时）

> **目标**：把 Mock 替换成真实数据库查询。先做最简单、前端最先需要的部分。

### Person A：数据库连接 + ORM + 课程查询（I4 → I3 → I2 一步到位）

1. **I4 原子**：`connection.py`（~40 行）+ `models.py`（~80 行）+ `schemas.py` 中的 `CourseResponse`/`TimeSlotResponse`（含 period + slot 字段）部分（~40 行）
2. **I3 分子**：`course_service.py` — `list_courses(db, keyword?, department?, credits?, period?, slot?)` + `get_course(db, id)`
   - **实际实现**：6 个筛选参数（keyword 模糊匹配 name/description/code，department 精确匹配，credits 精确匹配，period/slot 通过 `Course.time_slots.any()` 关联过滤）
3. **I2 替换 Mock**：把 `app.py` 中 `GET /api/courses` 和 `GET /api/courses/{id}` 的 Mock 替换成真实查询
   - **实际实现**：✅ 已完成。`app.py` 中两个课程端点均调用真实 `course_service` 函数，通过 `importlib` 动态导入（因目录名含连字符）

> **关键**：先在 `app.py` 里直接写路由，不要急着拆分到 `course_router.py`。能跑 > 架构好看。

### Person B：认证基础设施（I4 原子层全部完成）

1. `password.py`（~25 行）：`hash_password` + `verify_password`
2. `jwt_helper.py`（~40 行）：`create_token` + `decode_token`
3. `schedule_validator.py`（~30 行）：`check_slot_conflict(existing_slots, new_slots) → list[conflict]`（同 period 内 slot 重复检测，纯函数）
4. `review_validator.py`（~25 行）：`validate_rating` + `validate_comment`
5. 为每个原子写 3-5 行的 `if __name__ == "__main__"` 自测代码

### 阶段 2 交叉验证（15 分钟）
- Person A 在 Swagger UI 中演示：真实课程数据从数据库返回
- Person B 在终端演示：`python -c "from ...password import hash_password; print(hash_password('test'))"` 每个原子独立工作

**交付物（M1）**：
- ✅ `GET /api/courses` 返回真实课程列表（含 period-slot 时间段、选课人数=COUNT查询）
  - **实际**：支持 6 个筛选参数 `keyword/department/credits/period/slot`，超出原计划的 3 个
- ✅ `GET /api/courses/{id}` 返回真实课程详情（含平均评分=AVG查询、完整 period-slot 列表）
- ✅ 所有 I4 原子文件独立可 import
- ✅ 其余端点保持 Mock（不会影响前端开发）
- **实际补充**：种子数据为 77 门照搬 LiU 6MICS 真实课程（原计划 15-20 门），通过 `importlib` 动态导入解决目录连字符问题

---

## 阶段 3：第二个垂直切片 — 认证 + 选课（第 4–8 小时）

> **目标**：完成核心闭环。这是 hackathon 的**生死线** — 第 8 小时必须能完整演示"注册→登录→选课→冲突检测→查看课表"。

### Person A：认证流程（端到端）

1. **I4 补完**：`schemas.py` 中追加 `UserRegister`/`UserLogin`/`UserResponse`
2. **I3 分子**：`auth_service.py`
   - `register(db, data)` → 检查用户名唯一 → 哈希密码 → 插入 → 返回用户信息
   - `login(db, data)` → 查用户 → 验证密码 → 生成 JWT → 返回 token
   - **测试便利性**：当用户名为 `testuser` 或 `testuser1` 时，直接返回 MOCK_TOKEN
3. **I2 替换 Mock**：替换 `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`
   - **实际实现**：✅ 已完成。三个端点均调用真实 `auth_service` 函数
   - ⚠️ `login` 端点仍保留对 `testuser`/`testuser1` 用户名的 MOCK_TOKEN 快捷返回（不走真实密码验证），其他用户走真实 DB 验证
4. **I2 认证依赖**：`get_current_user(credentials: HTTPAuthorizationCredentials)` 函数（作为 `Depends` 使用）
   - **实际实现**：✅ 已完成。使用 `HTTPBearer()` 安全方案（FastAPI 内置），自动解析 `Bearer <token>` 格式
   - **关键设计**：识别 MOCK_TOKEN 自动返回固定测试用户（`MOCK_USER`）
   - 返回类型为 `UserResponse`（Pydantic model），不是 `dict`
   - 后续所有需要认证的端点从手动验证 Header 改为 `user: UserResponse = Depends(get_current_user)`
   - **优势**：前端测试人员可使用固定 token，无需每次调用 login 接口

**每完成一个端点立刻在 Swagger UI 测试**，不要等全部写完再测。

### Person B：选课流程（端到端，含杀手锏：冲突检测）

1. **I4 补完**：`schemas.py` 中追加 `ScheduleResponse`/`EnrollmentResponse`
2. **I3 分子**：`schedule_service.py`
   - `enroll(db, user_id, course_id)` → **核心逻辑**：
     ```python
     # 1. 检查课程是否存在
     # 2. 检查是否已选过（UNIQUE 约束 catch）
     # 3. 检查容量：SELECT COUNT(*) FROM enrollments WHERE course_id = ?
     # 4. 检查 slot 冲突：
     #    a. 获取目标课程的所有 (period, slot) 组合
     #    b. 获取用户已选课程的所有 (period, slot) 组合
     #    c. 取交集 → 如果非空则冲突
     #    → 使用 check_slot_conflict 纯函数：同 period 内 slot 相同即冲突
     #    → SQL 一句搞定：SELECT ts.* FROM time_slots ts
     #        JOIN enrollments e ON ts.course_id = e.course_id
     #        WHERE e.user_id = ? AND (ts.period, ts.slot) IN
     #          (SELECT period, slot FROM time_slots WHERE course_id = ?)
     # 5. 全部通过 → INSERT enrollment → 返回成功
     # 6. 任何一步失败 → 返回具体原因（哪个 period-slot 和哪门课冲突）
     ```
   - `drop(db, user_id, course_id)` → DELETE + 确认
   - `get_schedule(db, user_id)` → JOIN 查询课程信息 + period-slot 列表
3. **I2 替换 Mock**：替换 `POST /api/schedule/enroll/{course_id}`、`DELETE /api/schedule/drop/{course_id}`、`GET /api/schedule`
   - **实际实现**：✅ 已完成（M2.6 hotfix 中从 Mock 替换为真实 DB 调用）
   - `enroll_course()` → 调用 `schedule_enroll(db, user.id, course_id)`，`LookupError` → 404，`ValueError` → 409（含冲突详情）
   - `drop_course()` → 调用 `schedule_drop(db, user.id, course_id)`，`LookupError` → 404
   - `get_schedule()` → 调用 `schedule_get(db, user.id)`，返回 `ScheduleResponse`

### 阶段 3 交叉验证（20 分钟，关键！）
用真实流程走一遍，在 Swagger UI 中手动操作：
1. 注册 `newuser` → 201
2. 登录 `newuser` → 拿到 JWT
3. Authorize 填入 JWT
4. 选课程 1（占 period=1/slot=2）→ 成功 ✅
5. 再选课程 3（也占 period=1/slot=2，同 period 内 slot 冲突）→ **409 + 冲突详情（period=1, slot=2 被课程 1 占用）** ✅
6. 查看课表 → 只有课程 1 ✅
7. 退课程 1 → 成功 ✅
8. 查看课表 → 空 ✅
9. 再选课程 3 → 成功（period=1/slot=2 已释放，不再冲突）✅

> ⚠️ **如果交叉验证发现 bug，立刻修，不要往下走。这是核心 Demo 路径。**

**交付物（M2 — 最关键的里程碑）**：
- ✅ 完整核心闭环：注册→登录→浏览→选课(含同 period 内 slot 冲突检测)→课表→退课
- ✅ 冲突检测返回具体冲突信息（哪个 period-slot 被哪门课占用）
- ✅ 9 个端点真实可用（含健康检查），4 个 Mock（reviews × 3 + recommend × 1）
- ✅ **40 项集成测试全部通过**（`test_all_endpoints.py`）
- ✅ **即使后续全部崩溃，这个版本也能参加 Demo**
- **实际补充**：
  - 认证方案用 `bcrypt` 直接调用（未用 `passlib`，Python 3.14 不兼容）
  - `login` 端点对 testuser/testuser1 仍直接返回 MOCK_TOKEN（前端测试便利）
  - schedule 三个端点在 M2.6 hotfix 中才从 Mock 改为真实 DB（原 M2 阶段只写了 service 层，未替换 app.py 中的 Mock）

---

## 阶段 4：第三个垂直切片 — 评价 + 杀手锏（第 8–14 小时）

> **目标**：补全剩余功能 + 增加竞争力亮点。

### Person A：评价系统

1. **I3 分子**：`review_service.py`
   - `create_review(db, user_id, course_id, data)` → 验证评分(1-5) + 检查重复 → 插入
   - `get_reviews(db, course_id)` → 按时间倒序，关联用户名
   - `delete_review(db, review_id, user_id)` → 只能删自己的（权限检查）
2. **I2 替换 Mock**：替换 `GET/POST /api/courses/{id}/reviews` + `DELETE /api/reviews/{id}`
3. **边界用例**（写一个就测一个）：
   - 重复评价 → 409
   - 删除他人评价 → 403
   - 评分超出 1-5 → 422（Pydantic 自动验证）

### Person B：杀手锏功能 — 课程推荐 + 全局错误处理

1. **杀手锏 API**：`GET /api/courses/{id}/recommend`
   ```python
   # "选了这门课的人还选了什么"
   # SQL: SELECT c.* FROM courses c
   #      JOIN enrollments e1 ON c.id = e1.course_id
   #      JOIN enrollments e2 ON e1.user_id = e2.user_id
   #      WHERE e2.course_id = :target_id AND c.id != :target_id
   #      GROUP BY c.id ORDER BY COUNT(*) DESC LIMIT 5
   ```
   - 这个功能只需要一条 SQL，10 分钟写完，但 Demo 效果极好
   - 评委会觉得 "这个团队做了推荐系统"

2. **全局错误处理**：`error_handler.py`
   - `ValueError` → 400、`PermissionError` → 403、`LookupError` → 404
   - `IntegrityError`（UNIQUE 约束违反）→ 409 + 友好消息
   - 通用 `Exception` → 500 + 不泄露内部错误

3. **补完 `course_service.py`** 中的筛选功能：`?keyword=` + `?department=` + `?credits=`

### 阶段 4 交叉验证
- Person A 在 Swagger UI 中演示：提交评价 → 查看评价列表 → 课程详情中看到平均评分更新
- Person B 在 Swagger UI 中演示：选了线性代数 → 点推荐 → 看到同选的人还选了什么

**交付物（M3）**：
- ✅ 全部 12 个 API 端点真实可用（含推荐功能）
- ✅ 所有 Mock 已替换成真实逻辑
- ✅ 全局错误处理统一格式
- ✅ 功能冻结 — 从此刻起不再增加新功能

---

## 阶段 5：架构重构 — 整理成 4 层（第 14–18 小时）

> **目标**：把 "能跑的代码" 重构成 "符合 4 层架构的代码"。**逻辑不变，只移动文件 + 调整 import**。这是先纵向切片再横向重构的核心：先保证能跑，再保证好看。

### Person A：拆分路由层（I2 指挥官）+ 入口层（I1）

1. 从 `app.py` 中抽取路由到 4 个 commander 文件：
   - `auth_router.py` — `APIRouter(prefix="/api/auth", tags=["认证"])`
   - `course_router.py` — `APIRouter(prefix="/api/courses", tags=["课程"])`
   - Review 和 Schedule 路由由 Person B 负责
2. 抽取 `auth_middleware.py` → `I2_coordinators/data-officer/`
3. 抽取错误处理 → `I2_coordinators/data-officer/error_handler.py`
4. 重构 `app.py` 为纯入口：只做 `include_router` + 注册中间件
5. 创建 `__main__.py`

### Person B：拆分路由层 + 外交官/文档

1. 抽取路由：
   - `review_router.py` — `APIRouter(prefix="/api", tags=["评价"])`
   - `schedule_router.py` — `APIRouter(prefix="/api/schedule", tags=["选课"])`
2. 抽取 CORS 配置 → `I2_coordinators/diplomat/cors_config.py`
3. 创建 `I2_coordinators/api-docs/openapi_config.py`（自定义 Swagger 元数据）
4. 确保所有 `__init__.py` 正确重导出

### 架构验证（必须全部通过才算完成）
```bash
# 1. 原子层独立性
python -c "from server.src.I4_atoms.helpers.password import hash_password; print('ok')"
python -c "from server.src.I4_atoms.validators.schedule_validator import check_slot_conflict; print('ok')"

# 2. 分子层无交叉依赖
grep -r "from.*I3_molecules" server/src/I3_molecules/ | grep -v "__init__"
# 应该无输出

# 3. 原子层无交叉依赖
grep -r "from.*I4_atoms" server/src/I4_atoms/ | grep -v "__init__"
# 应该无输出

# 4. 依赖方向检查
grep -r "from.*I1_entry\|from.*I2_coordinators\|from.*I3_molecules" server/src/I4_atoms/
# 必须无输出：I4 不能 import 上层

grep -r "from.*I1_entry\|from.*I2_coordinators" server/src/I3_molecules/
# 必须无输出：I3 只能 import I4

# 5. 文件行数
wc -l server/src/I4_atoms/**/*.py
# 每个原子文件 25–80 行

# 6. 全部端点仍然正常（重构后的冒烟测试）
python -m pytest server/tests/ -v  # 或手动 Swagger 测试
```

**交付物（M4）**：
- ✅ 代码完全符合 4 层架构（I1 → I2 → I3 → I4）
- ✅ 架构验证 6 项全部通过
- ✅ **全部端点功能不变**（重构不改逻辑）

---

## 阶段 6：测试 + 加固（第 18–20 小时）

> **目标**：确保 Demo 路径零 bug。只测 Demo 会走到的路径，不追求覆盖率。

### Person A：核心 Demo 路径自动化测试
- 编写 `server/tests/smoke_test.py`（用 `httpx` + FastAPI `TestClient`）
  ```python
  # 以下场景必须全部通过：
  def test_demo_happy_path():
      # 1. 注册 → 201
      # 2. 登录 → 200 + token
      # 3. 获取课程列表 → 200 + 非空数组
      # 4. 获取课程详情 → 200 + 含 period-slot 和评分
      # 5. 选课 → 200
      # 6. 查看课表 → 200 + 含刚选的课
      # 7. 提交评价 → 201
      # 8. 查看推荐 → 200
      # 9. 退课 → 200
      # 10. 查看课表 → 200 + 空

  def test_slot_conflict_detection():
      # 选课程A（占 period=1/slot=2）→ 成功
      # 选课程B（也占 period=1/slot=2）→ 409 + 冲突详情（period=1, slot=2）
  ```

### Person B：边界用例 + Pydantic 响应示例
- 测试边界：
  - 未登录访问受保护端点 → 401
  - 课程满员（在种子中设一门 capacity=1 的课）→ 409
  - 不存在的课程/用户 → 404
  - 重复评价 → 409
  - 删除他人评价 → 403
- 给每个 Pydantic Schema 加 `model_config` 中的 `json_schema_extra`（Swagger 中显示请求/响应示例）

**交付物（M5 前置）**：
- ✅ `python -m pytest server/tests/ -v` 全部通过
- ✅ Swagger UI 中每个端点有清晰的请求/响应示例

---

## 阶段 7：部署 + 文档 + Demo 准备（第 20–24 小时）

### Person A：部署上线（第 20-22 小时）
- 创建 `server/Dockerfile`：
  ```dockerfile
  FROM python:3.11-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  RUN python database/seed.py  # 构建时初始化数据
  CMD ["uvicorn", "server.src.I1_entry.app:app", "--host", "0.0.0.0", "--port", "8000"]
  ```
- 部署到 Railway / Render，确认公网可访问
- 环境变量：`JWT_SECRET`（必须改默认值）、`CORS_ORIGINS`（加前端域名）
- 部署后跑一遍 Demo 路径确认无误

### Person B：API 对接文档（第 20-22 小时）
- 编写 `server/API_README.md`：
  ```markdown
  ## 快速对接指南
  - Base URL: https://xxx.railway.app
  - 认证：`Authorization: Bearer <token>`（从 /api/auth/login 获取）
  - **测试账号**：testuser1 / password123（任意密码，登录后自动返回固定 MOCK_TOKEN）
  - **快速测试 Token**：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend`（可直接使用，无需登录）
  - 完整文档：https://xxx.railway.app/docs
  
  ## 主要端点及示例
  [每个端点的 curl 示例 + 响应 JSON]
  
  ## 错误码
  - 400: 请求参数错误
  - 401: 未登录/token过期
  - 403: 无权限
  - 404: 资源不存在
  - 409: 冲突（已选课/已评价/满员/同 period 内 slot 冲突）
  - 422: 请求体格式错误
  ```

### 双人协作：Demo 彩排（第 22-24 小时）
- 用真实部署的 URL 走完整 Demo 路径 3 次
- 准备 Demo 话术（30 秒电梯演讲）：
  > "我们做了一个课程选择系统的后端 API。亮点是**智能 slot 冲突检测**——系统会自动识别同一 period 内 time_slot 冲突并阻止选课，还有**课程推荐**——'选了这门课的人还选了什么'。全部 12 个 API 端点在 Swagger 文档中可交互测试。"
- 截图/录屏 Swagger UI 中的关键操作作为 backup

**交付物（M5 — 最终）**：
- ✅ API 公网可访问
- ✅ Swagger 文档完善（含示例和错误码）
- ✅ 前端对接文档就绪
- ✅ Demo 路径走通 3 次零 bug

---

## 人员分配总览

| 角色 | 主线 | 阶段 1 (0-1h) | 阶段 2 (1-4h) | 阶段 3 (4-8h) | 阶段 4 (8-14h) | 阶段 5 (14-18h) | 阶段 6 (18-20h) | 阶段 7 (20-24h) |
|---|---|---|---|---|---|---|---|---|
| **Person A** | 数据层 + Auth/Course | 项目初始化 + Mock API | connection + models + 课程查询端到端 | 认证流程端到端 | 评价系统 | 拆分路由(auth/course) + 入口层 | Demo 路径自动化测试 | 部署 + Demo |
| **Person B** | 工具层 + Schedule/Review | DB schema + seed | 全部 I4 原子(password/jwt/validators) | 选课流程端到端(含冲突检测) | 推荐功能 + 错误处理 + 筛选 | 拆分路由(review/schedule) + CORS + 文档配置 | 边界测试 + Swagger 示例 | API 文档 + Demo |

### 文件统计

| 层级 | 文件数 | 负责人 |
|---|---|---|
| I4 原子层 | 8 个 | A: 3 个(connection, models, schemas), B: 5 个(password, jwt, 3 validators) |
| I3 分子层 | 4 个 | A: 2 个(auth, course), B: 2 个(review, schedule) |
| I2 协调层 | 8 个 | A: 4 个(auth_router, course_router, auth_middleware, error_handler), B: 4 个(review_router, schedule_router, cors, openapi) |
| I1 入口层 | 2 个 | A: 2 个(app.py, __main__.py) |
| Database | 3 个 | B: 3 个(schema.sql, seed.py, reset.sh) |
| Tests | 1 个 | A+B 共写 |
| **总计** | **26 个文件** | A: 11 个, B: 14 个, 共写: 1 个 |

---

## 验证清单

1. **里程碑验证**（最重要 — 每个时间点必须检查）：
   - [x] M0：Mock API 全部可访问 + 前端拿到契约 ✅
   - [x] M1：课程查询返回真实数据（77 门 LiU 课程） ✅
   - [x] M2：核心闭环测试全通过（9 个 Real DB 端点 + 40 项集成测试） ✅
   - [ ] M3：全部 12 个端点真实可用（待完成：reviews × 3 + recommend × 1）
   - [ ] M4：架构验证 6 项全通过
   - [ ] M5：公网可访问 + Demo 路径零 bug

2. **架构验证**（阶段 5 完成后）：
   ```bash
   # I4 不 import 上层
   grep -r "from.*I1_entry\|from.*I2_coordinators\|from.*I3_molecules" server/src/I4_atoms/
   # I3 只 import I4
   grep -r "from.*I1_entry\|from.*I2_coordinators" server/src/I3_molecules/
   # I3 无交叉依赖
   grep -r "from.*I3_molecules" server/src/I3_molecules/ | grep -v "__init__"
   # I4 无交叉依赖
   grep -r "from.*I4_atoms" server/src/I4_atoms/ | grep -v "__init__"
   ```

3. **Demo 路径验证**（至少走 3 次）：
   - 注册 → 登录 → Authorize → 课程列表 → 课程详情 → 选课 → 选同 period 内 slot 冲突课(被拒) → 课表 → 提交评价 → 查看推荐 → 退课

---

## 关键决策说明

| 决策 | 原因 |
|---|---|
| **垂直切片优先于水平分层** | hackathon 中每 4 小时必须有可演示版本；自下而上建层 = 19 小时零产出 |
| **Mock API 第 1 小时交付** | 解放前端团队零等待；API 契约是前后端协作的第一要务 |
| **先跑后重构（先 app.py 单文件 → 后拆分 4 层）** | Junior 开发者在单文件中调试更快；重构只改 import 不改逻辑，风险低 |
| **`time_slot` 枚举化（1-4）+ period 分组** | 冲突检测从 "时间段重叠计算" 简化为 "同 period 内 slot 精确匹配"；SQL 一句搞定，Junior 秒懂 |
| **删除 `enrolled_count` 冗余字段** | 用 `COUNT(*)` 实时查询消除并发竞态；Demo 时不会暴露计数 bug |
| **增加课程推荐 API** | 一条 SQL 实现、10 分钟写完，但给评委 "推荐系统" 的印象；性价比极高的杀手锏 |
| **FastAPI 而非 Flask** | 自动 OpenAPI 文档 = 免费的 Mock API + 前端契约 + Demo 工具 |
| **SQLite 而非 PostgreSQL** | 24h hackathon 零配置优先；SQLAlchemy 保证可切换 |
| **纯函数 service 而非 class** | `db: Session` 作为首参，Junior 更容易理解和测试 |
| **P0/P1/P2 优先级标记** | 如果进度落后，第 8 小时的 M2 就是最低可演示版本，可以跳过 P1/P2 |
| **`passlib` → `bcrypt` 直接调用** | Python 3.14 下 `passlib` 不兼容（`crypt` 模块已移除），直接用 `bcrypt.hashpw()`/`bcrypt.checkpw()` 替代 |
| **`importlib` 动态导入** | 目录名含连字符（`course-service` 等）无法直接 `import`，在 `app.py` 顶部用 `importlib.util` 动态加载三个 service 包 |
| **`get_current_user` 用 `HTTPBearer`** | 原计划用 `Header` 手动解析，实际用 FastAPI 内置 `HTTPBearer()` + `HTTPAuthorizationCredentials`，Swagger UI 自动生成 Authorize 按钮 |
| **返回 `UserResponse` 而非 `dict`** | `get_current_user` 依赖返回 Pydantic model → 类型安全，下游端点可用 `user.id`、`user.username` 等属性访问 |
| **MOCK_TOKEN 自动关联测试账户** | 前端测试人员可使用固定 token (`testuser`/`testuser1` 登录获取)，`get_current_user` 依赖自动识别并返回测试用户；避免每次测试都需重新登录，提升前端对接效率 |

---

## 实际实现差异总结（截至 M2.6）

> 本节记录计划与实际实现之间的关键差异，供后续开发参考。

| 计划内容 | 实际实现 | 原因/说明 |
|---|---|---|
| `pip install passlib[bcrypt]` | `pip install bcrypt` | Python 3.14 移除了 `crypt` 模块，`passlib` 不兼容。直接用 `bcrypt.hashpw()`/`bcrypt.checkpw()` |
| `list_courses(db, keyword?, department?, slot?)` 3 参数 | `list_courses(db, keyword?, department?, credits?, period?, slot?)` 6 参数 | 增加了 `credits`/`period`/`slot` 筛选，`period`/`slot` 通过 `Course.time_slots.any()` 关联过滤 |
| `get_current_user(authorization: Header)` 手动解析 | `get_current_user(credentials: HTTPAuthorizationCredentials)` + `HTTPBearer()` | 使用 FastAPI 内置安全方案，Swagger UI 自动生成 Authorize 按钮 |
| `get_current_user` 返回 `dict` | 返回 `UserResponse`（Pydantic model） | 类型安全，下游端点可用 `user.id` 属性访问 |
| 种子数据 15-20 门课程 | 77 门真实 LiU 6MICS 课程 | 从真实 LiU 课程数据脚本爬取，更贴近生产环境 |
| M2 阶段 schedule 端点已替换为真实 DB | M2 完成时 schedule 三个端点仍为 Mock | service 层已写好但 app.py 未替换 Mock 函数体，在 M2.6 hotfix 中修复 |
| 12 个业务端点 | 13 个路由（含 `GET /` 健康检查） | 额外增加了健康检查端点 |
| 无集成测试 | `test_all_endpoints.py`（40 项测试） | M2.6 hotfix 中新增，覆盖全部 13 个路由的正常和异常路径 |
| `app.py` 中 MOCK 数据已清除 | MOCK_COURSES/MOCK_SCHEDULE/MOCK_REVIEWS/MOCK_RECOMMENDATIONS 常量仍保留 | reviews/recommend 端点仍为 Mock，待 M3 替换后可清除。schedule 端点已不再使用这些 Mock 数据 |

---

## 风险应对预案

| 风险 | 概率 | 应对 |
|---|---|---|
| 第 8 小时 M2 未完成 | 中 | 砍掉 slot 冲突检测，先做"选课成功/失败"的简单版本（仅检查 UNIQUE + 容量），冲突检测降级为 P1 |
| SQLAlchemy ORM 关系配置卡住 | 高 | 退回 raw SQL（`db.execute(text("SELECT ..."))`），放弃 ORM 关系，用多次简单查询代替 JOIN |
| JWT 认证调不通 | 中 | 临时改为"固定 token + 硬编码用户"的假认证，先让选课流程跑起来 |
| Person A 或 B 其中一人严重卡住 | 低 | 停止并行，切换为 Pair Programming，两人一起解决阻塞问题 |
| 部署失败 | 低 | 退回本地演示（`uvicorn` + ngrok 暴露公网），5 分钟备选方案 |
| 重构时破坏已有功能 | 中 | 重构前先跑冒烟测试，每移动一个文件就跑一次测试，**绝不批量重构** |
