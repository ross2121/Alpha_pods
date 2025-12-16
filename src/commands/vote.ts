import { PrismaClient } from "@prisma/client";
import { Context, Markup } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
export enum Vote {
    Yes,
    NO
}
export const proposevotes = new Map<string, {vote: Vote}>();

export const handleVote = async (ctx: Context<Update.CallbackQueryUpdate> & { match: RegExpExecArray })=> {
    const action = ctx.match[1]; 
    const mint = ctx.match[2];  
    const userId = ctx.from.id;
    const prisma=new PrismaClient();
   console.log("message id",ctx.callbackQuery.message?.chat.id!);
   console.log("chat id",ctx.callbackQuery.message?.message_id!);
    const proposal = await prisma.proposal.findUnique({
        where: {
            chatId_messagId: {
                chatId: BigInt(ctx.callbackQuery.message?.chat.id!),
                messagId: BigInt(ctx.callbackQuery.message?.message_id!)
            }
        }
    })
    const member=proposal?.Members;
    if(!member){
        return;
    }
    if (!proposal) {
        return ctx.answerCbQuery('This proposal is no longer valid.');
    }
    const newvote = (action === 'yes') ? Vote.Yes  : Vote.NO;

    const voteKey = `${userId}_${ctx.callbackQuery.message?.chat.id}_${ctx.callbackQuery.message?.message_id}`;
    const existingVote = proposevotes.get(voteKey);
    if (existingVote && existingVote.vote === newvote) {
        return ctx.answerCbQuery(`You have already voted ${action === 'yes' ? 'Yes' : 'No'}!`);
    }
    
    if (existingVote) {
        if (existingVote.vote === Vote.Yes) {
            proposal.yes--;
        } else {
            proposal.no--;
        }
    }
    
    if (newvote === Vote.Yes) {
        member.push(userId.toString())
        proposal.yes++;
    } else {
        proposal.no++;
    }
    
    proposevotes.set(voteKey, {vote: newvote});
    await prisma.proposal.update({
        where: {
            chatId_messagId: {
                chatId: BigInt(ctx.callbackQuery.message?.chat.id!),
                messagId: BigInt(ctx.callbackQuery.message?.message_id!)
            }
        },
        data: {
            yes: proposal.yes,
            no: proposal.no,
            Members: member
        }
    });
    
    const newKeyboard = Markup.inlineKeyboard([
        Markup.button.callback(`👍 Yes (${proposal.yes})`, `vote:yes:${mint}`),
        Markup.button.callback(`👎 No (${proposal.no})`, `vote:no:${mint}`)
    ]);

    try {
        await ctx.editMessageText(
            `New Proposal! 🗳️\n\n` +
            `**Mint:** \`${proposal.mint}\`\n` +
            `**Minimum Amount:** \`${proposal.amount} SOL\`\n\n` +
            `Should we proceed with this swap?`,
            {
                ...newKeyboard,
                parse_mode: 'Markdown'
            }
        );
        await ctx.answerCbQuery('Vote counted!');
    } catch (e) {
        console.error("Failed to edit message:", e);
        await ctx.answerCbQuery('Vote counted (message not updated).');
    }
};