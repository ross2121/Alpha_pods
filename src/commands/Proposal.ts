import { Markup, Scenes, session, Telegraf } from "telegraf";
import { admin_middleware } from "../middleware/admin";
export const proposals = new Map<string, {
    mint: string;
    amount: number;
    yes: number;
    no: number;
}>();
interface MyWizardSession extends Scenes.WizardSessionData {
    state: {
        mint: string;
        amount: number; 
    };
}
export interface MyContext extends Scenes.WizardContext<MyWizardSession> {}
export const proposeWizard = new Scenes.WizardScene<MyContext>(
    'propose_wizard',
    async (ctx) => {
        await ctx.reply('Please enter the mint you want to swap:');
        return ctx.wizard.next(); 
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Invalid input. Please send the mint address as text.');
            return; 
        }
        (ctx.wizard.state as MyWizardSession['state']).mint = ctx.message.text;
        await ctx.reply('Great. Now, enter the minimum swap amount in SOL:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Invalid input. Please send the amount as text.');
            return; 
        }
        const amount = parseFloat(ctx.message.text);
        const mint = (ctx.wizard.state as MyWizardSession['state']).mint; 
        if (!mint || isNaN(amount) || amount <= 0) {
            await ctx.reply('That is not a valid amount. Please enter a positive number (e.g., 1.5).');
            return;
        }
        (ctx.wizard.state as MyWizardSession['state']).amount = amount;
        proposals.set(mint, {
            mint: mint,
            amount: amount,
            yes: 0,
            no: 0
        });
        const voteKeyboard = Markup.inlineKeyboard([
            Markup.button.callback(`👍 Yes (0)`, `vote:yes:${mint}`),
            Markup.button.callback(`👎 No (0)`, `vote:no:${mint}`)
        ]);
        await ctx.reply(
            `New Proposal! 🗳️\n\n` +
            `**Mint:** \`${mint}\`\n` +
            `**Minimum Amount:** \`${amount} SOL\`\n\n` +
            `Should we proceed with this swap?`,
            {
                ...voteKeyboard,
                parse_mode: 'Markdown'
            }
        );

        return ctx.scene.leave();
    }
);
const bot = new Telegraf<MyContext>(process.env.TELEGRAM_API || "");
const stage = new Scenes.Stage<MyContext>([proposeWizard]);

bot.use(session());
bot.use(stage.middleware());

bot.command("propose", admin_middleware, async (ctx) => {
     await ctx.scene.enter('propose_wizard');
});
const proposevotes=new Map<number,{vote:Vote}>();
bot.action(/vote:(yes|no):(.+)/, async (ctx) => {
    const action = ctx.match[1]; 
    const mint = ctx.match[2];  
    const userId = ctx.from.id;
    const proposal = proposals.get(mint);
    if (!proposal) {
        return ctx.answerCbQuery('This proposal is no longer valid.');
    }
    if (action === 'yes') {
        const vote=proposevotes.get(userId);
        if(vote && vote.vote === Vote.Yes){
            return ctx.answerCbQuery('You have already voted Yes!');
        }
        else if(vote && vote.vote==Vote.NO){
            vote.vote=Vote.NO;
            proposal.yes--;
            proposal.no++;
        }
        proposevotes.set(userId,{vote:Vote.Yes});
        proposal.yes++;
    } else {
        const vote=proposevotes.get(userId);
        if(vote && vote.vote==Vote.NO){
            return;
        }
        else if(vote && vote.vote==Vote.Yes){
            vote.vote=Vote.Yes;
            proposal.no--;
            proposal.yes++;
        }
        proposevotes.set(userId,{vote:Vote.NO});
        proposal.no++;
    }
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
});
enum Vote{
    Yes,
    NO
}
