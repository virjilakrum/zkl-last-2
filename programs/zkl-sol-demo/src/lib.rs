use anchor_lang::prelude::*;

declare_id!("DAPVX77x4nA6AoqZpMLeYzfaYZCrBkDyoQuatmn6yn1c");

#[program]
pub mod zkl_last_2 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn create_user_account(ctx: Context<CreateUserAccount>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.username = *ctx.accounts.user.key;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(init, payer = user, space = 8 + 32)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserAccount {
    pub username: Pubkey,
}
