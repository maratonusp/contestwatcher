# Telegram Bot
If you want to test the telegram bot, you need a token. You can get one from @BotFather. Avoid good bot names, use something like @yourname\_ContestWatcherBot. After getting your token, export it to the environment variable `TELEGRAM_TOKEN`.

# Adding Online Judges
The function `updateUpcoming` exported by `judge/index.js` should update every online judge. Create another file inside the `judge/` directory and call it from there. The fetched contest list should be ordered by time. The function `updateMerge` removes the old entries from the upcoming list and adds the new ones keeping the input order.

# Next Features
- Enable/Disable some judges per chat via bot
- Better Alarms
