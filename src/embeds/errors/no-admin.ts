import { EmbedBuilder } from "discord.js";

export const NoAdminEmbed = new EmbedBuilder()
	.setColor("Red")
	.setTitle("Invalid Permissions!")
	.setDescription("Only server administrators can use this command.").data;
