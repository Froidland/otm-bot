import { TryoutLobbyStatus } from "@prisma/client";

export const Regexes = {
	matchId:
		/^(?:(?:https?:\/\/)?(?:osu.ppy.sh\/)(?:community\/matches\/|mp\/))?(\d+)$/,
} as const;

export const LobbyStatusEmoji: Record<TryoutLobbyStatus, string> = {
	Pending: ":yellow_circle:",
	Failed: ":red_circle:",
	Skipped: ":yellow_circle:",
	Ongoing: ":blue_circle:",
	Override: ":purple_circle:",
	Completed: ":green_circle:",
};
