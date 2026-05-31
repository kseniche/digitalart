# Навигация по тегам и категориям

## Как работает

- Клик по тегу или категории → клиентская навигация на `/` с фильтром.
- Тот же API `/api/feed`: параметры `tag`, `category` / `category_id`, `q` (без дублирования логики).
- URL синхронизируется с фильтрами: `/?tag=concept-art`, `/?category=digital-painting`, `/?q=...`
- Состояние фильтров в `FeedFiltersContext` сохраняется при переходе на публикацию; `getReturnState` включает `location.search`, кнопка «Назад» восстанавливает ленту с фильтром.

## Файлы

- `resources/js/utils/feedUrl.js` — slug категории, разбор/сбор URL
- `resources/js/hooks/useFeedUrlSync.js` — синхронизация URL ↔ фильтры на главной
- `resources/js/hooks/useFeedNavigation.js` — переход в ленту с тегом/категорией
- `resources/js/components/common/FeedTagLink.jsx`, `FeedCategoryLink.jsx`, `PostFeedMeta.jsx`

## Сброс

Кнопка «Сброс» на главной и снятие чипов активных фильтров очищают URL (`replace`).
