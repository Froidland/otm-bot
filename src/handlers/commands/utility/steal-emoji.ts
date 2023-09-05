import {
	CommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";

export const stealEmoji: Command = {
	data: new SlashCommandBuilder()
		.setName("steal-emoji")
		.setDescription(
			"Fetches an emoji from another server and adds it to the one where the command was executed."
		)
		.addStringOption((option) =>
			option
				.setName("emoji")
				.setDescription("Emoji to steal.")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription("Name of the emoji.")
				.setMinLength(2)
				.setRequired(false)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
		.setDMPermission(false),
	execute: async (interaction: CommandInteraction) => {
		await interaction.deferReply();

		const emoji = interaction.options.get("emoji", true).value as string;

		const emojiName = interaction.options.get("name")?.value as
			| string
			| undefined;

		// Regex for matching custom discord emoji
		// First capture group is for animated emojis (whether it has an "a" in front of it or not)
		// Second capture group is for the emoji name (2-32 characters long)
		// Third capture group is for the emoji id (17-19 characters long)
		const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
		const match = emoji.match(emojiRegex);

		if (!match) {
			await interaction.editReply("Invalid emoji.");
			return;
		}

		const [, animated, name, id] = match;
		const url = `https://cdn.discordapp.com/emojis/${id}.${
			animated ? "gif" : "png"
		}`;

		const emojiResponse = await fetch(url);

		if (!emojiResponse.ok) {
			await interaction.editReply("Failed to fetch emoji.");
			return;
		}

		const emojiAttachment = Buffer.from(await emojiResponse.arrayBuffer());

		// Non-null because the command is guild-only.
		const createdEmoji = await interaction.guild!.emojis.create({
			name: emojiName || name,
			attachment: emojiAttachment,
		});

		await interaction.editReply(`Added emoji ${createdEmoji}`);
	},
};