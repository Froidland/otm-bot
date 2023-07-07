import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import { createId } from "@paralleldrive/cuid2";
import { OsuLinkEmbed } from "@/embeds";
import db from "@/db";
import { DateTime } from "luxon";

export const link: Command = {
	data: new SlashCommandBuilder()
		.setName("link")
		.setDescription("Links your osu! profile to your discord account."),
	execute: async (interaction: ChatInputCommandInteraction) => {
		const message = await interaction.deferReply({ ephemeral: true });
		const state = createId();
		const expiryMillis = DateTime.now().plus({ minutes: 3 }).toMillis();

		// TODO: Depending on how annoying it is to set this up in the frontend, I might want to update the message there.
		setTimeout(async () => {
			const request = await db.oAuthRequests.findOne({
				where: {
					state,
					messageId: message.id,
				},
			});

			if (!request) {
				return;
			}

			if (!request.authenticated) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Authentication timed out.")
							.setDescription(
								"Your authentication request has timed out. Please try again."
							),
					],
				});

				return;
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Authentication successful.")
						.setDescription(
							"Your osu! account has been successfully linked to your discord account."
						),
				],
			});
		}, 1000 * 60 * 3);

		const searchParams = new URLSearchParams({
			client_id: process.env.OSU_CLIENT_ID!,
			redirect_uri: process.env.OSU_REDIRECT_URI!,
			response_type: "code",
			scope: "identify",
			state: state,
		});

		console.log(message.id);

		await db.oAuthRequests.insert({
			discordId: interaction.user.id,
			state,
			expiryMillis,
			messageId: message.id,
		});

		await interaction.editReply({
			embeds: [
				OsuLinkEmbed(
					`https://osu.ppy.sh/oauth/authorize?${searchParams.toString()}`
				),
			],
		});
	},
};
