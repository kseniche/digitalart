# Аудит обработки ошибок (frontend)

## Проблема

Одна и та же ошибка API показывалась пользователю **2–3 раза**:

1. Глобальный notifier в `apiFetch` → toast через `ToastContext`
2. Локальный `toast.error()` в компоненте
3. Иногда ещё `<Alert>` через `setError()` с тем же текстом

Axios и отдельные interceptors **не используются** — только `fetch` + `apiFetch`.

## Решение (без ломки системы уведомлений)

### 1. Разделение каналов

| Сценарий | Канал |
|----------|--------|
| Запрос без локальной обработки | `apiFetch` → глобальный toast |
| Форма / страница с `<Alert>` | `apiFetchLocal` + только `setError` |
| Быстрое действие (лайк, админ-кнопка) | `apiFetchLocal` + только `toast` |
| Успех | `toast.success` как раньше |

`apiFetchLocal` = `apiFetch` с `skipErrorNotify: true`.

### 2. Дедупликация toast

В `ToastContext` одинаковое сообщение того же типа не добавляется повторно в течение **900 ms** (защита от гонок и двойных вызовов).

### 3. Изменённые области

- **Auth** (`AuthContext`, модалки логина/регистрации, forgot/reset password) — локальные ошибки, без глобального toast
- **Лента** (`HomePage`) — ошибка загрузки только в `Alert`
- **Публикации** (`CreatePost`, `PostDetail`, `EditPostModal`)
- **Профиль / настройки** (`Profile`, `Settings`)
- **Админ-панель** — список: `Alert`; действия: toast
- **Вспомогательные** (`CountryAutocomplete`, `CommentReportModal`)

### 4. Правило для нового кода

```javascript
// Есть свой toast или Alert — импорт:
import { apiFetchLocal as apiFetch } from '../api';

// Нет обработки ошибок в компоненте — обычный apiFetch (глобальный toast).
import { apiFetch } from '../api';
```

Не вызывать `toast.error` и `setError` с **одним и тем же** текстом для одного сбоя.

## Backend

Laravel возвращает JSON с `message` (и `errors` при 422). Глобальный notifier использует `data.message` при наличии. Дублирование было только на клиенте.
