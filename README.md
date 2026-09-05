# OpsAnalytics PWA

Готова фронтенд-основа для закритого PWA-застосунку управлінської аналітики.

## Що вже є

- обов'язкова авторизація через Firebase Authentication;
- перевірка ролі через `users/{uid}`;
- темний адаптивний UI для desktop / tablet / mobile;
- нижня логічна структура розділів: Огляд, Процеси, Працівники, Звіти, Налаштування;
- KPI-картки;
- заготовки графіків;
- таблиці процесів;
- рейтинг працівників;
- фільтри та вибір місяця;
- PWA manifest + service worker;
- окремий Firebase/Firestore repository layer;
- Firestore Security Rules з role-based access;
- Firestore indexes для майбутніх запитів;
- структура, яку можна розширювати новими процесами без переписування UI.

## Важливо перед запуском

1. Створіть Firebase Web App.
2. Увімкніть Firebase Authentication → Email/Password.
3. Створіть Firestore Database.
4. Скопіюйте Web App config у `src/firebase-config.js`.
5. Опублікуйте `firestore.rules`.
6. Створіть документи користувачів у `users/{uid}`.

Приклад `users/{uid}`:

```json
{
  "name": "Ім'я Прізвище",
  "role": "director",
  "active": true
}
```

Доступні ролі у стартовій версії:
- `admin`
- `director`
- `manager`
- `analyst`

`viewer` зарезервований у UI, але навмисно не допускається в поточний dashboard guard, доки не буде визначено його права.

## Рекомендована модель Firestore

### users/{uid}
```text
name
role
active
managerId
departmentIds[]
createdAt
```

### employees/{employeeId}
```text
name
active
processIds[]
managerId
departmentId
```

### processes/{processId}
```text
name
code
active
sortOrder
managerIds[]
metricKeys[]
```

### analyticsMonthly/{YYYY-MM}
Агрегований snapshot для головної сторінки:
```text
processed
completed
efficiency
avgTime
byProcess
byManager
trend[]
updatedAt
```

### processMetrics/{autoId}
```text
processId
period
managerId
processed
completed
efficiency
avgTime
sla
errorRate
trend[]
```

### employeeMetrics/{autoId}
```text
employeeId
period
managerId
processId
processed
completed
efficiency
avgTime
qualityScore
```

## Чому аналітику краще зберігати агреговано

Не варто будувати весь dashboard шляхом читання тисяч сирих операцій за місяць. Для швидкого dashboard краще мати сирі події/операції окремо та щомісячні агрегати окремо. Тоді головна сторінка читає невелику кількість документів, а деталізація відкриває потрібний рівень.

Для міграції з Realtime Database можна окремо зробити ETL/migration script, який:
1. читає стару RTDB;
2. нормалізує записи;
3. додає стабільні IDs;
4. записує сирі дані у Firestore;
5. будує місячні агрегати;
6. перевіряє кількість записів до/після.

## Запуск локально

Це звичайний static PWA без обов'язкового build step.

```bash
python3 -m http.server 8080
```

Потім відкрийте:
`http://localhost:8080`

Для GitHub Pages структура вже підходить.

## Наступний етап

Після того як буде відома фактична структура RTDB, repository layer можна під'єднати до реальних даних без переробки основного UI. Наступний логічний модуль: migration script + точна Firestore schema + агрегатор по місяцю/працівнику/керівнику + реальні графіки.
