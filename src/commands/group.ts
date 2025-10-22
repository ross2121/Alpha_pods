import { add_member, delete_member } from "./member_data";

export const handleMemberCount = async (ctx: any) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const count = await ctx.getChatMembersCount();
        ctx.reply(`This group has ${count} members.`);
    } else {
        ctx.reply('This command can only be used in a group.');
    }
};

export const handleMyInfo = async (ctx: any) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const userId = ctx.from.id;
        try {
            const member = await ctx.getChatMember(userId);
            const userInfo = `
                Your Info:
                - ID: ${member.user.id}
                - First Name: ${member.user.first_name}
                - Last Name: ${member.user.last_name || 'N/A'}
                - Username: @${member.user.username || 'N/A'}
                - Status: ${member.status}
            `;
            ctx.reply(userInfo);
        } catch (e) {
            console.error(e);
            ctx.reply('Could not fetch your information.');
        }
    } else {
        ctx.reply('This command must be used in a group.');
    }
};

export const handleMarket = async (ctx: any) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        ctx.reply(`DLMM Auto Copy Trade Setup Beta⚠️ Recommend to use with small amounts of SOL at first. This feature only works with DLMM pools.
📝 Instructions:
1. Add the wallet address you want to track and auto copy trade
2. Click on wallet names to enable/disable copy trading (✅ = enabled, 🔔 = disabled)
3. Use "Configure" button to set amount settings for each wallet
4. You can enable multiple wallets for copy trading simultaneously
5. You can have at max 5 wallets to track

⚠️ Make sure you have enough SOL in your wallet for copy trading

🔍 Active Filters:
• Min Market Cap: $500k
• Min Organic Score: 70%

Tracked Wallets:
No active copy trading wallets`);
    }
};

export const handleNewChatMembers = async (ctx: any) => {
    const newMembers = ctx.message.new_chat_members;
    console.log(newMembers);
    console.log("test");
    for (const member of newMembers) {
        if (!member.is_bot) {
            const userToSave = {
                id: member.id,
                firstName: member.first_name,
                lastName: member.last_name,
                username: member.username,
            };
            add_member(userToSave.id.toString(), userToSave.firstName, "user");
        }
    }
};

export const handleLeftChatMember = async (ctx: any) => {
    const member_delete = ctx.message.left_chat_member;
    delete_member(member_delete.id.toString());
};

export const handleMyChatMember = async (ctx: any) => {
    const member = ctx.myChatMember;
    console.log("admin");
    console.log("admin check");
    if (member.new_chat_member.status === "administrator" || member.new_chat_member.status === "creator") {
        console.log("check 2");
        const admins = await ctx.getChatAdministrators();
        console.log("admins", admins);
        for (const admin of admins) {
            if (admin.user.is_bot) {
                console.log("check4");
                continue;
            }
            await add_member(admin.user.id.toString(), admin.user.first_name, "admin");
        }
    }
};
