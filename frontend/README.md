# Folder structure

- `src` - source code for your kaboom project
- `www` - distribution folder, contains your index.html, built js bundle and static assets


## Development

```sh
$ npm run dev
```

will start a dev server at http://localhost:8000

## Distribution

```sh
$ npm run build
```

will build your js files into `www/main.js`

```sh
$ npm run bundle
```

will build your game and package into a .zip file, you can upload to your server or itch.io / newground etc.

Фронт

✅мир 2000 * 2000 пикселей
✅скейлим мир насколько это надо
✅сделать камеру (camera шаблон)
✅хранение пользователя
✅регистрация

✅Экран ввода никнейма - https://kaboomjs.com/play?example=text

✅ПЕРЕХОД между экранами - https://kaboomjs.com/play?example=rpg, https://kaboomjs.com/play?example=platformer

Экран лидерборда
✅1. подписи никнеймов
✅обновление лб
✅отправка местоположения
✅стрельба on click

состояние динамического игрового мира
worldState:
1. ✅Удаление игроков
2. ✅Создание игроков
3. ✅Обновление игроков
4. ✅CR
5. U пуль
6. ✅D пуль
5. CRUD shelters

✅Экран баттлграунда

✅ Экран смерти

✅стрельба
✅натягивание сокетные события на игру
✅отрисовка WorldState
✅вычисление разницы
✅натянуть игровые события на отправку событий до сервака
✅переход по комнатам

Прогрессия:
1. ✅player level = f(levelScore / 5)
2. ✅player texture = f(level)
3. ✅damage = f(level, gains)
4. bulletSpeed = f(level, gains)
5. ✅bulletCount = f (level, gains)
6. разбрасывать gains раз в N секунд

Деплой - тест
Переделать куки на session
Проверить все TODO

боты:
1. подключение
2. стрельба
3. уклонение от выстрелов
4. обход препятствий
5. подбор gains

Красивости:
1. подписи ников
2. ✅ подпись health
3. рандомизация генерации уровней - улучшенная, а не просто в тупую 
2. бекграунд (фон) логина
2. бекграунд лидерборда + баттла
3. наскальная инструкция что делать как двигаться
4. текстуры: 
   5. драконы,
   6. лб
   6. огонь,
   7. шелтеры,
   8. стены,
   9. gains
6. звук:
   7. мелодия общая
   8. мелодия баттлграунда
   9. мелодия завершения баттла
   10. мелодия поражения
   11. звук запуска снаряда
   12. звук попадания снаряда по игроку
7. анимации - https://kaboomjs.com/play?example=spriteatlas
   8. спрайты - для анимации
   9. полет дракона
   10. полет снаряда
   11. взрыв снаряда
   12. подбор gains

минимапа

# ТУДУ
Подключаемся
1. Проверяем куки, 
2. Если есть, то:
   1. отправляем регистрация guid-nickname
   2. переводим на левел скора
3. если нет куки, то:
4. Рисуем левел ввода никнейма
5. Генерируем guid, никнейм + часть хеша, чтобы не было коллизий с игроками
6. Отправляем 

Если срабатывает ошибка, то перезагружаем страницу!?
