import { Tournament, Tryout } from "@prisma/client";
import {
	ChatInputCommandInteraction,
	GuildMemberRoleManager,
	PermissionsBitField,
} from "discord.js";

export function isMemberAdmin(interaction: ChatInputCommandInteraction) {
	if (!interaction.member) {
		return false;
	}

	return (interaction.member.permissions as Readonly<PermissionsBitField>).has(
		"Administrator"
	);
}

export function isUserTournamentStaff(
	interaction: ChatInputCommandInteraction,
	tournament: Tournament
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tournament.staffRoleId
	);
}

export function isUserTournamentReferee(
	interaction: ChatInputCommandInteraction,
	tournament: Tournament
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tournament.refereeRoleId
	);
}

export function isUserTryoutReferee(
	interaction: ChatInputCommandInteraction,
	tryout: Tryout
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tryout.refereeRoleId
	);
}
