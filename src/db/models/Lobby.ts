import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToMany,
	ManyToOne,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { Tournament } from "./Tournament";
import { Team } from "./Team";

const lobbyStatuses = ["Pending", "Ongoing", "Completed"] as const;
const lobbyStages = [
	"Groups",
	"RoundOf256",
	"RoundOf128",
	"RoundOf64",
	"RoundOf32",
	"RoundOf16",
	"Quarterfinals",
	"Semifinals",
	"Finals",
	"GrandFinals",
] as const;

export type LobbyStatus = (typeof lobbyStatuses)[number];
export type LobbyStage = (typeof lobbyStages)[number];

@Entity({
	name: "lobbies",
})
export class Lobby {
	@PrimaryColumn("varchar")
	id: string;

	@ManyToOne(() => Tournament, (tournament) => tournament.lobbies)
	tournament: Tournament;

	@Column("varchar")
	customId: string;

	@Column("timestamp")
	schedule: Date;

	@Column("enum", {
		default: "Pending",
		enum: lobbyStatuses,
	})
	status: LobbyStatus;

	@Column("enum", {
		enum: lobbyStages,
	})
	stage: LobbyStage;

	@Column("varchar")
	mpLink?: string;

	@ManyToMany(() => Team, (team) => team.joinedLobbies)
	teams: Team[];

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
