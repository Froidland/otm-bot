import { Tournament, Tryout } from "@prisma/client";
import {
	ChatInputCommandInteraction,
	GuildMemberRoleManager,
} from "discord.js";

export function isUserTournamentStaff(
	interaction: ChatInputCommandInteraction,
	tournament: Tournament,
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tournament.staff_role_id,
	);
}

export function isUserTournamentReferee(
	interaction: ChatInputCommandInteraction,
	tournament: Tournament,
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tournament.referee_role_id,
	);
}

export function isUserTryoutReferee(
	interaction: ChatInputCommandInteraction,
	tryout: Tryout,
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tryout.referee_role_id,
	);
}

export function isUserTryoutAdmin(
	interaction: ChatInputCommandInteraction,
	tryout: Tryout,
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tryout.admin_role_id,
	);
}
