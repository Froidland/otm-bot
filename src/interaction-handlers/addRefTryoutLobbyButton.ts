import { banchoLobbies } from "@/bancho/store";
import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { hasTryoutRefereeRole } from "@/utils";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { ButtonInteraction, EmbedBuilder } from "discord.js";

export class AddRefTryoutLobbyButtonHandler extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "addRefTryoutLobbyButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "addRefTryoutLobbyButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply({
			ephemeral: true,
		});

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

		const lobby = await db.tryoutLobby.findFirst({
			where: {
				staff_embed_message_id: interaction.message.id,
			},
			include: {
				stage: {
					include: {
						tryout: true,
					},
				},
			},
		});

		if (!lobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This lobby no longer exists or the embed is invalid.",
						),
				],
			});

			return;
		}

		if (!hasTryoutRefereeRole(interaction, lobby.stage.tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not a referee for this tryout."),
				],
			});

			return;
		}

		const ongoingLobby = banchoLobbies.find((l) => l.id === lobby.id);

		if (!ongoingLobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This lobby is no longer active."),
				],
			});

			return;
		}

		if (ongoingLobby.referees.some((r) => r.osuId === user.osu_id)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are already set as a referee for this lobby."),
				],
			});

			return;
		}

		const banchoChannel = this.container.bancho.getChannel(
			`#mp_${ongoingLobby.banchoId}}`,
		);
		ongoingLobby.referees.push({
			osuId: user.osu_id,
			osuUsername: user.osu_username,
			discordId: user.discord_id,
		});

		await banchoChannel.sendMessage(`!mp addref #${user.osu_id}`);

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription("You have been added as a referee for this lobby."),
			],
		});
	}
}
