import { EmbedBuilder } from "discord.js";

export const NoAccountEmbed = new EmbedBuilder()
	.setColor("Red")
	.setTitle("Invalid account!")
	.setDescription(
		"You don't have an account. Please use the `/link` command to link your osu! account."
	).data;
