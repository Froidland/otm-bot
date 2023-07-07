import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({
	name: "oauth-requests",
})
export class OAuthRequest {
	@PrimaryGeneratedColumn({
		type: "bigint",
	})
	id: number;

	@Column("varchar")
	discordId: string;

	@Column("varchar")
	state: string;

	@Column("bigint")
	expiryMillis: number;

	@Column("varchar")
	messageId: string;

	@Column("boolean", {
		default: false,
	})
	authenticated: boolean;

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
