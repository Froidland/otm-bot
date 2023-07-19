import db from "@/db";
import { Tournament } from "@prisma/client";
import {
	ChatInputCommandInteraction,
	GuildMemberRoleManager,
	PermissionsBitField,
} from "discord.js";

export async function isMemberAdmin(interaction: ChatInputCommandInteraction) {
	if (!interaction.member) {
		return false;
	}

	return (interaction.member.permissions as Readonly<PermissionsBitField>).has(
		"Administrator"
	);
}

export async function isUserTournamentStaff(
	interaction: ChatInputCommandInteraction,
	tournament: Tournament
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tournament.staffRoleId
	);
}

export async function isUserTournamentReferee(
	interaction: ChatInputCommandInteraction,
	tournament: Tournament
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tournament.refereeRoleId
	);
}

export async function getUser(interaction: ChatInputCommandInteraction) {
	return await db.user.findFirst({
		where: {
			discordId: interaction.user.id,
		},
	});
}
