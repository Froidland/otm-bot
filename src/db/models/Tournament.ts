import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Lobby } from "./Lobby";

@Entity({
	name: "tournaments",
})
export class Tournament {
	@PrimaryColumn({
		type: "varchar",
		nullable: false,
	})
	id: string;

	@Column("varchar")
	name: string;

	@Column("varchar")
	acronym: string;

	@Column("varchar")
	serverId: string;

	@Column("timestamp")
	startDate: Date;

	@Column("varchar")
	schedulesChannelId: string;

	@Column("varchar")
	refereeChannelId: string;

	@Column("varchar")
	refereeRoleId: string;

	@Column("varchar")
	staffChannelId: string;

	@Column("varchar")
	staffRoleId: string;

	@Column("varchar")
	playerRoleId: string;

	@ManyToOne(() => User, (user) => user.createdTournaments, {
		cascade: true,
	})
	creator: User;

	@Column("enum", {
		enum: ["Accuracy", "MissCount", "Score"],
	})
	winCondition: "Accuracy" | "MissCount" | "Score";

	@Column("enum", {
		enum: ["ScoreV1", "ScoreV2"],
	})
	scoring: "ScoreV1" | "ScoreV2";

	@Column("enum", {
		enum: ["BattleRoyale", "OneVsOne", "TeamBased"],
	})
	style: "BattleRoyale" | "OneVsOne" | "TeamBased";

	@Column("int", {})
	teamSize: number;

	@OneToMany(() => Lobby, (lobby) => lobby.tournament, {
		cascade: true,
	})
	lobbies: Lobby[];
}
