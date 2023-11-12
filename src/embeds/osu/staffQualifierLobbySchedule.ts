import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageCreateOptions,
} from "discord.js";
import { DateTime } from "luxon";

type EmbedData = {
	id: string;
	teamName: string;
	schedule: DateTime;
	refereeId: string | null;
	reschedule: boolean;
};

const claimLobbyButton = new ButtonBuilder()
	.setCustomId("claimQualifiersLobbyButton")
	.setLabel("Claim lobby")
	.setStyle(ButtonStyle.Primary);

const unclaimLobbyButton = new ButtonBuilder()
	.setCustomId("unclaimQualifiersLobbyButton")
	.setLabel("Unclaim lobby")
	.setStyle(ButtonStyle.Danger);

const autoRefLobbyButton = new ButtonBuilder()
	.setCustomId("autoRefQualifiersLobbyButton")
	.setLabel("Toggle auto ref")
	.setStyle(ButtonStyle.Secondary);

const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	claimLobbyButton,
	unclaimLobbyButton,
	autoRefLobbyButton,
);

export const staffQualifierLobbyScheduleEmbed = (
	data: EmbedData,
): MessageCreateOptions => {
	return {
		content: data.refereeId ? `<@${data.refereeId}>` : undefined,
		embeds: [
			new EmbedBuilder()
				.setColor("Blue")
				.setTitle(
					`Qualifier lobby ${data.reschedule ? "rescheduled" : "scheduled"}.`,
				)
				.setDescription(
					`${data.reschedule ? "The" : "A"} qualifier lobby for team \`${
						data.teamName
					}\` has been ${
						data.reschedule ? "rescheduled" : "scheduled"
					} for \`${data.schedule.toFormat("DDDD T")}\`.${
						data.reschedule && data.refereeId
							? " Please unclaim the lobby if you can't make it."
							: ""
					}`,
				)
				.setFooter({
					text: `Unique ID: ${data.id}`,
				}),
		],
		components: [actionRow],
		nonce: "1",
	};
};
