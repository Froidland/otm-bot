import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { createId } from "@paralleldrive/cuid2";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { EmbedBuilder, ModalSubmitInteraction } from "discord.js";

const timezoneRegex = /^UTC(?:\+|-)(?:\d){1,2}$/;

export class JoinOneVsOneTournamentModalSubmitHandler extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "joinOneVsOneTournamentModalSubmit",
			interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
		});
	}

	public override parse(interaction: ModalSubmitInteraction) {
		if (interaction.customId !== "joinOneVsOneTournamentModal") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ModalSubmitInteraction) {
		await interaction.deferReply({ ephemeral: true });

		//! Technically, this should never happen, but hey, what do you know.
		if (!interaction.channelId) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Unexpected error")
						.setDescription(
							"Unable to find channel id. Please try again later or contact a staff member.",
						),
				],
			});

			return;
		}

		if (!interaction.guild) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Unexpected error")
						.setDescription(
							"Unable to find guild. Please try again later or contact a staff member.",
						),
				],
			});

			return;
		}

		if (!interaction.member) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Unexpected error")
						.setDescription(
							"Unable to find member. Please try again later or contact a staff member.",
						),
				],
			});

			return;
		}

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const tournament = await db.tournament.findFirst({
			where: {
				embed_channel_id: interaction.channelId,
			},
			include: {
				teams: {
					where: {
						OR: [
							{
								players: {
									some: {
										user_id: user.id,
									},
								},
							},
							{
								creator: {
									id: user.id,
								},
							},
						],
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Expired")
						.setDescription(
							"This tournament does not exist or has been deleted.",
						),
				],
			});

			return;
		}

		if (tournament.teams.length > 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already registered")
						.setDescription("You are already in this tournament."),
				],
			});

			return;
		}

		const id = createId();

		const inputs = [];
		for (const component of interaction.components) {
			inputs.push(...component.components);
		}

		const timezone = inputs.find((i) => i.customId === "timezoneInput");

		if (!timezone) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Unexpected error")
						.setDescription(
							"Unable to find timezone input. Please try again later or contact a staff member.",
						),
				],
			});

			return;
		}

		const icon = `https://a.ppy.sh/${user.osu_id}`;

		if (!timezoneRegex.test(timezone.value)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Timezone")
						.setDescription(
							"Please provide a valid timezone. A valid timezone is in the format of `UTC+/-<number>`.",
						),
				],
			});

			return;
		}

		try {
			await db.team.create({
				data: {
					id,
					creator_id: user.id,
					name: user.osu_username,
					timezone: timezone.value,
					icon_url: icon,
					tournament_id: tournament.id,
					players: {
						create: {
							user_id: user.id,
						},
					},
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while trying to join this tournament. Please try again later or contact a staff member.",
						),
				],
			});

			return;
		}

		try {
			const member = await interaction.guild.members.fetch(interaction.user.id);

			await member.roles.add(tournament.player_role_id);
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while trying to join this tournament. Please try again later or contact a staff member.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						"You have successfully joined this tournament. Please wait for the tournament to start.",
					)
					.setThumbnail(icon)
					.setFooter({
						text: `Unique ID: ${id}`,
					}),
			],
		});
	}
}
