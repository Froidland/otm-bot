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
const urlRegex =
	/[(http(s)?)://(www.)?a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

export class JoinTeamVsTeamTournamentModalSubmitHandler extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "joinTeamVsTeamTournamentModalSubmit",
			interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
		});
	}

	public override parse(interaction: ModalSubmitInteraction) {
		if (interaction.customId !== "joinTeamVsTeamTournamentModal") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ModalSubmitInteraction) {
		await interaction.deferReply({
			ephemeral: true,
		});

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
								creator: {
									discord_id: interaction.user.id,
								},
							},
							{
								players: {
									some: {
										player: {
											discord_id: interaction.user.id,
										},
									},
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
							"This embed has expired. Please try with a different one or contact a staff member.",
						),
				],
			});

			return;
		}

		//? If the user is already in a team, then they can't join another one.
		if (tournament.teams.length > 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already registered")
						.setDescription(
							"You are already in a team for this tournament. Please leave your current team before joining or creating another one.",
						),
				],
			});

			return;
		}

		const inputs = [];
		for (const component of interaction.components) {
			inputs.push(...component.components);
		}

		const id = createId();
		const teamName = inputs.find((i) => i.customId === "teamNameInput")!.value;
		const teamIcon =
			inputs.find((i) => i.customId === "teamIconInput")?.value || null;
		const teamTimezone = inputs.find(
			(i) => i.customId === "teamTimezoneInput",
		)!.value;

		if (!timezoneRegex.test(teamTimezone)) {
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

		if (teamIcon && !urlRegex.test(teamIcon)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Icon URL")
						.setDescription("Please provide a valid URL for your team icon."),
				],
			});

			return;
		}

		let embedDescription = "**__Info:__**\n";
		embedDescription += `**Name:** \`${teamName}\`\n`;
		embedDescription += `**Creator:** <@${interaction.user.id}> (\`${user.osu_username}\` - \`#${user.osu_id}\`)\n`;
		embedDescription += `**Icon:** ${
			teamIcon ? "[Link](" + teamIcon + ")" : "None"
		}\n`;
		embedDescription += `**Timezone:** \`${teamTimezone}\`\n\n`;

		embedDescription +=
			"If you wish to invite more players to your team, use the `/team invite` command in the player's channel.";

		try {
			await db.team.create({
				data: {
					id,
					name: teamName,
					icon_url: teamIcon,
					timezone: teamTimezone,
					creator_id: user.id,
					players: {
						create: {
							user_id: user.id,
						},
					},
					tournament_id: tournament.id,
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
							"An error occurred while creating your team. Please try again later or contact a staff member.",
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
							"An error occurred while giving you the player role for this tournament. Please contact a staff member.",
						),
				],
			});
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Team created")
					.setDescription(embedDescription)
					.setThumbnail(teamIcon)
					.setFooter({
						text: `Unique ID: ${id}`,
					}),
			],
		});
	}
}
