import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageCreateOptions,
} from "discord.js";

const joinButton = new ButtonBuilder()
	.setCustomId("joinTryoutButton")
	.setLabel("Join")
	.setStyle(ButtonStyle.Success);

const leaveButton = new ButtonBuilder()
	.setCustomId("leaveTryoutButton")
	.setLabel("Leave")
	.setStyle(ButtonStyle.Danger);

const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	joinButton,
	leaveButton,
);

export const tryoutRegistration = (
	tryoutName: string,
): MessageCreateOptions => {
	return {
		embeds: [
			new EmbedBuilder()
				.setColor("Blue")
				.setTitle(`${tryoutName}`)
				.setDescription(
					"Click the buttons below to join or leave the tryout. Once you join a lobby for any stage, you will no longer be able to leave.",
				),
		],
		components: [actionRow],
	};
};
