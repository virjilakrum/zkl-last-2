use anchor_lang::prelude::*;
// use anchor_lang::solana_program::hash::{hash, Hash};

declare_id!("DAPVX77x4nA6AoqZpMLeYzfaYZCrBkDyoQuatmn6yn1c");

#[program]
pub mod zkl_last_2 {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn create_user_account(ctx: Context<CreateUserAccount>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.username = *ctx.accounts.user.key;
        user_account.received_files = Vec::new();
        Ok(())
    }

    pub fn send_file_hash(
        ctx: Context<SendFileHash>,
        file_hash: String,
        signed_hash: String,
    ) -> Result<()> {
        let sender = &ctx.accounts.sender;
        let recipient = &mut ctx.accounts.recipient;

        let file_info = FileInfo {
            hash: file_hash,
            signed_hash,
            sender: *sender.key,
            is_verified: false,
        };

        recipient.received_files.push(file_info);
        Ok(())
    }

    pub fn verify_file_hash(ctx: Context<VerifyFileHash>, file_hash: String) -> Result<()> {
        let recipient = &mut ctx.accounts.recipient;

        if let Some(file_info) = recipient
            .received_files
            .iter_mut()
            .find(|f| f.hash == file_hash)
        {
            // In a real implementation, you would verify the MAC here
            // For now, we'll just mark it as verified
            file_info.is_verified = true;
            Ok(())
        } else {
            Err(ProgramError::InvalidAccountData.into())
        }
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(init, payer = user, space = 8 + 32 + 200)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendFileHash<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(mut)]
    pub recipient: Account<'info, UserAccount>,
}

#[derive(Accounts)]
pub struct VerifyFileHash<'info> {
    #[account(mut)]
    pub recipient: Account<'info, UserAccount>,
}

#[account]
pub struct UserAccount {
    pub username: Pubkey,
    pub received_files: Vec<FileInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct FileInfo {
    pub hash: String,
    pub signed_hash: String,
    pub sender: Pubkey,
    pub is_verified: bool,
}
