import { Telegraf } from "telegraf";
import { PrismaClient } from "@prisma/client";
import { message } from "telegraf/filters";
import OpenAI from "openai";
import { TwitterApi } from "twitter-api-v2";

const twitterClient = new TwitterApi({
  appKey: process.env.API_KEY,
  appSecret: process.env.API_SECRET_KEY,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
  // clientId: process.env.ACCESS_CLIENT_ID,
  // clientSecret: process.env.ACCESS_CLIENT_SECRET,
});
const bot = new Telegraf(process.env.BOT_TOKEN);
const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
let postOne = "";
let postTwo = "";

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

bot.command("generate", async (ctx) => {
  const from = ctx.update.message.from;

  const { message_id: waitingID } = await ctx.reply(
    `Hey ${from.first_name}, kindly wait for moment.🚀`
  );

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfTheDay = new Date();
  endOfTheDay.setHours(23, 59, 59, 999);

  const posts = await prisma.post.findMany({
    where: {
      authorId: from.id,
      createdAt: {
        gte: startOfDay,
        lte: endOfTheDay,
      },
    },
  });

  if (posts.length === 0) {
    await ctx.deleteMessage(waitingID);
    await ctx.reply("No events for the day");
    return;
  }

  // console.log("Posts created within the day:", posts);

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content:
            "Act as senior copywriter, you write highly enanging post for twitter using provided thoughts/events throught the day.",
        },
        {
          role: "user",
          content: `Write like a human, for humans. Craft a engaging social media posts tailored for twitter. Use simple language. Use appropriate emoji if possible. 
          Use given time labels just to understand the order of events, don't mention the time in posts. Don't make grammer mistake. Each posts should collectively highlight the following events. Create Two Post only. 
          Ensure the tone is conversational and impactful. Focus on engaging the audience with post, encourage interaction, and driving interest in the events: ${posts
            .map((events) => events.text)
            .join(",")}`,
        },
      ],
      model: "llama3-8b-8192",
    });

    // console.log(chatCompletion);

    await prisma.userSchema.update({
      where: {
        tgId: from.id,
      },
      data: {
        promptTokens: chatCompletion.usage.prompt_tokens,
        completionTokens: chatCompletion.usage.completion_tokens,
      },
    });

    postOne = chatCompletion.choices[0].message.content
      .match(/\*\*Post 1\*\*\n([\s\S]*?)\n\*\*Post 2\*\*/)[1]
      .trim();
    postTwo = chatCompletion.choices[0].message.content
      .match(/\*\*Post 2\*\*\n([\s\S]*)/)[1]
      .trim();

    await ctx.deleteMessage(waitingID);
    if (postOne && postTwo) {
      await ctx.reply(
        `Here are two Twitter-sized posts:\n  1. ${postOne}  \n  2. ${postTwo}`
      );
      console.log(postOne, postTwo);
    } else {
      await ctx.reply("Couldn't generate");
    }
  } catch (error) {
    console.log(error);
    console.log("Facing difficulties");
  }
});

bot.command("post1", async (ctx) => {
  try {
    await twitterClient.v2.tweet(postOne);
    ctx.reply("Your tweet was posted successfully!");
  } catch (error) {
    console.error("Error posting tweet:", error);
    ctx.reply("Sorry, there was an error posting your tweet.");
  }
});

bot.command("post2", async (ctx) => {
  try {
    await twitterClient.v2.tweet(postTwo);
    ctx.reply("Your tweet was posted successfully!");
  } catch (error) {
    console.error("Error posting tweet:", error);
    ctx.reply("Sorry, there was an error posting your tweet.");
  }
});

bot.command("help", async (ctx) => {
  await ctx.reply("For support contact @rajat_sundriyal");
});

bot.hashtag("tweet", async (ctx) => {
  const message = ctx.update.message.text;
  try {
    await twitterClient.v2.tweet(message);
    ctx.reply("Your tweet was posted successfully!");
  } catch (error) {
    console.error("Error posting tweet:", error);
    ctx.reply("Sorry, there was an error posting your tweet.");
  }
});

bot.on(message("text"), async (ctx) => {
  const from = ctx.update.message.from;
  const message = ctx.update.message.text;

  try {
    await prisma.post.create({
      data: {
        text: message,
        author: {
          connect: {
            tgId: from.id,
          },
        },
      },
    });
    await ctx.reply(
      "Noted👍: Keep texting me your thoughts.To generate the posts, just enter the command: /generate"
    );
  } catch (error) {
    console.log(error);
    await ctx.reply("Facing difficulties, Please try again later");
  } finally {
    await prisma.$disconnect();
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
