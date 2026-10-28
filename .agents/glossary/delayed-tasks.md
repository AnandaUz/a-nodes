## отложенныеЗадачи / отложенныЗадачи / Delayed Tasks

Механизм отложенного показа и повторения задач по расписанию или дням недели через класс `TRepeatMode`.

### Term Mapping

- **отложенныеЗадачи**: Ноды с активным `repeatMode` (`mode > 0` или `date != null`).
- **задержка/таймер**: `node.repeatMode.setDelay(days)` (установка даты и скрытие узла).
- **индикатор родителя**: `.el-list-btns .btn-repeats` (оранжевый индикатор в `VTextEdit`).
- **индикатор ноды**: `.el-indicators .ind-repeat` (оранжевая точка в `VNodeRepeatMode`).

### Code References

- **Logic**:
  - `nodes/LNode/TRepeatMode.ts` — `TRepeatMode` (`mode`, `date`, `setDelay`, `refreshIndicator`).
  - `nodes/LNode/LNode.ts` — композиция `node.repeatMode = new TRepeatMode(this)`.
  - `nodes/LNode/TList.ts` — предикат `hasRepeatChildren()` для родительских списков.
- **View / CSS**:
  - `nodes/VNode/VNodeRepeatMode.ts` — UI индикатора на самом узле (`showIndicator`, `hideIndicator`).
  - `nodes/VNode/VTextEdit.ts` — кнопка фильтра `.btn-repeats` и метод `toggleRepeatsOpen()`.
  - `nodes/VNode/vNode.scss` — стили `.btn-repeats` и `.ind-repeat` (hsl(32, 95%, 56%)).
- **DB / Manager**:
  - `shared/types/INodeDB.ts` — битовое поле `D` (`blockD: TPackedData` для `mode` 3 бита и `daysFromStartDay` 13 бит).
  - `shared/types/ILNode.ts` — интерфейс `IRepeatMode` (`mode`, `date`).
  - `nodes/NodeManager.ts` — проверка наступления даты (`date < now`) при гидрации.

### Lifecycle

1. **Назначение**: Пользователь задает задержку в днях (`setDelay`) или правило повтора по дням недели (`mode`).
2. **Сериализация**: Поле `D` упаковывает `mode` (3 бита) и смещение дней от опорной даты `2026-10-13` (13 бит).
3. **Скрытие и индикация**: Нода скрывается (`hiddenBD = true`, `hidden = true`), на ней включается `.ind-repeat`, а у родителя загорается кнопка `.btn-repeats`.
4. **Активация**: При наступлении даты `date < now` при загрузке страницы `NodeManager` сбрасывает `hiddenBD = false`, возвращая ноду в отображение.
5. **Фильтрация**: Клик по кнопке `.btn-repeats` у родителя временно принудительно раскрывает/скрывает отложенные задачи списка.
