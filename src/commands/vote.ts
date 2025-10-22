import { Markup } from "telegraf";
import { proposals } from "./Proposal";

export enum Vote {
    Yes,
    NO
}

export const proposevotes = new Map<number, {vote: Vote}>();

export const handleVote = async (ctx: any) => {
    const action = ctx.match[1]; 
    const mint = ctx.match[2];  
    const userId = ctx.from.id;
    const proposal = proposals.get(mint);
    
    if (!proposal) {
        return ctx.answerCbQuery('This proposal is no longer valid.');
    }
    
    const newvote = (action === 'yes') ? Vote.Yes : Vote.NO;
    const existingVote = proposevotes.get(userId);
    
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
        proposal.yes++;
    } else {
        proposal.no++;
    }
    
    proposevotes.set(userId, {vote: newvote});
    
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