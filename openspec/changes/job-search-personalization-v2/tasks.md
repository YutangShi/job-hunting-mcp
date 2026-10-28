# Tasks

## 1. 個人資料與正規化模型

- [ ] 1.1 建立 request-scoped profile schema、秘密遮罩與欄位長度上限；以 unit tests 驗證空 profile、超長文字、token／Cookie 輸入及 log 不洩漏。
- [ ] 1.2 建立薪資正規化模型，分離 period、currency、區間、面議與 unknown；以 fixture tests 驗證月薪／年薪不混算與 insufficient sample。
- [ ] 1.3 建立 evidence／recommendation schema，要求每項建議附 job_ref、來源欄位或 `not_provided` 狀態；以 schema tests 驗證不得輸出錄取保證或敏感推論。

## 2. 匹配與薪資分析

- [ ] 2.1 實作 `match_jobs_to_profile` 規則式評分、權重版本、技能同義詞與 unknown 狀態；以 table-driven tests 驗證命中、缺口、偏好衝突及可解釋排序。
- [ ] 2.2 實作 `analyze_salary` 聚合與可比較性判斷；以 tests 驗證不同幣別／期間、面議、缺欄位與樣本不足。
- [ ] 2.3 將匹配與薪資 service 接入既有 job_ref 路由與 freshness／source error；以 integration tests 驗證不接受任意 URL、不使用過期未標示資料。

## 3. 申請準備工具

- [ ] 3.1 實作 `generate_resume_keywords`，輸出必要／加分關鍵字、證據缺口與來源依據；以 tests 驗證不捏造候選人技能。
- [ ] 3.2 實作 `generate_application_checklist`，輸出唯讀準備項目；以 tests 驗證投遞、登入、收藏與聯絡要求全部被拒絕。
- [ ] 3.3 實作 `prepare_interview_questions`，輸出明示需求題與推論題並標示依據；以 tests 驗證來源失敗時不使用未驗證內容。
- [ ] 3.4 加入輸出安全過濾與 prompt injection regression fixtures；以 tests 驗證職缺文字不能觸發工具或外部寫入。

## 4. MCP 整合與驗收

- [ ] 4.1 在 `src/server.ts` 註冊五個 V2 tools，確認工具說明、schema 與 V1 tools 相容；以 in-memory MCP test 列出全部工具並完成每個工具一次成功呼叫。
- [ ] 4.2 擴充 `tests/e2e/stdio.test.ts`，驗證建置後 stdio server 的工具清單、成功結果、validation error 與秘密不出現在 stderr／回應中。
- [ ] 4.3 執行 `npm run typecheck`、`npm test`、`npm run build`、`npm run test:e2e`，保存結果並確認 stdout 僅輸出 MCP 訊息。
- [ ] 4.4 更新 `README.md` 與 `README.en.md` 的工具表、資料隱私、限制、測試指令與雙語一致性，並以文件檢查腳本驗證五個 V2 tool 均有說明。
- [ ] 4.5 以 `openspec validate --change job-search-personalization-v2 --strict` 驗證規格，確認 V2 未新增帳號、儲存或投遞能力。
