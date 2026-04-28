import { Telegraf, Context } from 'telegraf';
import { User } from './models/User';

const BOT_TOKEN = process.env.BOT_TOKEN || 'dummy-token';

export const bot = new Telegraf(BOT_TOKEN);
bot.botInfo = { id: 0, is_bot: true, first_name: 'Bot', username: 'bot', can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false
  
};

// const userState = new Map<number, { step: string; data: any }>();
const ADMIN_ID = process.env.BOT_ADMIN ? Number(process.env.BOT_ADMIN) : null;

/* /start */
bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const payload = ctx.message.text.split(' ')[1]; 

  let user = await User.findOne({ telegramId });

  if (payload) {
    try {
      const existingUser = await User.findById(payload);
      if (!existingUser) {
        await ctx.reply('Пользователь не найден. Попробуй ещё раз через сайт.');
        return;
      }

      if (existingUser.telegramId) {
        if (existingUser.telegramId === telegramId) {
          await ctx.reply('Этот аккаунт уже привязан к твоему Telegram.');
        } else {
          await ctx.reply('Этот аккаунт уже привязан к другому Telegram.');
        }
        return;
      }

      if (user) {
        await ctx.reply('Твой Telegram уже привязан к другому аккаунту.');
        return;
      }

      existingUser.telegramId = telegramId;
      await existingUser.save();
      await ctx.reply(`Аккаунт успешно привязан! Привет, ${existingUser.name}. Теперь присылай свой вес.`);
      return;
    } catch (err) {
      console.error('Ошибка привязки telegram:', err);
      await ctx.reply('Произошла ошибка при привязке аккаунта.');
      return;
    }
  }

  if (user) {
    await ctx.reply(`Привет, ${user.name}! Присылай свой вес.`);
    return;
  }

  await ctx.reply('Привет! Зарегистрируйся на сайте и привяжи аккаунт.');
});

/* Приём веса */
async function addWeight(ctx: Context, user: any) {
  const message = ctx.message as any;
  if (!message?.text) return;

  const text = message.text.trim();
  const regex = /^(?:(\d{2}\.\d{2}\.\d{2})\s+)?(\d+(?:[.,]\d+)?)\s*(.*)?$/;
  const match = text.match(regex);

  if (!match) {
    await ctx.reply('Неверный формат. Пример: [12.06.26] 66.5 [комментарий]');
    return;
  }

  let date: Date;
  if (match[1]) {
    const [day, month, year] = match[1].split('.');
    date = new Date(`20${year}-${month}-${day}`);
  } else {
    date = new Date();
    date.setHours(12, 0, 0, 0);
  }

  const weight = Number(match[2].replace(',', '.'));
  if (Number.isNaN(weight)) {
    await ctx.reply('Не удалось распознать вес');
    return;
  }

  // const comment = match[3]?.trim() || '';
  const userUrl = `${process.env.BASE_URL || 'https://liner.esho.uz'}/user/${user._id}`;

  await ctx.reply(
    `Вес сохранён: ${weight} кг\n<a href="${userUrl}">ваша страница</a>`,
    { parse_mode: 'HTML' }
  );

  if (ADMIN_ID) {
    await ctx.telegram.sendMessage(
      ADMIN_ID,
      `🧿 ${user.name} : ${weight} кг\n<a href="${userUrl}">ваша страница</a>`,
      { parse_mode: 'HTML' }
    );
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);


}

/* Текстовые сообщения */
bot.on('message', async (ctx) => {
  const telegramId = ctx.from.id;

  const user = await User.findOne({ telegramId });
  if (!user) {
    await ctx.reply('Сначала привяжи аккаунт через сайт.');
    return;
  }

  await addWeight(ctx, user);
});

/* Напоминания */
export async function doReminder() {
  try {
    const dNow = new Date();
    dNow.setHours(12, 0, 0, 0);

    const usersToRemind = await User.find({
      telegramId: { $exists: true },
      $or: [
        { 'last_data.date': { $lt: dNow } },
        { 'last_data.date': { $exists: false } },
        { last_data: { $exists: false } }
      ]
    });

    for (const user of usersToRemind) {
      if (!user.telegramId) continue;
      try {
        await bot.telegram.sendMessage(user.telegramId, 'Прошу ввести ваши данные');
      } catch (err) {
        console.error(`Ошибка напоминания для ${user.name}:`, err);
      }
      await new Promise(r => setTimeout(r, 50));
    }
  } catch (err) {
    console.error('Ошибка в doReminder:', err);
  }
}