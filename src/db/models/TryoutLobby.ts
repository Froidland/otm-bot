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
import { Tryout } from "./Tryout";

@Entity({
	name: "tryout-lobbies",
})
export class TryoutLobby {
	@PrimaryColumn({
		type: "varchar",
	})
	id: string;

	@Column("varchar")
	customId: string;

	@Column("timestamp")
	startDate: Date;

	@OneToMany(() => User, (user) => user.discordId)
	players: User[];

	@Column("int")
	playerLimit: number;

	@ManyToOne(() => Tryout, (stage) => stage.id)
	tryout: Tryout;

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}