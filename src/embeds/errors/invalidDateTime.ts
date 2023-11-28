import { EmbedBuilder } from "discord.js";

export const InvalidDateTime = new EmbedBuilder()
	.setColor("Red")
	.setTitle("Invalid date!")
	.setDescription(
		"One or more of the dates you provided is invalid. Please use the format `YYYY-MM-DD HH:MM`.",
	).data;

export const InvalidDate = new EmbedBuilder()
	.setColor("Red")
	.setTitle("Invalid date!")
	.setDescription(
		"One or more of the dates you provided is invalid. Please use the format `YYYY-MM-DD`.",
	).data;
