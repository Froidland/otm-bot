import { EmbedBuilder } from "discord.js";

export const NoAccountEmbed = new EmbedBuilder()
	.setColor("Red")
	.setTitle("Invalid account!")
	.setDescription(
		`You don't have an account. Please sign in with your osu! account [here](${process.env.FRONTEND_URL}${process.env.FRONTEND_LOGIN_ROUTE}) in order to link your Discord account to your osu! account.`,
	).data;
