import { EmbedBuilder } from "discord.js";

export const OsuLinkEmbed = (authUrl: string) =>
	new EmbedBuilder()
		.setColor("Blue")
		.setTitle("osu! authentication")
		.setDescription(`[Click here to authenticate with osu!](${authUrl})`)
		.data;
