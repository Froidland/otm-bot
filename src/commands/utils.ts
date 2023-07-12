import { ChatInputCommandInteraction, PermissionsBitField } from "discord.js";

export async function isMemberAdmin(interaction: ChatInputCommandInteraction) {
	if (!interaction.member) {
		return false;
	}

	return (interaction.member.permissions as Readonly<PermissionsBitField>).has(
		"Administrator"
	);
}
