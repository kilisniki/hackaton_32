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
1. Удаление игроков
2. Создание игроков
3. Обновление игроков
4. CRUD пуль
5. CRUD shelters

Экран баттлграунда

Красивости:
1. бекграунд логина
2. бекграунд лидерборда + баттла
3. спрайты
4. текстуры

стрельба
🌕натягивание сокетные события на игру
отрисовка WorldState
вычисление разницы
натянуть игровые события на отправку событий до сервака
переход по комнатам

генерация ассетов:
звук
анимации - https://kaboomjs.com/play?example=spriteatlas
добавить
лидерборд

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
