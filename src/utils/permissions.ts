import { Tournament, Tryout } from "@prisma/client";
import { GuildMemberRoleManager, Interaction } from "discord.js";

export function isUserTournamentStaff(
	interaction: Interaction,
	tournament: Tournament,
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tournament.staff_role_id,
	);
}

export function isUserTournamentReferee(
	interaction: Interaction,
	tournament: Tournament,
) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tournament.referee_role_id,
	);
}

export function isUserTryoutReferee(interaction: Interaction, tryout: Tryout) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tryout.referee_role_id,
	);
}

export function isUserTryoutAdmin(interaction: Interaction, tryout: Tryout) {
	return (interaction.member!.roles as GuildMemberRoleManager).cache.has(
		tryout.admin_role_id,
	);
}
