import { EmbedBuilder } from "discord.js";

export const NoStaffRole = new EmbedBuilder()
	.setColor("Red")
	.setTitle("Invalid permission!")
	.setDescription(
		"You need this tournament's staff role to execute this command."
	).data;
