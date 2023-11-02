import { Tournament, Tryout } from "@prisma/client";
import { GuildMemberRoleManager, Interaction } from "discord.js";

export function hasTournamentStaffRole(
	interaction: Interaction,
	tournament: Tournament,
) {
	if (!interaction.member) {
		return false;
	}

	return (interaction.member.roles as GuildMemberRoleManager).cache.has(
		tournament.staff_role_id,
	);
}

export function hasTournamentMappoolerRole(
	interaction: Interaction,
	tournament: Tournament,
) {
	if (!interaction.member) {
		return false;
	}

	return (interaction.member.roles as GuildMemberRoleManager).cache.has(
		tournament.mappooler_role_id,
	);
}

export function hasTournamentRefereeRole(
	interaction: Interaction,
	tournament: Tournament,
) {
	if (!interaction.member) {
		return false;
	}

	return (interaction.member.roles as GuildMemberRoleManager).cache.has(
		tournament.referee_role_id,
	);
}

export function hasTryoutRefereeRole(interaction: Interaction, tryout: Tryout) {
	if (!interaction.member) {
		return false;
	}

	return (interaction.member.roles as GuildMemberRoleManager).cache.has(
		tryout.referee_role_id,
	);
}

export function hasTryoutAdminRole(interaction: Interaction, tryout: Tryout) {
	if (!interaction.member) {
		return false;
	}

	return (interaction.member.roles as GuildMemberRoleManager).cache.has(
		tryout.admin_role_id,
	);
}
