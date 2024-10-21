import { Telegraf } from "telegraf";
import { PrismaClient } from "@prisma/client";

const bot = new Telegraf(process.env.BOT_TOKEN);
const prisma = new PrismaClient();

bot.start(async (ctx) => {
  const from = ctx.update.message.from;

  try {
    await prisma.userSchema.upsert({
      where: {
        tgId: from.id,
      },
      update: {
        firstName: from.first_name,
        lastName: from.last_name,
        isBot: from.is_bot,
        username: from.username,
      },
      create: {
        tgId: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        isBot: from.is_bot,
        username: from.username,
      },
    });
    await ctx.reply(
      `Hey ${from.first_name}, Welcome I will be writing social media post for you. Just keep feeding me with the context throught out the day.Let's shine on social media.`
    );
  } catch (error) {
    console.log(error);
    await ctx.reply("Facing problem right now!");
  } finally {
    await prisma.$disconnect();
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
