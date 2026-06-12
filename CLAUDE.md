# Support MCP Server — CLAUDE.md

## ⛔ ГЛОБАЛЬНЫЕ ПРАВИЛА (подробности → /srv/CLAUDE.md)
> **#0 Ошибки первым делом** — проверить ошибки ПЕРЕД любой задачей + `bash /root/.claude/hooks/guardian-check.sh`
> **#1 Автоклассификация** — вопрос / любое изменение=architect-first / крупное=волны (категорий "мелкий"/"средний" НЕТ) + чеклисты до и после кода
> **#2 Auto-Skills** — hook подсказал Skill → вызвать Skill tool (security, perf, pipeline, qa...)
> **TOOL USAGE** — MCP (docker, postgres, redis, playwright, context7) вместо Bash
> **Самоочистка** — удалять temp файлы после задачи
> **Размер файлов** — Backend: 400 | Frontend: 350 | CSS: 250 строк
> **Новый сервис** → `/master-architect` обязательно

## Назначение
MCP (Model Context Protocol) сервер для TehProf Support.
Позволяет любому AI-клиенту (Claude, GPT, Gemini) управлять системой поддержки через стандартный протокол.

## Stack
- **Runtime**: Node.js 20 + TypeScript strict
- **SDK**: `@modelcontextprotocol/sdk` v1.12+
- **Transport**: Streamable HTTP (MCP spec 2025-03-26)
- **Port**: 8101 (127.0.0.1)
- **Systemd**: `support-mcp.service`

## Структура
```
mcp-server/
├── src/
│   ├── index.ts              # HTTP server + MCP transport
│   ├── auth.ts               # API key validation
│   ├── types.ts              # TypeScript types + tier logic
│   ├── tool-registry.ts      # Tool registration + tier gating
│   ├── support-client.ts     # HTTP client → PHP backend
│   └── tools/
│       ├── free/             # Free tier tools
│       │   ├── knowledge.ts  # knowledge_search/read/list
│       │   ├── onboarding.ts # onboarding_guide/features
│       │   ├── demo.ts       # demo_create_ticket/view/workflow
│       │   ├── pricing.ts    # pricing_plans/calculate
│       │   └── system.ts     # system_health/info/tenant_info
│       ├── paid/             # Paid tier tools
│       │   ├── tickets.ts    # tickets_list/get/create/reply/update
│       │   ├── analytics.ts  # analytics_dashboard/sla/operators
│       │   ├── settings.ts   # settings_get/update/operators
│       │   ├── channels.ts   # channels_list/status/configure
│       │   └── automation.ts # automation_rules + webhooks
│       └── bitrix/
│           └── proxy.ts      # bitrix_contacts/deals/tasks/users
├── dist/                     # Compiled JS
├── package.json
└── tsconfig.json
```

## PHP Backend Endpoints
- `app/api/mcp-auth.php` — валидация API ключей (nginx-localhost-only)
- `app/api/mcp-internal.php` — MCP/OpenAPI bridge; Bearer API key обязателен для tenant-data, tenant_id сверяется с ключом

## Bitrix Trigger Concurrency

### Короткая формулировка

**Неидемпотентное конкурентное срабатывание Bitrix-триггеров до согласования состояния.**

### Пометка для агента

Перед применением этой заметки проверь, есть ли в текущем контуре Bitrix-вызовы, запускающие триггеры с побочными эффектами. Если контур релевантен — добавь правило в конкретный архитектурный/рабочий контур и реализуй guard/idempotency/lock/settle там. Если контур не работает с такими Bitrix-триггерами — не дублируй это описание и удали его как нерелевантный шум.

### Что это значит

Bitrix event/trigger chain нельзя считать атомарным или linearizable. Параллельные PHP-запросы могут независимо запустить один и тот же набор обработчиков, пока состояние от предыдущего обработчика ещё не стало видимым или согласованным для остальных.

Это не только OpenLines и не только обработка сообщений. Любой Bitrix-модульный триггер с побочным эффектом может попасть в такой сценарий: создание сущности, привязка сущности, старт сессии, добавление поля, запуск робота, CRM-связка.

Типичный симптом: несколько обработчиков одновременно читают старое состояние как "сущности/привязки ещё нет" и каждый выполняет свой побочный эффект. В результате появляются дубли чатов, CRM-сущностей, привязок или других Bitrix-объектов.

### Почему это происходит

В коробочном Bitrix `Event::send()` передаёт событие в `EventManager::send()`, а тот находит зарегистрированные handlers и вызывает их. На этом уровне нет общей защиты от параллельных PHP-запросов: нет глобального idempotency gate, single-flight lock или ожидания уже начатого побочного эффекта.

То есть Bitrix dispatch сам по себе не гарантирует, что два близких запроса не выполнят один и тот же создающий/связывающий сценарий.

### Практическое правило для адаптеров

Для Bitrix-вызовов, которые запускают триггеры с побочными эффектами, нужна защита на стороне адаптера:

- idempotency key по внешнему событию или бизнес-идентичности;
- Redis/DB lock по ключу сущности, например `portal + line + phone`;
- короткий settle period после первого успешного Bitrix-вызова, чтобы Bitrix успел согласовать внутреннее состояние;
- кэш стабильного результата Bitrix, если метод возвращает `CHAT_ID`, `SESSION_ID`, CRM id или другую привязку;
- ретраи должны ждать lock/settle, а не сразу повторять тот же создающий REST-вызов.

### Пример

`imconnector.send.messages` может выглядеть как один coarse-grained REST-вызов, но внутри Bitrix он запускает цепочку поиска/создания пользователя, чата, сессии, CRM-связок и сообщений. Если несколько первых сообщений одного `phone + line + connector` приходят почти одновременно, без внешнего guard Bitrix может создать несколько IMOL-привязок для одной бизнес-сущности.

Правильная защита не в том, чтобы считать конкретный метод "upsert". Правильная защита в том, чтобы считать Bitrix-триггеры с побочными эффектами потенциально неидемпотентными при конкуренции.

## Тарифная модель
| Тариф | Доступные tools |
|-------|----------------|
| free | knowledge.*, onboarding.*, demo.*, pricing.*, system.*, settings_get, settings_update, settings_operators |
| starter | + tickets_list/get, analytics_dashboard, channels_list/status |
| pro | + tickets_create/reply/update, analytics_sla/operators, automation.*, webhooks_list |
| business | + bitrix.*, channels_configure |
| enterprise | Всё |

## Deploy
```bash
# Rebuild
cd /srv/apps/support/mcp-server && npm run build && systemctl restart support-mcp

# Статус
systemctl status support-mcp

# Логи
journalctl -u support-mcp -f
```

## Endpoints
- `https://support.tehprof.kz/mcp` — MCP endpoint
- `https://support.tehprof.kz/.well-known/mcp.json` — Server card (discovery)
- `https://support.tehprof.kz/mcp/health` — Health check

## Auth
- Anonymous: доступ к free-tier tools
- Bearer API key: доступ по тарифу тенанта
- API ключи создаются в admin панели → Settings → API Keys
- Внутренний PHP bridge дополнительно валидирует тот же Bearer key; прямой no-auth доступ к `mcp-internal.php` должен возвращать 401, tenant mismatch — 403.
