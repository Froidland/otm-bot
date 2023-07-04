import { EmbedBuilder } from "discord.js";

export const NoAccountEmbed = new EmbedBuilder()
	.setColor("Red")
	.setTitle("Invalid Date!")
	.setDescription(
		"The schedule you provided is invalid. Please use the following format: `YYYY-MM-DD HH:MM`"
	).data;
